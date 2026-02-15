import { Prisma } from "@prisma/client";
import prisma from "../../config/db";
import { LogActivityInput } from "./activity.types";
import { getIO } from "../../socket/socket";

export const logActivity = async (input: LogActivityInput, tx?: Prisma.TransactionClient) => {
    try {
        const client = tx || prisma;
        const activity = await client.activity.create({
            data: {
                boardId: input.boardId,
                userId: input.userId,
                actionType: input.actionType,
                entityType: input.entityType,
                entityId: input.entityId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        getIO().to(input.boardId).emit("activity_created", activity);
    } catch (error) {
        console.error("Failed to log activity:", error);
        // We don't want to fail the main request if logging fails, so we just log the error.
    }
};

export const getBoardActivity = async (boardId: string, page: number = 1, limit: number = 20) => {
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
        prisma.activity.findMany({
            where: { boardId },
            skip,
            take: limit,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        }),
        prisma.activity.count({ where: { boardId } }),
    ]);

    return {
        activities,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
        },
    };
};
