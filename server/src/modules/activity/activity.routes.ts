import { Router } from "express";
import * as activityController from "./activity.controller";
import { authMiddleware as protect } from "../../middlewares/auth.middleware";

const router = Router();

router.get("/:id/activity", protect, activityController.getBoardActivity);

export default router;
