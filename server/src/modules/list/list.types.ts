import { List } from "@prisma/client";

export interface CreateListInput {
    title: string;
    boardId: string;
}

export interface UpdateListInput {
    title?: string;
    position?: number;
}

export interface ListResponse {
    success: boolean;
    list: List;
}

export interface DeleteListResponse {
    success: boolean;
    message: string;
}
