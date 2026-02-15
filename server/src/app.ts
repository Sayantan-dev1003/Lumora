import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import boardRoutes from "./modules/board/board.routes";
import listRoutes from "./modules/list/list.routes";
import taskRoutes from "./modules/task/task.routes";
import activityRoutes from "./modules/activity/activity.routes";
import { globalLimiter } from "./middlewares/rateLimit.middleware";
import { sanitizeInput } from "./middlewares/sanitize.middleware";

const app = express();

app.use(cors({
  origin: "http://localhost:5173", // Frontend URL
  credentials: true,
}));
app.use(helmet());
app.use(morgan("dev"));
app.use(globalLimiter); // Apply global rate limiter
app.use(express.json({ limit: "10kb" }));
app.use(sanitizeInput); // Sanitize inputs after parsing body
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/boards", activityRoutes); // Mount activity routes first to prioritize /:id/activity
app.use("/api/boards", boardRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/tasks", taskRoutes);

app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    message: "Lumora API running",
  });
});

app.use(errorHandler);

export default app;