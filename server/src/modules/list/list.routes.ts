import { Router } from "express";
import * as listController from "./list.controller";
import { authMiddleware as protect } from "../../middlewares/auth.middleware";
import { validateRequest } from "../../middlewares/validate.middleware";
import { createListSchema, updateListSchema } from "../../validators/list.schema";

const router = Router();

router.post("/", protect, validateRequest(createListSchema), listController.createList);
router.patch("/:id", protect, validateRequest(updateListSchema), listController.updateList);
router.delete("/:id", protect, listController.deleteList);

export default router;
