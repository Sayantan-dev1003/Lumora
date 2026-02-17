import { Router } from "express";
import * as activityController from "./activity.controller";
import { authMiddleware as protect } from "../../middlewares/auth.middleware";

const router = Router();


router.get("/", protect, activityController.getAllActivity);

export default router;
