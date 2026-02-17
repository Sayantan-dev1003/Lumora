import { Request, Response, NextFunction } from "express";
import * as activityService from "./activity.service";
import * as boardService from "../board/board.service";
import { successResponse, errorResponse } from "../../utils/response.helper";

export const getBoardActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const boardId = req.params.id as string;
        const page = req.query.page ? parseInt(String(req.query.page)) : 1;
        const limit = req.query.limit ? parseInt(String(req.query.limit)) : 20;

        const isMember = await boardService.isBoardMember(userId, boardId);
        if (!isMember) {
            return errorResponse(res, "Access denied", 403);
        }

        const result = await activityService.getBoardActivity(boardId, page, limit);

        return successResponse(res, result.activities, "Activities fetched successfully", {
            total: result.pagination.total,
            page: result.pagination.page,
            limit: result.pagination.limit,
            totalPages: result.pagination.totalPages
        });
    } catch (error) {
        next(error);
    }
};

export const getAllActivity = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;
        const page = req.query.page ? parseInt(String(req.query.page)) : 1;
        const limit = req.query.limit ? parseInt(String(req.query.limit)) : 20;
        // Always fetch activities for the current user
        const result = await activityService.getAllActivity(userId, page, limit);

        return successResponse(res, result.activities, "Activities fetched successfully", {
            total: result.pagination.total,
            page: result.pagination.page,
            limit: result.pagination.limit,
            totalPages: result.pagination.totalPages
        });
    } catch (error) {
        next(error);
    }
};
