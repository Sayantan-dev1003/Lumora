import { Task } from "@prisma/client";

export interface CreateTaskInput {
    title: string;
    description?: string;
    listId: string;
    assignedUserId?: string;
}

export interface UpdateTaskInput {
    title?: string;
    description?: string;
    assignedUserId?: string;
    listId?: string;
    position?: number;
}

export interface MoveTaskInput {
    sourceListId: string;
    destinationListId: string;
    sourceIndex: number;
    destinationIndex: number;
}

export interface TaskResponse {
    success: boolean;
    task: Task;
}

export interface DeleteTaskResponse {
    success: boolean;
    message: string;
}

export interface SearchTasksQuery {
    search: string;
    boardId: string;
    page?: string;
    limit?: string;
}
