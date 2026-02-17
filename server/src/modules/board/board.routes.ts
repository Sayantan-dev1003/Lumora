import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import * as boardController from "./board.controller";
import * as activityController from "../activity/activity.controller";
import { validateRequest } from "../../middlewares/validate.middleware";
import { createBoardSchema, updateBoardSchema, boardIdSchema, getBoardsSchema } from "../../validators/board.schema";

const router = Router();

router.post("/", authMiddleware, validateRequest(createBoardSchema), boardController.createBoard);
router.get("/", authMiddleware, validateRequest(getBoardsSchema), boardController.getBoards);
router.get("/:id", authMiddleware, validateRequest(boardIdSchema), boardController.getBoardById);
router.get("/:id/activity", authMiddleware, validateRequest(boardIdSchema), activityController.getBoardActivity);
router.delete("/:id", authMiddleware, validateRequest(boardIdSchema), boardController.deleteBoard);

export default router;
