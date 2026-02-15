import { Router } from "express";
import * as taskController from "./task.controller";
import { authMiddleware as protect } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { createTaskSchema, updateTaskSchema, searchTaskSchema } from "../../validators/task.schema";

const router = Router();

router.post("/", protect, validateRequest(createTaskSchema), taskController.createTask);
router.patch("/:id", protect, validateRequest(updateTaskSchema), taskController.updateTask);
router.delete("/:id", protect, taskController.deleteTask);
router.get("/", protect, validateRequest(searchTaskSchema), taskController.searchTasks);

export default router;
