import { Request, Response, NextFunction } from "express";
import * as taskService from "./task.service";
import * as listService from "../list/list.service";
import * as boardService from "../board/board.service";
import { CreateTaskInput, UpdateTaskInput, SearchTasksQuery } from "./task.types";
import { successResponse, errorResponse } from "../../utils/response.helper";

export const createTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const { title, listId, description, assignedUserId } = req.body as CreateTaskInput;

        // Verify list exists and get boardId
        const list = await listService.getListById(listId);
        if (!list) {
            return errorResponse(res, "List not found", 404);
        }

        // Verify board membership
        const isMember = await boardService.isBoardMember(userId, list.boardId);
        if (!isMember) {
            return errorResponse(res, "List not found", 404);
        }

        const task = await taskService.createTask(userId, { title, listId, description, assignedUserId });

        return successResponse(res, task, "Task created successfully", undefined, 201);
    } catch (error) {
        next(error);
    }
};

export const updateTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const taskId = req.params.id as string;
        const input = req.body as UpdateTaskInput;

        const task = await taskService.getTaskById(taskId);
        if (!task) {
            return errorResponse(res, "Task not found", 404);
        }

        // Check permission on current board
        const isMember = await boardService.isBoardMember(userId, (task as any).list.boardId);
        if (!isMember) {
            return errorResponse(res, "Task not found", 404);
        }

        // If moving to a new list, verify membership of target list's board
        if (input.listId && input.listId !== task.listId) {
            const targetList = await listService.getListById(input.listId);
            if (!targetList) {
                return errorResponse(res, "Target list not found", 404);
            }
            if (targetList.boardId !== (task as any).list.boardId) {
                const isTargetMember = await boardService.isBoardMember(userId, targetList.boardId);
                if (!isTargetMember) {
                    return errorResponse(res, "Access denied to target board", 403);
                }
            }
        }

        const updatedTask = await taskService.updateTask(taskId, userId, input);

        return successResponse(res, updatedTask, "Task updated successfully");
    } catch (error) {
        next(error);
    }
};

export const deleteTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const taskId = req.params.id as string;

        const task = await taskService.getTaskById(taskId);
        if (!task) {
            return errorResponse(res, "Task not found", 404);
        }

        const isMember = await boardService.isBoardMember(userId, (task as any).list.boardId);
        if (!isMember) {
            return errorResponse(res, "Task not found", 404);
        }

        await taskService.deleteTask(taskId, userId);

        return successResponse(res, null, "Task deleted successfully");
    } catch (error) {
        next(error);
    }
};

export const searchTasks = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const { search, boardId, page, limit } = req.query as unknown as SearchTasksQuery;

        if (!boardId) {
            return errorResponse(res, "Board ID is required", 400);
        }

        const isMember = await boardService.isBoardMember(userId, boardId);
        if (!isMember) {
            return errorResponse(res, "Board not found", 404);
        }

        const pageNum = page ? parseInt(String(page)) : 1;
        const limitNum = limit ? parseInt(String(limit)) : 10;

        const result = await taskService.searchTasks(userId, boardId, search || "", pageNum, limitNum);

        return successResponse(res, result.tasks, "Tasks fetched successfully", {
            total: result.pagination.total,
            page: result.pagination.page,
            limit: result.pagination.limit,
            totalPages: result.pagination.totalPages
        });
    } catch (error) {
        next(error);
    }
};

export const moveTask = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const taskId = req.params.id as string;
        const { sourceListId, destinationListId, sourceIndex, destinationIndex } = req.body;

        const task = await taskService.getTaskById(taskId);
        if (!task) {
            return errorResponse(res, "Task not found", 404);
        }

        // Check permission on current board
        const isMember = await boardService.isBoardMember(userId, (task as any).list.boardId);
        if (!isMember) {
            return errorResponse(res, "Task not found", 404);
        }

        // If moving to a new list, verify membership of target list's board
        if (sourceListId !== destinationListId) {
            const targetList = await listService.getListById(destinationListId);
            if (!targetList) {
                return errorResponse(res, "Destination list not found", 404);
            }
            if (targetList.boardId !== (task as any).list.boardId) {
                const isTargetMember = await boardService.isBoardMember(userId, targetList.boardId);
                if (!isTargetMember) {
                    return errorResponse(res, "Access denied to target board", 403);
                }
            }
        }

        const updatedTask = await taskService.moveTask(taskId, userId, {
            sourceListId,
            destinationListId,
            sourceIndex,
            destinationIndex
        });

        return successResponse(res, updatedTask, "Task moved successfully");
    } catch (error) {
        next(error);
    }
};
