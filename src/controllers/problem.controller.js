import { db } from "../database/db.js";
import {
  getJudge0LanguageId,
  pollBatchResults,
  submitBatch,
} from "../libs/rapidApiJudge0.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Controller to create a new problem
export const createProblem = asyncHandler(async (req, res) => {
  // going to get the all the data from the request
  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    testcases,
    codeSnippets,
    referenceSolutions,
    hints,
    editorial,
    companyTags: companyTagString,
  } = req.body;

  console.log(
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    testcases,
    codeSnippets,
    referenceSolutions,
    hints,
    editorial,
    companyTagString
  );

  try {
    // loop through each ref solution for different solution
    for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
      // get the language id from the language
      const languageId = getJudge0LanguageId(language);
      if (!languageId) {
        throw new ApiError(400, "language not supported");
      }

      // create an array of submissions
      const submissions = testcases.map(({ input, output }) => ({
        source_code: solutionCode,
        language_id: languageId,
        stdin: input,
        expected_output: output,
      }));
      console.log("submissions : ", submissions);
      // submit all submissions at once for one language
      const submissionsResults = await submitBatch(submissions);

      const tokens = submissionsResults.map((res) => res.token);

      const results = await pollBatchResults(tokens);
      // console.log("results : ", results);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status.id !== 3) {
          throw new ApiError(
            400,
            `Testcase ${i + 1} failed for language ${language}`
          );
        }
      }
    }
    // Get all public testcases
    const allPublic = testcases.filter((tc) => !tc.isPrivate);

    // Take first 3 public testcases
    const publicTestcases = allPublic.slice(0, 3);

    // Store remaining public testcases (after the first 3) + all private testcases
    const remainingPublic = allPublic.slice(3);
    const allPrivate = testcases.filter((tc) => tc.isPrivate);
    const privateTestcases = [...remainingPublic, ...allPrivate];

    const companyTagArray = companyTagString
      ? companyTagString
          .split(",")
          .map((tag) => tag.trim())
          .filter((tag) => tag.length > 0)
      : [];

    const newProblem = await db.problem.create({
      data: {
        title,
        description,
        difficulty: difficulty.toUpperCase(),
        tags,
        examples,
        constraints,
        privateTestcases: privateTestcases,
        publicTestcases: publicTestcases,
        codeSnippets,
        referenceSolutions,
        userId: req.user.id,
        companyTags: companyTagArray,
        hints: hints || [],
        editorial: editorial || "",
      },
    });

    const createdProblem = await db.problem.findUnique({
      where: {
        id: newProblem.id,
      },
      select: {
        id: true,
        title: true,
        description: true,
        difficulty: true,
        tags: true,
        examples: true,
        constraints: true,
        publicTestcases: true, // ✅ only include public
        codeSnippets: true,
        referenceSolutions: true,
        userId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res
      .status(201)
      .json(
        new ApiResponse(201, createdProblem, "Problem created successfully")
      );
  } catch (error) {
    throw new ApiError(400, error.message);
  }
});

// Controller to update an existing problem
export const updateProblem = asyncHandler(async (req, res) => {
  const { id } = req.params;
  // checking ownership of the problem
  const problem = await db.problem.findUnique({
    where: {
      id,
    },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  if (problem.userId !== req.user.id) {
    throw new ApiError(403, "Forbidden");
  }

  // get all data from the request
  const {
    title,
    description,
    difficulty,
    tags,
    examples,
    constraints,
    hints,
    editorial,
    testcases,
    codeSnippets,
    referenceSolutions, // this is important
  } = req.body;

  // judge0 check
  try {
    for (const [language, solutionCode] of Object.entries(referenceSolutions)) {
      const languageId = getJudge0LanguageId(language);

      if (!languageId) {
        throw new ApiError(400, "language not supported");
      }

      const submissions = testcases.map(({ input, output }) => ({
        source_code: solutionCode,
        language_id: languageId,
        stdin: input,
        expected_output: output,
      }));

      const submissionsResults = await submitBatch(submissions);

      const tokens = submissionsResults.map((res) => res.token);

      const results = await pollBatchResults(tokens);

      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result.status.id !== 3) {
          throw new ApiError(
            400,
            `Testcase ${i + 1} failed for language ${language}`
          );
        }
      }
    }
  } catch (error) {
    throw new ApiError(400, `Testcase failed for language ${language}`);
  }

  // Get all public testcases
  const allPublic = testcases.filter((tc) => !tc.isPrivate);

  // Take first 3 public testcases
  const publicTestcases = allPublic.slice(0, 3);

  // Store remaining public testcases (after the first 3) + all private testcases
  const remainingPublic = allPublic.slice(3);
  const allPrivate = testcases.filter((tc) => tc.isPrivate);
  const privateTestcases = [...remainingPublic, ...allPrivate];

  // update the problem
  const updatedProblem = await db.problem.update({
    where: {
      id,
    },
    data: {
      title: title || problem.title,
      description: description || problem.description,
      difficulty: difficulty || problem.difficulty,
      tags: tags || problem.tags,
      examples: examples || problem.examples,
      constraints: constraints || problem.constraints,
      hints: hints || problem.hints,
      editorial: editorial || problem.editorial,
      privateTestcases: privateTestcases || problem.privateTestcases,
      publicTestcases: publicTestcases || problem.publicTestcases,
      codeSnippets: codeSnippets || problem.codeSnippets,
      referenceSolutions: referenceSolutions || problem.referenceSolutions,
    },
  });

  if (!updatedProblem) {
    throw new ApiError(404, "Error while updating problem");
  }
  // return the updated problem
  return res
    .status(200)
    .json(new ApiResponse(200, updatedProblem, "Problem updated successfully"));
});

// Controller to delete a problem
export const deleteProblem = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const problem = await db.problem.findUnique({
    where: {
      id,
    },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  if (problem.userId !== req.user.id) {
    throw new ApiError(403, "Forbidden");
  }

  await db.problem.delete({
    where: {
      id,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Problem deleted successfully"));
});

// Controller to get all problems with pagination
export const getAllProblems = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1; // Default to page 1
  const limit = 20;
  const skip = (page - 1) * limit;
  const totalProblems = await db.problem.count();

  const problems = await db.problem.findMany({
    skip,
    take: limit,
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      userId: true,
      examples: true,
      constraints: true,
      hints: true,
      editorial: true,
      publicTestcases: true,
      codeSnippets: true,
      referenceSolutions: true,
      createdAt: true,
      updatedAt: true,
      user: true,
      submission: true,
      solvedBy: true,
      problemsSheets: true,
      companyTags: true
    },
  });

  if (!problems) {
    throw new ApiError(404, "No problems found");
  }

  const start = skip + 1;
  const end = Math.min(skip + limit, totalProblems);

  const problemsData = {
    problems,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalProblems / limit),
      totalProblems,
      start,
      end,
      message: `Showing ${start}-${end} of ${totalProblems} problems`,
    },
  };

  return res
    .status(200)
    .json(new ApiResponse(200, problemsData, "Problems fetched successfully"));
});

// Controller to get a specific problem by ID
export const getProblemById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const problem = await db.problem.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      userId: true,
      examples: true,
      constraints: true,
      hints: true,
      editorial: true,
      publicTestcases: true,
      codeSnippets: true,
      referenceSolutions: true,
      createdAt: true,
      updatedAt: true,
      user: true,
      submission: true,
      solvedBy: true,
      problemsSheets: true,
      companyTags: true
    },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, problem, "Problem fetched successfully"));
});

// Controller to get all problems solved by a user
export const getAllProblemsSolvedByUser = asyncHandler(async (req, res) => {
  const problems = await db.problem.findMany({
    where: {
      solvedBy: {
        some: {
          userId: req.user.id,
        },
      },
    },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      examples: true,
      constraints: true,
      publicTestcases: true, // ✅
      codeSnippets: true,
      referenceSolutions: true,
      userId: true,
      createdAt: true,
      updatedAt: true,
      solvedBy: {
        where: {
          userId: req.user.id,
        },
      },
      companyTags: true
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, problems, "Problems fetched successfully"));
});

// Controller to get all problems created by a user
export const getAllProblemsCreatedByUser = asyncHandler(async (req, res) => {
  const problems = await db.problem.findMany({
    where: {
      userId: req.user.id,
    },
    select: {
      id: true,
      title: true,
      description: true,
      difficulty: true,
      tags: true,
      userId: true,
      examples: true,
      constraints: true,
      hints: true,
      editorial: true,
      publicTestcases: true,
      codeSnippets: true,
      referenceSolutions: true,
      createdAt: true,
      updatedAt: true,
      user: true,
      submission: true,
      solvedBy: true,
      problemsSheets: true,
      companyTags: true
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, problems, "Problems fetched successfully"));
});

// Controller to get most solved 3 problems
export const getMostSolved3Problem = asyncHandler(async (req, res) => {
  const problems = await db.problem.findMany({
    orderBy: {
      solvedBy: {
        _count: "desc",
      },
    },
    take: 3,
    select: {
      id: true,
      title: true,
      difficulty: true,
      tags: true,
      solvedBy: {
        select: {
          userId: true,
        },
      },
    },
  });

  res
    .status(200)
    .json(new ApiResponse(200, problems, "Most solved problems fetched"));
});

// Controller to get all problems with company tags
export const getProblemsByCompanyChallenges = asyncHandler(async (req, res) => {
  const problems = await db.problem.findMany({
    select: {
      companyTags: true,
      solvedBy: true,
    },
  });

  if (!problems || problems.length === 0) {
    throw new ApiResponse(200, [], "No problems found");
  }

  const companyStats = {};

  problems.forEach((problem) => {
    const solveCount = problem.solvedBy.length || 0;

    problem.companyTags.forEach((tag) => {
      if (!companyStats[tag]) {
        companyStats[tag] = {
          totalProblems: 0,
          totalSolvedRate: 0,
        };
      }
      companyStats[tag].totalProblems += 1;
      companyStats[tag].totalSolvedRate += solveCount;
    });
  });

  const formattedData = Object.entries(companyStats).map(
    ([companyName, { totalProblems, totalSolveRate }]) => ({
      companyName,
      totalProblems,
      averageSolveRate: parseFloat((totalSolveRate / totalProblems).toFixed(2)),
    })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, formattedData, "Company problem stats fetched"));
});

// Controller to get all tags
export const getAllTags = asyncHandler(async (req, res) => {
  const problems = await db.problem.findMany({
    select: {
      tags: true,
    },
  });

  if (!problems || problems.length === 0) {
    return res.status(200).json(new ApiResponse(200, [], "No tags found"));
  }

  const tagCountMap = new Map();

  problems.forEach((problem) => {
    problem.tags.forEach((tag) => {
      tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1);
    });
  });

  const tagWithCount = Array.from(tagCountMap.entries()).map(
    ([tag, count]) => ({ tag, count })
  );

  return res
    .status(200)
    .json(new ApiResponse(200, tagWithCount, "Tags fetched successfully"));
});
export const getRandomProblem = asyncHandler(async (req, res) => {
  const problems = await db.problem.findMany();

  if (!problems || problems.length === 0) {
    return res.status(404).json({ message: "No problems found" });
  }

  const randomIndex = Math.floor(Math.random() * problems.length);
  const randomProblem = problems[randomIndex];
  console.log(randomIndex)
  console.log(randomProblem)

  return res
    .status(200)
    .json(new ApiResponse(200, randomProblem, "Fetched random problem"));
});