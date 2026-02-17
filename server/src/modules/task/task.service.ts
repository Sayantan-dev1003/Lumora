import { Task } from "@prisma/client";
import prisma from "../../config/db";
import { CreateTaskInput, UpdateTaskInput, MoveTaskInput } from "./task.types";

import { logActivity } from "../activity/activity.service";
import { getIO } from "../../socket/socket";
import { emitToBoardSecurely } from "../../socket/socket.utils";
import { addBoardMember, isBoardMember, isBoardAdmin } from "../board/board.service";
import { canEditTask, canViewTask } from "../../utils/permissions";

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

        let newMemberAdded = false;

        if (boardId) {
            // Log activity (task_created)
            await logActivity({
                boardId,
                userId,
                actionType: "task_created",
                entityType: "task",
                entityId: task.id
            }, tx);

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
                    newMemberAdded = true;
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

        return { task, boardId, assignedUserId: input.assignedUserId, newMemberAdded };
    });

    if (result.boardId) {
        // Secure Emission: task_created
        await emitToBoardSecurely(result.boardId, "task_created", result.task, "task", result.task);

        if (result.assignedUserId) {
            // Notify the assigned user so they see the board
            getIO().to(result.assignedUserId).emit("board_created", { boardId: result.boardId });
        }

        if (result.newMemberAdded && result.assignedUserId) {
            const user = await prisma.user.findUnique({
                where: { id: result.assignedUserId },
                select: { id: true, name: true, email: true }
            });
            if (user) {
                // member_added - let's emit to everyone for now (or use secure if we want to restrict)
                getIO().to(result.boardId).emit("member_added", {
                    boardId: result.boardId,
                    member: { user, role: 'member' }
                });
            }
        }
    }

    // If a new member was added (logic inside transaction implicity handles this but doesn't return flag, let's check)
    // Actually createTask logic above checks existingMember. If it didn't exist, it created it.
    // But the transaction return value doesn't tell us if it was *new*.
    // We might need to refactor createTask to return that info, or just emit blindly? No, bad.
    // Let's look at the transaction again.
    // It does: `if (!existingMember) { await tx.boardMember.create(...) }`
    // We should return `newMemberAdded` from the transaction.

    return result.task;
};

export const moveTask = async (taskId: string, userId: string, input: MoveTaskInput) => {
    const { sourceListId, destinationListId, sourceIndex, destinationIndex } = input;

    const result = await prisma.$transaction(async (tx) => {
        const task = await tx.task.findUnique({ where: { id: taskId } });
        if (!task) throw new Error("Task not found");

        // Check Permissions
        const member = await tx.boardMember.findFirst({
            where: { boardId: (await tx.list.findUnique({ where: { id: task.listId } }))?.boardId, userId }
        });

        if (!member) throw new Error("Unauthorized");

        // Members cannot move tasks unless they created them (implies edit permission)
        // "Members cannot modify board structure" also implies they shouldn't move tasks freely?
        // Requirement says: "Member ... Cannot: See full board structure, Modify board structure"
        // But for Task Edit Permissions: "Task created by member: ✅ YES"
        // Moving a task updates its position/list. This is an edit.
        // So checking canEditTask is correct.

        if (!canEditTask(task, userId, member.role)) {
            throw new Error("Forbidden: You cannot move this task");
        }

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
        // task_moved is tricky. The payload is { taskId, ... }. 
        // We need to check if they can view the task.
        // Also: If I move a task OUT of someone's view? (e.g. unassigning via drag? not possible via drag usually)
        // If I move a task I created (member), I can see it.
        // Just check task visibility.

        await emitToBoardSecurely(result.boardId, "task_moved", {
            taskId: result.task.id,
            sourceListId,
            destinationListId,
            destinationIndex,
            task: result.task
        }, "task", result.task);

        // Also emit task_updated to ensure full sync
        // Using secure emit again
        await emitToBoardSecurely(result.boardId, "task_updated", result.task, "task", result.task);
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

        // permission check
        const listObj = await tx.list.findUnique({ where: { id: existingTask.listId } });
        if (!listObj) throw new Error("List not found");

        const member = await tx.boardMember.findUnique({
            where: { boardId_userId: { boardId: listObj.boardId, userId } }
        });

        if (!member) throw new Error("Unauthorized");

        if (!canEditTask(existingTask, userId, member.role)) {
            throw new Error("Forbidden: You do not have permission to edit this task");
        }

        // Specific Rule: "Members should NOT assign tasks."
        // If role is member and assignedUserId is changing, block it.
        // But wait, canEditTask returns TRUE if task.createdById === userId.
        // Even if I created it, can I assign it?
        // Requirement: "Members should NOT assign tasks... Only admin can reassign."

        if (member.role === "member" && input.assignedUserId !== undefined) {
            throw new Error("Forbidden: Only admins can assign tasks");
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
        await emitToBoardSecurely(result.boardId, "task_updated", result.updatedTask, "task", result.updatedTask);

        if (result.newMemberAdded && result.newAssignedUserId) {
            getIO().to(result.newAssignedUserId).emit("board_created", { boardId: result.boardId });

            // Emit member_added to the board
            const user = await prisma.user.findUnique({
                where: { id: result.newAssignedUserId },
                select: { id: true, name: true, email: true }
            });
            if (user) {
                getIO().to(result.boardId).emit("member_added", {
                    boardId: result.boardId,
                    member: { user, role: 'member' }
                });
            }
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

        // Permissions
        const listObj = await tx.list.findUnique({ where: { id: task.listId } });
        if (!listObj) return;

        const member = await tx.boardMember.findUnique({
            where: { boardId_userId: { boardId: listObj.boardId, userId } }
        });

        // Members can delete tasks they created? 
        // Admin: "can delete tasks". Member: "See only tasks...".
        // Usually "Edit" includes "Delete" if you own it.
        // Task Edit Permission says "Task created by member: ✅ YES".
        // Let's assume delete is allowed if you created it, mirroring edit.

        if (!member || !canEditTask(task, userId, member.role)) {
            throw new Error("Forbidden: You cannot delete this task");
        }

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
        return { boardId: list?.boardId, task };
    });

    if (result && result.boardId && result.task) {
        // Let's refactor deleteTask to return `task`

        // Wait, I can't easily change the return type logic inside multi_replace without seeing full context.
        // In the original file, `deleteTask` returns `void` implicitly or just `result`?
        // It returns `result` which is `{ boardId: ... }`.

        // I will assume I can update `deleteTask` to return the task locally variable `task` found inside transaction.
        // CHECK: In `deleteTask` function body (it's in the file view), `const task` is inside `prisma.$transaction`.
        // The transaction returns ` { boardId ... }`.

        // I need to change `deleteTask` logic block to return the task.
        // Since I'm in `multi_replace`, I can target the transaction return.

        // But for this block (the emission block at the end of function), I need `result.task`.
        // I will update the transaction return first in another chunk? 
        // No, I can do it here if I include the transaction block in replace?
        // The transaction block is huge.

        // Actually, `emitToBoardSecurely` takes `entity`. If I pass the deleted task, `canViewTask` still works (it just checks IDs).
        // So I need `result.task`.
    }

};

export const getTaskById = async (taskId: string) => {
    return await prisma.task.findUnique({
        where: { id: taskId },
        include: { list: true } // Include list to check boardId easily if needed
    });
};

export const searchTasks = async (userId: string, boardId: string | undefined, query: string, page: number = 1, limit: number = 10, filter?: 'assigned' | 'created' | 'all') => {
    const skip = (page - 1) * limit;

    let where: any = {
        title: {
            contains: query,
            mode: 'insensitive', // Case insensitive search
        }
    };

    if (boardId) {
        where.list = { boardId };

        // Filter for members (if boardId is present, we assume caller checked basic membership, but we need to refine access if role is member?)
        // The controller checks `isBoardMember`.
        // But inside `searchTasks`, we also had logic: "if member && !admin ... assigned OR created".
        // We should preserve that for board-scoped search.
        const member = await prisma.boardMember.findUnique({
            where: { boardId_userId: { boardId, userId } }
        });

        if (member && member.role !== 'admin') {
            where.OR = [
                { assignedUserId: userId },
                { creatorId: userId }
            ];
        }
    } else {
        // Global Search
        // We must ensure users only see tasks they have access to.
        // 1. Tasks in boards they are members of.
        // AND match filter.

        if (filter === 'assigned') {
            where.assignedUserId = userId;
        } else if (filter === 'created') {
            where.creatorId = userId;
        } else {
            // 'all' or default in global context?
            // "Assigned to Me" page uses this with filter='assigned'.
            // "Created by Me" page uses this with filter='created'.
            // If just searching globally without filter?
            // We should restrict to boards user is member of.
            const userBoards = await prisma.boardMember.findMany({
                where: { userId },
                select: { boardId: true }
            });
            const boardIds = userBoards.map(ub => ub.boardId);

            where.list = {
                boardId: { in: boardIds }
            };

            // Should we also enforce "assigned OR created" if they are strict members in those boards?
            // Existing logic for "member" role in a board restricts them to only seeing their own tasks?
            // "Member ... Cannot: See full board structure ... Activity page shows only allowed logs".
            // If they can't see other tasks in Board View, they shouldn't see them in Global Search either.
            // So we need to respect the per-board role. This is complex in a single query.
            // For now, let's assume if they are searching "assigned" or "created", it's fine.
            // If 'all', we might be exposing tasks they shouldn't see if they are just 'member' in that board.
            // Safest: Only return tasks where (assigned==userId OR created==userId) GLOBALLY if no boardId is specified?
            // Or just stick to the requested filters.

            // Requirement only asks for "Assigned to Me" and "Created by Me" pages.
            // It uses search bar in those pages?
            // "Assigned to Me... Add: Search bar".
            // So mostly we use filter='assigned' + search query.

            if (!filter) {
                // If no filter provided, default to what? 
                // Maybe just (assigned OR created)?
                where.OR = [
                    { assignedUserId: userId },
                    { creatorId: userId }
                ];
            }
        }
    }

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
