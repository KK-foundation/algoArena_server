import express from "express";
import cookieParser from "cookie-parser";
import path from "path";
import cors from "cors";
import { fileURLToPath } from "url";
import { ErrorMiddleware } from "./utils/error.js";
import { loggerMiddleware } from "./middlewares/logger.middleware.js";

//extra processing
export const __filename = fileURLToPath(import.meta.url);
export const __dirname = path.dirname(__filename);

// server initialization
const app = express();

// file import
import { authRouter } from "./routes/auth.route.js";
import { problemRouter } from "./routes/problem.route.js";
import { executeRouter } from "./routes/executeCode.route.js";
import { submissionRouter } from "./routes/submission.route.js";
import { sheetRouter } from "./routes/sheet.route.js";
import { userRouter } from "./routes/user.route.js";
import { formatRouter } from "./routes/format.route.js";
import { yearlyGridRouter } from "./routes/yearlyGrid.route.js";
import { playgroundRouter } from "./routes/playground.route.js";
import { potdRouter } from "./routes/potd.route.js";

const allowedOrigins = [
  "http://localhost:5173",
  "https://algoarenaa.netlify.app",
  "https://bbfch6vp-5000.inc1.devtunnels.ms/",
];

//middlewares
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "../", "public")));
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    optionsSuccessStatus: 200,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "PUT"],
    maxAge: 86400,
  })
);
app.use(cookieParser());

// Add logger middleware
app.use(loggerMiddleware);

// routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/problems", problemRouter);
app.use("/api/v1/execute-code", executeRouter);
app.use("/api/v1/submission", submissionRouter);
app.use("/api/v1/sheets", sheetRouter);
app.use("/api/v1/user", userRouter);
app.use("/api/v1/format", formatRouter);
app.use("/api/v1/yearlyGrid", yearlyGridRouter);
app.use("/api/v1/playground", playgroundRouter);
app.use("/api/v1/potd", potdRouter);
// health check route
app.get("/", (req, res) => {
  res.send("Hello World!");
});

//unknown route
app.use("/*splat", (req, res, next) => {
  const err = new Error(`Route ${req.originalUrl} not found`);
  err.statusCode = 404;
  next(err);
});
app.use(ErrorMiddleware);

export default app;
