import { Request, Response, NextFunction } from "express";
import * as boardService from "./board.service";
import { CreateBoardInput } from "./board.types";
import { successResponse, errorResponse } from "../../utils/response.helper";

export const createBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const { title } = req.body as CreateBoardInput;

        const board = await boardService.createBoard(userId, { title });

        return successResponse(res, board, "Board created successfully", undefined, 201);
    } catch (error) {
        next(error);
    }
};

export const getBoards = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;

        const result = await boardService.getBoards(userId, page, limit);

        return successResponse(res, result.boards, "Boards fetched successfully", {
            total: result.pagination.total,
            page: result.pagination.page,
            limit: result.pagination.limit,
            totalPages: result.pagination.totalPages
        });
    } catch (error) {
        next(error);
    }
};

export const getBoardById = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const boardId = req.params.id as string;

        const isMember = await boardService.isBoardMember(userId, boardId);
        if (!isMember) {
            // Security through obscurity: Return 404 if not a member to hide board existence
            return errorResponse(res, "Board not found", 404);
        }

        const board = await boardService.getBoardById(boardId);
        if (!board) {
            return errorResponse(res, "Board not found", 404);
        }

        return successResponse(res, board, "Board fetched successfully");
    } catch (error) {
        next(error);
    }
};

export const deleteBoard = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const boardId = req.params.id as string;

        const isMember = await boardService.isBoardMember(userId, boardId);
        if (!isMember) {
            return errorResponse(res, "Board not found", 404);
        }

        const isAdmin = await boardService.isBoardAdmin(userId, boardId);
        if (!isAdmin) {
            return errorResponse(res, "Access denied. Admin role required.", 403);
        }

        await boardService.deleteBoard(boardId, userId);

        return successResponse(res, null, "Board deleted successfully");
    } catch (error) {
        next(error);
    }
};
