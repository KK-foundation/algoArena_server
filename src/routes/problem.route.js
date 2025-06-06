import express from "express";
import { authMiddleware, checkAdmin } from "../middlewares/auth.middleware.js";
import {
  createProblem,
  deleteProblem,
  getAllProblems,
  getAllProblemsCreatedByUser,
  getAllProblemsSolvedByUser,
  getAllTags,
  getMostSolved3Problem,
  getProblemById,
  getProblemsByCompanyChallenges,
  getRandomProblem,
  updateProblem,
} from "../controllers/problem.controller.js";

export const problemRouter = express.Router();

problemRouter.post(
  "/create-problem",
  authMiddleware,
  checkAdmin,
  createProblem
);
problemRouter.put(
  "/update-problem/:id",
  authMiddleware,
  checkAdmin,
  updateProblem
);
problemRouter.delete(
  "/delete-problem/:id",
  authMiddleware,
  checkAdmin,
  deleteProblem
);
problemRouter.get("/get-all-problems", getAllProblems);
problemRouter.get("/get-problem/:id", authMiddleware, getProblemById);
problemRouter.get(
  "/get-solved-problems",
  authMiddleware,
  getAllProblemsSolvedByUser
);
problemRouter.get(
  "/problem-created-by-user",
  authMiddleware,
  getAllProblemsCreatedByUser
);
problemRouter.get("/get-most-solved-3problem",getMostSolved3Problem);
problemRouter.get("/get-all-companies-challenges",getProblemsByCompanyChallenges);
problemRouter.get("/random-problem",authMiddleware,getRandomProblem);
problemRouter.get("/get-all-tags",getAllTags);