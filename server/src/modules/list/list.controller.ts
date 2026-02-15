import { Request, Response, NextFunction } from "express";
import * as listService from "./list.service";
import * as boardService from "../board/board.service";
import { CreateListInput, UpdateListInput } from "./list.types";
import { successResponse } from "../../utils/response.helper";

export const createList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const { title, boardId } = req.body as CreateListInput;

        const isMember = await boardService.isBoardMember(userId, boardId);
        if (!isMember) {
            res.status(404).json({ success: false, message: "Board not found" });
            return;
        }

        const list = await listService.createList(userId, { title, boardId });

        return successResponse(res, list, "List created successfully", undefined, 201);
    } catch (error) {
        next(error);
    }
};

export const updateList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const listId = req.params.id as string;
        const input = req.body as UpdateListInput;

        const list = await listService.getListById(listId);
        if (!list) {
            res.status(404).json({ success: false, message: "List not found" });
            return;
        }

        const isMember = await boardService.isBoardMember(userId, list.boardId);
        if (!isMember) {
            res.status(404).json({ success: false, message: "List not found" });
            return;
        }

        const updatedList = await listService.updateList(listId, userId, input);

        return successResponse(res, updatedList, "List updated successfully");
    } catch (error) {
        next(error);
    }
};

export const deleteList = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const listId = req.params.id as string;

        const list = await listService.getListById(listId);
        if (!list) {
            res.status(404).json({ success: false, message: "List not found" });
            return;
        }

        const isMember = await boardService.isBoardMember(userId, list.boardId);
        if (!isMember) {
            res.status(404).json({ success: false, message: "List not found" });
            return;
        }

        await listService.deleteList(listId, userId);

        return successResponse(res, null, "List deleted successfully");
    } catch (error) {
        next(error);
    }
};
