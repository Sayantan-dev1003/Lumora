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
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import { globalLimiter } from "./middlewares/rateLimit.middleware";
import { sanitizeInput } from "./middlewares/sanitize.middleware";
import { CLIENT_URL } from "./config/env";

const app = express();

app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
}));
app.use(helmet());
app.use(morgan("dev"));
if (process.env.NODE_ENV !== "test") {
  app.use(globalLimiter);
}
app.use(express.json({ limit: "10kb" }));
app.use(sanitizeInput);
app.use(cookieParser());

app.use("/api/auth", authRoutes);

app.use("/api/boards", boardRoutes);
app.use("/api/lists", listRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/activity", activityRoutes); // Global activity


app.get("/health", (_req, res) => {
  res.json({
    status: "OK",
    message: "Lumora API running",
  });
});

app.use(errorHandler);

export default app;