import { Board, BoardMember, List } from "@prisma/client";

export interface CreateBoardInput {
    title: string;
}

export interface BoardResponse {
    success: true;
    board: Board;
}

export interface BoardsResponse {
    success: true;
    boards: Board[];
    pagination: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface BoardDetailResponse {
    success: true;
    board: Board & {
        members: BoardMember[];
        lists: List[];
    };
}

export interface DeleteBoardResponse {
    success: true;
    message: string;
}
