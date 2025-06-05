import { db } from "../database/db.js";
import { uploadOnCloudinary, destroyOnCloudinary } from "../libs/cloudinary.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const getAllUserProfiles = asyncHandler(async (req, res) => {
  const users = await db.user.findMany({
    take: 5,
    orderBy: {
      xp: "desc",
    },
    select: {
      id: true,
      name: true,
      username: true,
      xp: true,
      tier: true,
      level: true,
    },
  });

  if (!users || users.length === 0) {
    throw new ApiError(404, "No users found");
  }

  return res
    .status(200)
    .json(
      new ApiResponse(200, users, "All user profiles fetched successfully")
    );
});

export const getUserByUsername = asyncHandler(async (req, res) => {
  const { username } = req.body;

  if (!username) {
    throw new ApiError(
      400,
      "Username is required or user must be authenticated"
    );
  }

  const user = await db.user.findUnique({
    where: {
      username: username,
    },
    select: {
      id: true,
      name: true,
      username: true,
      image: true,
      role: true,
      localPassword: true,
      bio: true,
      currentStreak: true,
      maxStreak: true,
      lastSubmission: true,
      problems: {
        select: {
          id: true,
          title: true,
          difficulty: true,
          solvedBy: {
            select: {
              userId: true,
            },
          },
        },
      },
      submission: true,
      problemsSolved: true,
      sheets: true,
      links: true,
      yearlyGrid: true,
      achievements: true,
      badges: true,
      xp: true,
      tier: true,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, user, "User profile fetched successfully"));
});

export const uploadImage = asyncHandler(async (req, res) => {
  const imageLocalPath = req.file?.path;

  if (!imageLocalPath) {
    throw new ApiError(400, "Image file is missing");
  }

  const user = await db.user.findUnique({
    where: {
      id: req.user.id,
    },
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  if (user.image && user.image.startsWith("https")) {
    const publicId = user.image.split("/").pop().split(".")[0];
    try {
      await destroyOnCloudinary(publicId);
      const uploadedImage = await uploadOnCloudinary(imageLocalPath);
      const updateUser = await db.user.update({
        where: {
          id: user.id,
        },
        data: {
          image: uploadedImage,
        },
      });
    } catch (error) {
      throw new ApiError(500, "error deleting old avatar");
    }
  } else {
    const uploadedImage = await uploadOnCloudinary(imageLocalPath);
    if (!uploadedImage) {
      throw new ApiError(500, "Internal server error while uploading image");
    }
    const updateUser = await db.user.update({
      where: {
        id: user.id,
      },
      data: {
        image: uploadedImage,
      },
    });
  }
  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Image uploaded successfully"));
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { name, bio, username } = req.body;

  const userId = req.user.id;

  const existingUser = await db.user.findUnique({
    where: {
      id: userId,
    },
  });
  if (!existingUser) {
    throw new ApiError(404, "User not found");
  }

  const updateUser = await db.user.update({
    where: { id: userId },
    data: {
      name: name || existingUser.name,
      bio: bio || existingUser.bio,
      username: username || existingUser.username,
    },
  });

  return res
    .status(200)
    .json(new ApiResponse(200, updateUser, "User update successfully"));
});

export const getTotalSolved = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const solvedProblems = await db.problem.findMany({
    where: {
      solvedBy: {
        some: {
          userId: userId,
        },
      },
    },
    select: {
      difficulty: true,
    },
  });

  const counts = {
    EASY: 0,
    MEDIUM: 0,
    HARD: 0,
  };

  solvedProblems.forEach((problem) => {
    if (problem.difficulty && counts[problem.difficulty] !== undefined) {
      counts[problem.difficulty]++;
    }
  });

  const total = solvedProblems.length;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        easy: counts.EASY,
        medium: counts.MEDIUM,
        hard: counts.HARD,
        total,
      },
      "total solved get successfully"
    )
  );
});

export const getStreak = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await db.user.findUnique({
    where: {
      id: userId,
    },
  });

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { currentStreak: user.currentStreak, maxStreak: user.maxStreak },
        "Streak fetched successfully"
      )
    );
});
