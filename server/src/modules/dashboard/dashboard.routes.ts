import { Router } from "express";
import * as dashboardController from "./dashboard.controller";
import { authMiddleware } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/stats", authMiddleware, dashboardController.getDashboardStats);

export default router;
