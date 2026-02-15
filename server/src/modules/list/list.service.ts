import { List } from "@prisma/client";
import prisma from "../../config/db";
import { CreateListInput, UpdateListInput } from "./list.types";

import { logActivity } from "../activity/activity.service";
import { getIO } from "../../socket/socket";

export const createList = async (userId: string, input: CreateListInput) => {
    const result = await prisma.$transaction(async (tx) => {
        // Determine next position
        const maxPosition = await tx.list.aggregate({
            where: { boardId: input.boardId },
            _max: { position: true },
        });

        const nextPosition = (maxPosition._max.position ?? 0) + 1;

        const list = await tx.list.create({
            data: {
                title: input.title,
                boardId: input.boardId,
                position: nextPosition,
            },
        });

        // Log activity (list_created)
        await logActivity({
            boardId: input.boardId,
            userId,
            actionType: "list_created",
            entityType: "list",
            entityId: list.id
        });

        return { list, boardId: input.boardId };
    });

    if (result.boardId) {
        getIO().to(result.boardId).emit("list_created", result.list);
    }

    return result.list;
};

export const updateList = async (listId: string, userId: string, input: UpdateListInput) => {

    const result = await prisma.$transaction(async (tx) => {
        const existingList = await tx.list.findUnique({
            where: { id: listId },
        });

        if (!existingList) {
            throw new Error("List not found");
        }

        if (input.position !== undefined && input.position !== existingList.position) {
            const isMovingDown = input.position > existingList.position;

            if (isMovingDown) {
                // Moving down: Shift items between old and new position UP (-1)
                await tx.list.updateMany({
                    where: {
                        boardId: existingList.boardId,
                        position: {
                            gt: existingList.position,
                            lte: input.position
                        }
                    },
                    data: {
                        position: { decrement: 1 }
                    }
                });
            } else {
                // Moving up: Shift items between new and old position DOWN (+1)
                await tx.list.updateMany({
                    where: {
                        boardId: existingList.boardId,
                        position: {
                            gte: input.position,
                            lt: existingList.position
                        }
                    },
                    data: {
                        position: { increment: 1 }
                    }
                });
            }
        }

        const updatedList = await tx.list.update({
            where: { id: listId },
            data: {
                title: input.title,
                position: input.position,
            },
        });

        // Log activity (list_updated)
        // Only log if something important changed? Title? Position?
        // Prompt says "list_updated".
        await logActivity({
            boardId: existingList.boardId,
            userId,
            actionType: "list_updated",
            entityType: "list",
            entityId: listId
        });

        return { updatedList, boardId: existingList.boardId };
    });

    if (result.boardId) {
        getIO().to(result.boardId).emit("list_updated", result.updatedList);
    }

    return result.updatedList;
};

export const deleteList = async (listId: string, userId: string) => {

    const result = await prisma.$transaction(async (tx) => {
        const list = await tx.list.findUnique({
            where: { id: listId }
        });

        if (!list) return;

        // Delete list (cascades tasks if configured in schema, otherwise need manual delete)
        // Schema doesn't specify cascade on delete for tasks in relation, but usually Prisma handles it if relation is set up right or we do it manually.
        // Looking at schema: List has `tasks Task[]`. Task has `list List @relation(...)`.
        // We should manually delete tasks to be safe or rely on DB cascade if set.
        // Implementation requirement says "Cascade delete tasks".

        await tx.task.deleteMany({
            where: { listId }
        });

        await tx.list.delete({
            where: { id: listId },
        });

        // Reorder remaining lists to fill gap?
        // It's good practice to close the gap.
        await tx.list.updateMany({
            where: {
                boardId: list.boardId,
                position: { gt: list.position }
            },
            data: {
                position: { decrement: 1 }
            }
        });

        // TODO: Log activity (list_deleted) (implemented below)
        await logActivity({
            boardId: list.boardId,
            userId,
            actionType: "list_deleted",
            entityType: "list",
            entityId: listId
        });

        return { boardId: list.boardId };
    });

    if (result?.boardId) {
        getIO().to(result.boardId).emit("list_deleted", { listId });
    }
};

export const getListById = async (listId: string) => {
    return await prisma.list.findUnique({
        where: { id: listId }
    });
}
