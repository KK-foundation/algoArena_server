import { all } from "axios";
import { db } from "../database/db.js";
import {
  getLanguageName,
  pollBatchResults,
  submitBatch,
} from "../libs/rapidApiJudge0.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const XP_BY_DIFFICULTY = {
  EASY: 10,
  MEDIUM: 20,
  HARD: 50,
  CHALLENGE: 100,
};

const LEVELS = [
  { level: 1, requiredXP: 0, tier: "Bronze" },
  { level: 2, requiredXP: 50, tier: "Bronze" },
  { level: 3, requiredXP: 100, tier: "Bronze" },
  { level: 4, requiredXP: 150, tier: "Bronze" },
  { level: 5, requiredXP: 200, tier: "Bronze" },
  { level: 6, requiredXP: 400, tier: "Silver" },
  { level: 7, requiredXP: 600, tier: "Silver" },
  { level: 8, requiredXP: 850, tier: "Silver" },
  { level: 9, requiredXP: 1100, tier: "Silver" },
  { level: 10, requiredXP: 1500, tier: "Silver" },
  { level: 11, requiredXP: 1800, tier: "Gold" },
  { level: 12, requiredXP: 2100, tier: "Gold" },
  { level: 13, requiredXP: 2400, tier: "Gold" },
  { level: 14, requiredXP: 2700, tier: "Gold" },
  { level: 15, requiredXP: 3000, tier: "Gold" },
  { level: 16, requiredXP: 3300, tier: "Gold" },
  { level: 17, requiredXP: 3600, tier: "Gold" },
  { level: 18, requiredXP: 3900, tier: "Gold" },
  { level: 19, requiredXP: 4200, tier: "Gold" },
  { level: 20, requiredXP: 4500, tier: "Gold" },
  { level: 21, requiredXP: 5000, tier: "Platinum" },
  { level: 22, requiredXP: 5500, tier: "Platinum" },
  { level: 23, requiredXP: 6000, tier: "Platinum" },
  { level: 24, requiredXP: 6500, tier: "Platinum" },
  { level: 25, requiredXP: 7000, tier: "Platinum" },
  { level: 26, requiredXP: 7500, tier: "Platinum" },
  { level: 27, requiredXP: 8000, tier: "Platinum" },
  { level: 28, requiredXP: 8500, tier: "Platinum" },
  { level: 29, requiredXP: 9000, tier: "Platinum" },
  { level: 30, requiredXP: 9500, tier: "Platinum" },
  { level: 31, requiredXP: 10200, tier: "Diamond" },
  { level: 32, requiredXP: 10900, tier: "Diamond" },
  { level: 33, requiredXP: 11600, tier: "Diamond" },
  { level: 34, requiredXP: 12300, tier: "Diamond" },
  { level: 35, requiredXP: 13000, tier: "Diamond" },
  { level: 36, requiredXP: 13700, tier: "Diamond" },
  { level: 37, requiredXP: 14400, tier: "Diamond" },
  { level: 38, requiredXP: 15100, tier: "Diamond" },
  { level: 39, requiredXP: 15800, tier: "Diamond" },
  { level: 40, requiredXP: 16500, tier: "Diamond" },
  { level: 41, requiredXP: 17500, tier: "Master" },
  { level: 42, requiredXP: 18500, tier: "Master" },
  { level: 43, requiredXP: 19500, tier: "Master" },
  { level: 44, requiredXP: 20500, tier: "Master" },
  { level: 45, requiredXP: 21500, tier: "Master" },
  { level: 46, requiredXP: 22500, tier: "Master" },
  { level: 47, requiredXP: 23500, tier: "Master" },
  { level: 48, requiredXP: 24500, tier: "Master" },
  { level: 49, requiredXP: 25500, tier: "Master" },
  { level: 50, requiredXP: 26500, tier: "Grandmaster" },
];

export function getLevelAndTier(totalXP) {
  const { level, tier } =
    [...LEVELS].reverse().find((l) => totalXP >= l.requiredXP) ?? LEVELS[0];
  return { level, tier };
}

function awardBadges(user, meta) {
  try {
    console.log({ user });
    const badges = JSON.parse(user.badges || "[]");

    if (meta.solvedNow && !badges.includes("first_blood")) {
      badges.push("first_blood");
    }

    if (meta.solvedTime.getHours() === 0 && !badges.includes("night_owl")) {
      badges.push("night_owl");
    }

    if (user.currentStreak >= 7 && !badges.includes("consistency_king")) {
      badges.push("consistency_king");
    }

    return badges;
  } catch (error) {
    console.log(error);
    return [];
  }
}

// export const executeSubmit = asyncHandler(async (req, res) => {

//   const { source_code, language_id, problemId } = req.body;
//   const userId = req.user.id;

//   // fetch user + problem
//   const user = await db.user.findUnique({
//     where: {
//       id: userId,
//     },
//   });
//   const problem = await db.problem.findUnique({
//     where: {
//       id: problemId,
//     },
//   });
//   if (!problem) {
//     throw new ApiError(404, "Problem not found");
//   }

//   // prepare test cases
//   const privateInput = problem.privateTestcases.map((p) => p.input);
//   const publicInput = problem.publicTestcases.map((p) => p.input);

//   const privateOutput = problem.privateTestcases.map((p) => p.output);
//   const publicOutput = problem.publicTestcases.map((p) => p.output);

//   const stdin = [...privateInput, ...publicInput];
//   const expected_outputs = [...privateOutput, ...publicOutput];

//   if (
//     !Array.isArray(stdin) ||
//     stdin.length === 0 ||
//     !Array.isArray(expected_outputs) ||
//     expected_outputs.length !== stdin.length
//   ) {
//     throw new ApiError(400, "Invalid or Missing test cases");
//   }

//   // run code on judge0
//   const submissions = stdin.map((input) => ({
//     source_code,
//     language_id,
//     stdin: input,
//   }));
//   console.log(submissions); //{source_code,language_id,stdin}

//   const submitResponse = await submitBatch(submissions); // tokes array

//   const tokens = submitResponse.map((res) => res.token); // tokens join kar di

//   const results = await pollBatchResults(tokens); //

//   let allPassed = true;

//   const detailedResults = results.map((result, i) => {
//     const stdout = result.stdout?.trim();
//     const expected_output = expected_outputs[i]?.trim();
//     const passed = stdout === expected_output;

//     if (!passed) allPassed = false;

//     return {
//       testCase: i + 1,
//       passed,
//       stdout,
//       expected: expected_output,
//       stderr: result.stderr || null,
//       compile_output: result.compile_output || null,
//       status: result.status.description,
//       memory: result.memory ? `${result.memory} KB` : undefined,
//       time: result.time ? `${result.time} s` : undefined,
//     };
//   });

//   // save submission
//   const submission = await db.submission.create({
//     data: {
//       userId,
//       problemId,
//       sourceCode: source_code,
//       language: getLanguageName(language_id),
//       stdin: stdin.join("\n"),
//       stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
//       stderr: detailedResults.some((r) => r.stderr)
//         ? JSON.stringify(detailedResults.map((r) => r.stderr))
//         : null,
//       compileOutput: detailedResults.some((r) => r.compile_output)
//         ? JSON.stringify(detailedResults.map((r) => r.compile_output))
//         : null,
//       status: allPassed ? "Accepted" : "Wrong Answer",
//       memory: detailedResults.some((r) => r.memory)
//         ? JSON.stringify(detailedResults.map((r) => r.memory))
//         : null,
//       time: detailedResults.some((r) => r.time)
//         ? JSON.stringify(detailedResults.map((r) => r.time))
//         : null,
//     },
//   });

//   // Xp / tier / badge logic
//   const usedHint = user.hintsUsed?.includes(problemId);
//   const usedEditorial = user.editorialUsed?.includes(problemId);
//   const eligibleForXP = allPassed && !usedHint && !usedEditorial;

//   if (allPassed) {
//     await db.problemSolved.upsert({
//       where: {
//         userId_problemId: {
//           userId,
//           problemId,
//         },
//       },
//       update: {},
//       create: {
//         userId,
//         problemId,
//       },
//     });
//   }

//   if(eligibleForXP){
//     const gainedXP = XP_BY_DIFFICULTY[problem.difficulty];
//     const newXP = (parseInt(user.xp || "0") || 0) + gainedXP;
//     const {level,tier} = getLevelAndTier(newXP);
//     const newBadges = awardBadges(user, {
//       solvedNow: allPassed,
//       solvedTime: new Date(),
//     });

//     const potd = await db.potd.findFirst({

//     })

//     await db.user.update({
//       where: { id: userId },
//       data: {
//         xp: newXP,
//         level,
//         tier,
//         badges: JSON.stringify(newBadges),
//       },
//     });
//   }

//   const today = new Date();
//   const startOfToday = new Date(today.setHours(0, 0, 0, 0));
//   const endOfToday = new Date(today.setHours(23, 59, 59, 999));

//   const [existingGrid] = await Promise.all([
//     db.yearlyGrid.findFirst({
//       where: {
//         userId,
//         date: {
//           gte: startOfToday,
//           lte: endOfToday,
//         }
//       }
//     })
//   ]);

//   if(!existingGrid){
//     await db.yearlyGrid.create({
//       data: {
//         userId,
//         date: new Date(),
//       },
//     });
//   }

//   const yesterday = new Date(Date.now() - 86400000);
//   const startOfYesterday = new Date(yesterday.setHours(0, 0, 0, 0));
//   const endOfYesterday = new Date(yesterday.setHours(23, 59, 59, 999));

//   const yGrid = await db.yearlyGrid.findFirst({
//     where: { userId, date: { gte: startOfYesterday, lte: endOfYesterday } },
//   });

//  if (yGrid) {
//     await db.user.update({
//       where: { id: userId },
//       data: {
//         currentStreak: user.currentStreak + 1,
//         maxStreak:
//           user.currentStreak + 1 > user.maxStreak
//             ? user.currentStreak + 1
//             : user.maxStreak,
//       },
//     });
//   } else {
//     await db.user.update({
//       where: { id: userId },
//       data: { currentStreak: 1 },
//     });
//   }

//   const testCaseResults = detailedResults.map((result) => ({
//     submissionId: submission.id,
//     testCase: result.testCase,
//     passed: result.passed,
//     stdout: result.stdout,
//     expected: result.expected,
//     stderr: result.stderr,
//     compileOutput: result.compile_output,
//     status: result.status,
//     memory: result.memory,
//     time: result.time,
//   }));

//   await db.testCaseResult.createMany({
//     data: testCaseResults,
//   });

//   const submissionWithTestCase = await db.submission.findUnique({
//     where: {
//       id: submission.id,
//     },
//     include: {
//       testCases: true,
//     },
//   });

//   return res
//     .status(200)
//     .json(
//       new ApiResponse(200, submissionWithTestCase, "code executed successfully")
//     );
// });

export const executeSubmit = asyncHandler(async (req, res) => {
  const { source_code, language_id, problemId } = req.body;
  const userId = req.user.id;

  const [user, problem] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
    }),
    db.problem.findUnique({
      where: { id: problemId },
    }),
  ]);

  if (!user) {
    throw new ApiError(404, "User not found");
  }
  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  const todayPotdDate = new Date();
  todayPotdDate.setHours(0, 0, 0, 0);

  const potd = await db.potd.findFirst({
    where: {
      date: todayPotdDate,
    },
  });

  const privateInput = problem.privateTestcases.map((p) => p.input);
  const publicInput = problem.publicTestcases.map((p) => p.input);
  const privateOutput = problem.privateTestcases.map((p) => p.output);
  const publicOutput = problem.publicTestcases.map((p) => p.output);

  const stdin = [...privateInput, ...publicInput];
  const expected_outputs = [...privateOutput, ...publicOutput];

  if (
    !Array.isArray(stdin) ||
    stdin.length === 0 ||
    !Array.isArray(expected_outputs) ||
    expected_outputs.length !== stdin.length
  ) {
    throw new ApiError(400, "Invalid or Missing test cases");
  }

  const submissionsPayload = stdin.map((input) => ({
    source_code,
    language_id,
    stdin: input,
  }));

  const submitResponse = await submitBatch(submissionsPayload);
  const tokens = submitResponse.map((res) => res.token);
  const results = await pollBatchResults(tokens);

  let allPassed = true;
  const detailedResults = results.map((result, i) => {
    const stdout = result.stdout?.trim();
    const expected_output = expected_outputs[i]?.trim();
    const passed = stdout === expected_output;

    if (!passed) allPassed = false;

    return {
      testCase: i + 1,
      passed,
      stdout,
      expected: expected_output,
      stderr: result.stderr || null,
      compile_output: result.compile_output || null,
      status: result.status.description,
      memory: result.memory ? `${result.memory} KB` : undefined,
      time: result.time ? `${result.time} s` : undefined,
    };
  });

  const submission = await db.submission.create({
    data: {
      userId,
      problemId,
      sourceCode: source_code,
      language: getLanguageName(language_id),
      stdin: stdin.join("\n"),
      stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
      stderr: detailedResults.some((r) => r.stderr)
        ? JSON.stringify(detailedResults.map((r) => r.stderr))
        : null,
      compileOutput: detailedResults.some((r) => r.compile_output)
        ? JSON.stringify(detailedResults.map((r) => r.compile_output))
        : null,
      status: allPassed ? "Accepted" : "Wrong Answer",
      memory: detailedResults.some((r) => r.memory)
        ? JSON.stringify(detailedResults.map((r) => r.memory))
        : null,
      time: detailedResults.some((r) => r.time)
        ? JSON.stringify(detailedResults.map((r) => r.time))
        : null,
    },
  });

  if (allPassed) {
    await db.problemSolved.upsert({
      where: {
        userId_problemId: {
          userId,
          problemId,
        },
      },
      update: {},
      create: {
        userId,
        problemId,
      },
    });

    if (potd && potd.problemId === problemId) {
      const currentPotdRecord = await db.potd.findUnique({
        where: { id: potd.id },
        select: { solvedUsers: true },
      });

      if (
        currentPotdRecord &&
        !currentPotdRecord.solvedUsers.includes(userId)
      ) {
        await db.potd.update({
          where: { id: potd.id },
          data: {
            solvedUsers: [...(currentPotdRecord.solvedUsers || []), userId],
          },
        });
      }
    }

    const currentUserForXP = await db.user.findUnique({
      where: { id: userId },
    });

    const usedHint = currentUserForXP.hintsUsed?.includes(problemId);
    const usedEditorial = currentUserForXP.editorialUsed?.includes(problemId);
    const eligibleForXP = allPassed && !usedHint && !usedEditorial;

    if (eligibleForXP) {
      let gainedXP = XP_BY_DIFFICULTY[problem.difficulty] || 0;

      if (potd && potd.problemId === problemId) {
        gainedXP += 100; // Extra XP for solving POTD
      }

      const newXP = (parseInt(currentUserForXP.xp || "0") || 0) + gainedXP;
      const { level, tier } = getLevelAndTier(newXP);
      const newBadges = awardBadges(currentUserForXP, {
        solvedNow: true,
        solvedTime: new Date(),
      });

      await db.user.update({
        where: { id: userId },
        data: {
          xp: newXP,
          level,
          tier,
          badges: JSON.stringify(newBadges),
        },
      });
    }

    const todayForGrid = new Date();
    const startOfTodayGrid = new Date(
      todayForGrid.getFullYear(),
      todayForGrid.getMonth(),
      todayForGrid.getDate()
    );
    const endOfTodayGrid = new Date(
      todayForGrid.getFullYear(),
      todayForGrid.getMonth(),
      todayForGrid.getDate(),
      23,
      59,
      59,
      999
    );

    const existingGridEntry = await db.yearlyGrid.findFirst({
      where: {
        userId,
        date: {
          gte: startOfTodayGrid,
          lte: endOfTodayGrid,
        },
      },
    });

    if (!existingGridEntry) {
      await db.yearlyGrid.create({
        data: {
          userId,
          date: new Date(),
        },
      });

      const currentUserForStreak = await db.user.findUnique({
        where: { id: userId },
        select: { currentStreak: true, maxStreak: true },
      });

      const currentStreak = currentUserForStreak.currentStreak || 0;
      const maxStreak = currentUserForStreak.maxStreak || 0;

      const yesterdayForGrid = new Date();
      yesterdayForGrid.setDate(todayForGrid.getDate() - 1);
      const startOfYesterdayGrid = new Date(
        yesterdayForGrid.getFullYear(),
        yesterdayForGrid.getMonth(),
        yesterdayForGrid.getDate()
      );
      const endOfYesterdayGrid = new Date(
        yesterdayForGrid.getFullYear(),
        yesterdayForGrid.getMonth(),
        yesterdayForGrid.getDate(),
        23,
        59,
        59,
        999
      );

      const yesterdayGridEntry = await db.yearlyGrid.findFirst({
        where: {
          userId,
          date: {
            gte: startOfYesterdayGrid,
            lte: endOfYesterdayGrid,
          },
        },
      });

      let newCurrentStreak = 1;
      let newMaxStreak = maxStreak;

      if (yesterdayGridEntry) {
        newCurrentStreak = currentStreak + 1;
        newMaxStreak = Math.max(maxStreak, newCurrentStreak);
      } else {
        newCurrentStreak = 1; // Reset streak if no entry for yesterday;
        newMaxStreak = Math.max(maxStreak, newCurrentStreak);
      }

      await db.user.update({
        where: { id: userId },
        data: {
          currentStreak: newCurrentStreak,
          maxStreak: newMaxStreak,
        },
      });
    }
  }

  const testCaseResults = detailedResults.map((result) => ({
    submissionId: submission.id,
    testCase: result.testCase,
    passed: result.passed,
    stdout: result.stdout,
    expected: result.expected,
    stderr: result.stderr,
    compileOutput: result.compile_output,
    status: result.status,
    memory: result.memory,
    time: result.time,
  }));

  await db.testCaseResult.createMany({
    data: testCaseResults,
  });

  const submissionWithTestCase = await db.submission.findUnique({
    where: {
      id: submission.id,
    },
    include: {
      testCases: true,
    },
  });
  return res
    .status(200)
    .json(
      new ApiResponse(200, submissionWithTestCase, "Code executed successfully")
    );
});

export const executeRun = asyncHandler(async (req, res) => {
  const { source_code, language_id, problemId } = req.body;

  if (!source_code || !language_id || !problemId) {
    throw new ApiError(400, "Please provide all filed");
  }

  const userId = req.user.id;

  const problem = await db.problem.findUnique({
    where: {
      id: problemId,
    },
  });

  if (!problem) {
    throw new ApiError(404, "Problem not found");
  }

  const stdin = problem.publicTestcases.map((p) => p.input);
  const expected_outputs = problem.publicTestcases.map((p) => p.output);

  if (
    !Array.isArray(stdin) ||
    stdin.length === 0 ||
    !Array.isArray(expected_outputs) ||
    expected_outputs.length !== stdin.length
  ) {
    throw new ApiError(400, "Invalid or Missing test cases");
  }

  const submissions = stdin.map((input) => ({
    source_code,
    language_id,
    stdin: input,
  }));
  // console.log(submissions);

  const submitResponse = await submitBatch(submissions);
  // console.log(submitResponse)

  const tokens = submitResponse.map((res) => res.token);
  console.log(tokens);

  const results = await pollBatchResults(tokens);
  console.log(results);

  let allPassed = true;

  const detailedResults = results.map((result, i) => {
    const stdout = result.stdout?.trim();
    const expected_output = expected_outputs[i]?.trim();
    const passed = stdout === expected_output;

    if (!passed) allPassed = false;

    return {
      stdin: stdin[i],
      testCase: i + 1,
      passed,
      stdout,
      expected: expected_output,
      stderr: result.stderr || null,
      compile_output: result.compile_output || null,
      status: result.status.description,
      memory: result.memory ? `${result.memory} KB` : undefined,
      time: result.time ? `${result.time} s` : undefined,
    };
  });

  console.log(detailedResults);
  // const submission = await db.submission.create({
  //   data: {
  //     userId,
  //     problemId,
  //     sourceCode: source_code,
  //     language: getLanguageName(language_id),
  //     stdin: stdin.join("\n"),
  //     stdout: JSON.stringify(detailedResults.map((r) => r.stdout)),
  //     stderr: detailedResults.some((r) => r.stderr)
  //       ? JSON.stringify(detailedResults.map((r) => r.stderr))
  //       : null,
  //     compileOutput: detailedResults.some((r) => r.compile_output)
  //       ? JSON.stringify(detailedResults.map((r) => r.compile_output))
  //       : null,
  //     status: allPassed ? "Accepted" : "Wrong Answer",
  //     memory: detailedResults.some((r) => r.memory)
  //       ? JSON.stringify(detailedResults.map((r) => r.memory))
  //       : null,
  //     time: detailedResults.some((r) => r.time)
  //       ? JSON.stringify(detailedResults.map((r) => r.time))
  //       : null,
  //   },
  // });

  // if (allPassed) {
  //   await db.problemSolved.upsert({
  //     where: {
  //       userId_problemId: {
  //         userId,
  //         problemId,
  //       },
  //     },
  //     update: {},
  //     create: {
  //       userId,
  //       problemId,
  //     },
  //   });
  // }

  // const testCaseResults = detailedResults.map((result) => ({
  //   submissionId: submission.id,
  //   testCase: result.testCase,
  //   passed: result.passed,
  //   stdout: result.stdout,
  //   expected: result.expected,
  //   stderr: result.stderr,
  //   compileOutput: result.compile_output,
  //   status: result.status,
  //   memory: result.memory,
  //   time: result.time,
  // }));

  // await db.testCaseResult.createMany({
  //   data: testCaseResults,
  // });

  // const submissionWithTestCase = await db.submission.findUnique({
  //   where: {
  //     id: submission.id,
  //   },
  //   include: {
  //     testCases: true,
  //   },
  // });

  return res
    .status(200)
    .json(new ApiResponse(200, detailedResults, "code executed successfully"));
});
