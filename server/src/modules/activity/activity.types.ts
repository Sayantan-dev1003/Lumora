import { Activity } from "@prisma/client";

export interface LogActivityInput {
    boardId: string;
    userId: string;
    actionType: string;
    entityType: "board" | "list" | "task";
    entityId: string;
}

export interface ActivityResponse {
    success: boolean;
    activities: {
        id: string;
        actionType: string;
        entityType: string;
        entityId: string;
        createdAt: Date;
        user: {
            id: string;
            name: string;
            email: string;
        };
    }[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
