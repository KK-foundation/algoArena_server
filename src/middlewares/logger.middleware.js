import { asyncHandler } from "../utils/asyncHandler.js";

export const loggerMiddleware = asyncHandler(async (req, res, next) => {
  const start = Date.now();

  // Log request details
  console.log(`${req.method} ${req.originalUrl}`);

  // Add response logging
  const originalSend = res.send;
  res.send = function (body) {
    const duration = Date.now() - start;
    console.log(`Response Status: ${res.statusCode}`);
    console.log(`Response Time: ${duration}ms`);
    console.log("------------------------------");
    return originalSend.call(this, body);
  };

  next();
});
