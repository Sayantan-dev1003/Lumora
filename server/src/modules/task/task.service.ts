import { Task } from "@prisma/client";
import prisma from "../../config/db";
import { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from "./task.types";

import { logActivity } from "../activity/activity.service";
import { getIO } from "../../socket/socket";
import { addBoardMember, isBoardMember } from "../board/board.service";

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
                assignedUserId: input.assignedUserId,
                creatorId: userId,
            },
        });

        // Get boardId
        const list = await tx.list.findUnique({
            where: { id: input.listId },
            select: { boardId: true }
        });

        const boardId = list?.boardId;

        if (boardId) {
            // Log activity (task_created)
            await logActivity({
                boardId,
                userId,
                actionType: "task_created",
                entityType: "task",
                entityId: task.id
            }, tx);

            // Handle Auto-Membership for Assignee
            if (input.assignedUserId) {
                const existingMember = await tx.boardMember.findUnique({
                    where: {
                        boardId_userId: {
                            boardId,
                            userId: input.assignedUserId
                        }
                    }
                });

                if (!existingMember) {
                    await tx.boardMember.create({
                        data: {
                            boardId,
                            userId: input.assignedUserId,
                            role: "member"
                        }
                    });
                    // New member added
                }

                // Log activity (task_assigned)
                await logActivity({
                    boardId,
                    userId,
                    actionType: "task_assigned",
                    entityType: "task",
                    entityId: task.id
                }, tx);
            }
        }

        return { task, boardId, assignedUserId: input.assignedUserId };
    });

    if (result.boardId) {
        getIO().to(result.boardId).emit("task_created", result.task);

        if (result.assignedUserId) {
            // Notify the assigned user so they see the board
            getIO().to(result.assignedUserId).emit("board_created", { boardId: result.boardId });
        }
    }

    return result.task;
};

export const moveTask = async (taskId: string, userId: string, input: MoveTaskInput) => {
    const { sourceListId, destinationListId, sourceIndex, destinationIndex } = input;

    const result = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId } });
        if (!task) throw new Error("Task not found");

        let savedTask;
        let finalBoardId;

        if (sourceListId === destinationListId) {
            // Same List Reorder
            const tasks = await tx.task.findMany({
                where: { listId: sourceListId },
                orderBy: { position: "asc" }
            });

            // Filter out the moving task to avoid duplication in array manipulation
            const otherTasks = tasks.filter(t => t.id !== taskId);

            // Insert at new index
            const reordered = [
                ...otherTasks.slice(0, destinationIndex),
                task,
                ...otherTasks.slice(destinationIndex)
            ];

            // Reassign positions
            for (let i = 0; i < reordered.length; i++) {
                if (reordered[i].id === taskId) {
                    savedTask = await tx.task.update({
                        where: { id: taskId },
                        data: { position: i + 1 } // 1-based indexing for safety/convention
                    });
                } else {
                    if (reordered[i].position !== i + 1) {
                        await tx.task.update({
                            where: { id: reordered[i].id },
                            data: { position: i + 1 }
                        });
                    }
                }
            }

            // Get boardId for emission
            const list = await tx.list.findUnique({ where: { id: sourceListId }, select: { boardId: true } });
            finalBoardId = list?.boardId;

        } else {
            // Cross List Move
            const sourceTasks = await tx.task.findMany({
                where: { listId: sourceListId },
                orderBy: { position: "asc" }
            });

            const destTasks = await tx.task.findMany({
                where: { listId: destinationListId },
                orderBy: { position: "asc" }
            });

            // Remove from source
            const updatedSource = sourceTasks.filter(t => t.id !== taskId);

            // Insert into destination
            const updatedDest = [
                ...destTasks.slice(0, destinationIndex),
                task,
                ...destTasks.slice(destinationIndex)
            ];

            // Update moved task listId and position
            savedTask = await tx.task.update({
                where: { id: taskId },
                data: {
                    listId: destinationListId,
                    position: destinationIndex + 1
                }
            });

            // Reassign positions in source
            for (let i = 0; i < updatedSource.length; i++) {
                if (updatedSource[i].position !== i + 1) {
                    await tx.task.update({
                        where: { id: updatedSource[i].id },
                        data: { position: i + 1 }
                    });
                }
            }

            // Reassign positions in destination
            for (let i = 0; i < updatedDest.length; i++) {
                if (updatedDest[i].id !== taskId && updatedDest[i].position !== i + 1) {
                    await tx.task.update({
                        where: { id: updatedDest[i].id },
                        data: { position: i + 1 }
                    });
                }
            }

            const list = await tx.list.findUnique({ where: { id: destinationListId }, select: { boardId: true } });
            finalBoardId = list?.boardId;

            // Activity Log (Cross List)
            try {
                if (finalBoardId) {
                    await logActivity({
                        boardId: finalBoardId,
                        userId,
                        actionType: "task_moved",
                        entityType: "task",
                        entityId: taskId
                    }, undefined);
                }
            } catch (e) {
                console.error("Failed to log activity", e);
            }
        }

        return { task: savedTask, boardId: finalBoardId };
    });

    if (result.boardId && result.task) {
        getIO().to(result.boardId).emit("task_moved", {
            taskId: result.task.id,
            sourceListId,
            destinationListId,
            destinationIndex,
            task: result.task
        });

        // Also emit task_updated to ensure full sync
        getIO().to(result.boardId).emit("task_updated", result.task);
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

        // Initialize final values with current or new values
        const finalListId = input.listId || existingTask.listId;
        const finalPosition = input.position !== undefined ? input.position : existingTask.position;

        console.log(`[updateTask] Processing Task ${taskId}`);
        console.log(`[updateTask] Input ListId: ${input.listId}, Existing: ${existingTask.listId} -> Final: ${finalListId}`);
        console.log(`[updateTask] Input Pos: ${input.position}, Existing: ${existingTask.position} -> Final: ${finalPosition}`);


        // Logic for drag-and-drop / Position Update
        if (
            finalListId !== existingTask.listId ||
            finalPosition !== existingTask.position
        ) {

            if (finalListId !== existingTask.listId) {
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
                        listId: finalListId,
                        position: { gte: finalPosition },
                    },
                    data: { position: { increment: 1 } },
                });

                // Log activity (task_moved)
                try {
                    const list = await prisma.list.findUnique({ where: { id: existingTask.listId }, select: { boardId: true } });
                    if (list) {
                        await logActivity({
                            boardId: list.boardId,
                            userId,
                            actionType: "task_moved",
                            entityType: "task",
                            entityId: taskId
                        }, undefined);
                    }
                } catch (e) {
                    console.error("[updateTask] Failed to log task_moved:", e);
                }

            } else {

                // Reordering in SAME list
                const isMovingDown = finalPosition > existingTask.position;

                if (isMovingDown) {
                    // Moving down: Shift items between old and new position UP (-1)
                    await tx.task.updateMany({
                        where: {
                            listId: existingTask.listId,
                            position: {
                                gt: existingTask.position,
                                lte: finalPosition
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
                                gte: finalPosition,
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

        // Get Board ID for assignment logic
        const list = await tx.list.findUnique({ where: { id: finalListId }, select: { boardId: true } });
        const boardId = list?.boardId;

        // Handle assignment change logging & Auto-Membership
        let newMemberAdded = false;

        if (input.assignedUserId !== undefined && input.assignedUserId !== existingTask.assignedUserId) {

            if (input.assignedUserId && boardId) {
                // Check membership
                const existingMember = await tx.boardMember.findUnique({
                    where: {
                        boardId_userId: {
                            boardId,
                            userId: input.assignedUserId
                        }
                    }
                });

                if (!existingMember) {
                    await tx.boardMember.create({
                        data: {
                            boardId,
                            userId: input.assignedUserId,
                            role: "member"
                        }
                    });
                    newMemberAdded = true;
                }

                try {
                    await logActivity({
                        boardId: boardId,
                        userId,
                        actionType: "task_assigned",
                        entityType: "task",
                        entityId: taskId
                    }, undefined);
                } catch (e) { console.error("[updateTask] Failed to log task_assigned:", e); }

            } else if (input.assignedUserId === null && boardId) {
                // Unassigned
                try {
                    await logActivity({
                        boardId: boardId,
                        userId,
                        actionType: "task_unassigned",
                        entityType: "task",
                        entityId: taskId
                    }, undefined);
                } catch (e) { console.error("[updateTask] Failed to log task_unassigned:", e); }
            }
        }


        const updatedTask = await tx.task.update({
            where: { id: taskId },
            data: {
                title: input.title,
                description: input.description,
                assignedUserId: input.assignedUserId,
                listId: finalListId,
                position: finalPosition,
            },
        });

        return { updatedTask, boardId, newMemberAdded, newAssignedUserId: input.assignedUserId };
    });

    if (result.boardId) {
        getIO().to(result.boardId).emit("task_updated", result.updatedTask);

        if (result.newMemberAdded && result.newAssignedUserId) {
            getIO().to(result.newAssignedUserId).emit("board_created", { boardId: result.boardId });
        }
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
