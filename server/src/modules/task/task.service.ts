import { Task } from "@prisma/client";
import prisma from "../../config/db";
import { CreateTaskInput, UpdateTaskInput } from "./task.types";

import { logActivity } from "../activity/activity.service";
import { getIO } from "../../socket/socket";

export const createTask = async (userId: string, input: CreateTaskInput) => {
    const result = await prisma.$transaction(async (tx) => {
        // Determine next position
        const maxPosition = await tx.task.aggregate({
            where: { listId: input.listId },
            _max: { position: true },
        });

        const nextPosition = (maxPosition._max.position ?? 0) + 1;

        const task = await tx.task.create({
            data: {
                title: input.title,
                description: input.description,
                listId: input.listId,
                position: nextPosition,
            },
        });

        // Log activity (task_created)
        // Need boardId. List has boardId. But we only have listId.
        // We can fetch list to get boardId, OR relying on controller to pass it?
        // Service should be self-contained or minimal.
        // Fetching list inside transaction is safe.
        const list = await tx.list.findUnique({
            where: { id: input.listId },
            select: { boardId: true }
        });

        if (list) {
            await logActivity({
                boardId: list.boardId,
                userId,
                actionType: "task_created",
                entityType: "task",
                entityId: task.id
            }, tx);
        }

        return { task, boardId: list?.boardId };
    });

    if (result.boardId) {
        getIO().to(result.boardId).emit("task_created", result.task);
    }

    return result.task;
};

export const updateTask = async (taskId: string, userId: string, input: UpdateTaskInput) => {

    const result = await prisma.$transaction(async (tx) => {
        const existingTask = await tx.task.findUnique({
            where: { id: taskId },
        });

        if (!existingTask) {
            throw new Error("Task not found");
        }

        // Logic for drag-and-drop / Position Update
        if (
            (input.listId && input.listId !== existingTask.listId) ||
            (input.position !== undefined && input.position !== existingTask.position)
        ) {
            const newListId = input.listId || existingTask.listId;
            const newPosition = input.position !== undefined ? input.position : existingTask.position; // Default to current position if not changing list? No, if list changes but pos not provided, append to end? 
            // PROMPT says: "Move task between lists: Input: { listId: newListId, position: newPosition }"
            // If only position changed: "Reorder tasks in same list"

            if (newListId !== existingTask.listId) {
                // Moving to a DIFFERENT list

                // 1. Remove from old list (shift others down/up to fill gap)
                await tx.task.updateMany({
                    where: {
                        listId: existingTask.listId,
                        position: { gt: existingTask.position },
                    },
                    data: { position: { decrement: 1 } },
                });

                // 2. Make space in new list
                await tx.task.updateMany({
                    where: {
                        listId: newListId,
                        position: { gte: newPosition },
                    },
                    data: { position: { increment: 1 } },
                });

                // Log activity (task_moved)
                const list = await tx.list.findUnique({ where: { id: existingTask.listId }, select: { boardId: true } });
                if (list) {
                    await logActivity({
                        boardId: list.boardId,
                        userId,
                        actionType: "task_moved",
                        entityType: "task",
                        entityId: taskId
                    }, tx);
                }

            } else {

                // Reordering in SAME list
                const isMovingDown = newPosition > existingTask.position;

                if (isMovingDown) {
                    // Moving down: Shift items between old and new position UP (-1)
                    await tx.task.updateMany({
                        where: {
                            listId: existingTask.listId,
                            position: {
                                gt: existingTask.position,
                                lte: newPosition
                            }
                        },
                        data: {
                            position: { decrement: 1 }
                        }
                    });
                } else {
                    // Moving up: Shift items between new and old position DOWN (+1)
                    await tx.task.updateMany({
                        where: {
                            listId: existingTask.listId,
                            position: {
                                gte: newPosition,
                                lt: existingTask.position
                            }
                        },
                        data: {
                            position: { increment: 1 }
                        }
                    });
                }

                // TODO: Log activity (task_moved) - maybe distinguish reorder vs move
            }
        }

        // Handle assignment change logging
        if (input.assignedUserId && input.assignedUserId !== existingTask.assignedUserId) {
            // TODO: Log activity (task_assigned)
        }


        const updatedTask = await tx.task.update({
            where: { id: taskId },
            data: {
                title: input.title,
                description: input.description,
                assignedUserId: input.assignedUserId,
                listId: input.listId,
                position: input.position,
            },
        });

        // TODO: Log activity (task_updated) - generic update if not moved/assigned?

        const boardId = updatedTask.listId ? (await tx.list.findUnique({ where: { id: updatedTask.listId }, select: { boardId: true } }))?.boardId : undefined;

        return { updatedTask, boardId };
    });

    if (result.boardId) {
        getIO().to(result.boardId).emit("task_updated", result.updatedTask);
    }

    return result.updatedTask;


};

export const deleteTask = async (taskId: string, userId: string) => {
    const result = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({
            where: { id: taskId },
        });

        if (!task) return;

        await tx.task.delete({
            where: { id: taskId },
        });

        // Shift positions in list to close gap
        await tx.task.updateMany({
            where: {
                listId: task.listId,
                position: { gt: task.position },
            },
            data: { position: { decrement: 1 } },
        });

        // Log activity (task_deleted)
        const list = await tx.list.findUnique({ where: { id: task.listId }, select: { boardId: true } });
        if (list) {
            await logActivity({
                boardId: list.boardId,
                userId,
                actionType: "task_deleted",
                entityType: "task",
                entityId: taskId
            }, tx);
        }
        return { boardId: list?.boardId };
    });

    if (result && result.boardId) {
        getIO().to(result.boardId).emit("task_deleted", { taskId });
    }
};

export const getTaskById = async (taskId: string) => {
    return await prisma.task.findUnique({
        where: { id: taskId },
        include: { list: true } // Include list to check boardId easily if needed
    });
};

export const searchTasks = async (userId: string, boardId: string, query: string, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const where = {
        list: {
            boardId: boardId // Search within specific board
        },
        title: {
            contains: query,
            mode: 'insensitive' as const, // Case insensitive search
        }
    };

    const [tasks, total] = await Promise.all([
        prisma.task.findMany({
            where,
            skip,
            take: limit,
            orderBy: { createdAt: 'desc' },
            include: {
                list: {
                    select: {
                        id: true,
                        title: true,
                        boardId: true
                    }
                },
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true
                    }
                }
            }
        }),
        prisma.task.count({ where })
    ]);

    return {
        tasks,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit)
        }
    };
}
