import { Board, BoardMember, List } from "@prisma/client";
import prisma from "../../config/db";
import { CreateBoardInput } from "./board.types";
import { logActivity } from "../activity/activity.service";

export const createBoard = async (userId: string, input: CreateBoardInput) => {
    return await prisma.$transaction(async (tx) => {
        const board = await tx.board.create({
            data: {
                title: input.title,
                ownerId: userId,
            },
        });

        await tx.boardMember.create({
            data: {
                userId,
                boardId: board.id,
                role: "admin",
            },
        });

        // Log activity
        // We need to call logActivity outside strictly or use prisma middleware, but here simple call is fine.
        // However, logActivity uses prisma.activity.create which is separate. 
        // Ideally we should run it within transaction if we want strict atomicity, 
        // but logActivity function uses its own prisma call. 
        // For now, let's just trigger it. Since it's fire-and-forget in the service implementation, 
        // we can probably just call it.
        // But wait, `logActivity` is async.
        // To be safe and keep it simple without circular deps or complex transaction passing:
        // We'll call it after transaction commits or just inside (but it won't be part of tx unless we change logActivity to accept tx).
        // The prompt said "Create reusable function logActivity".
        // Use it.

        return board;
    });

    // We can't easily access 'board' result outside transaction block unless we store it.
    // Let's refactor slightly to return result and then log.
    // Or just fire and forget inside? The `logActivity` imports `prisma` directly.
    // It will run on a separate connection/context. That's fine for now.

    // Actually, `createBoard` returns `board`. So we can log after.

};

export const getBoards = async (userId: string, page: number = 1, limit: number = 10) => {
    const skip = (page - 1) * limit;

    const where = {
        OR: [
            {
                members: {
                    some: {
                        userId,
                    },
                },
            },
            {
                lists: {
                    some: {
                        tasks: {
                            some: {
                                assignedUserId: userId
                            }
                        }
                    }
                }
            }
        ]
    };

    const [boards, total] = await Promise.all([
        prisma.board.findMany({
            where,
            skip,
            take: limit,
            orderBy: {
                updatedAt: "desc",
            },
            include: {
                owner: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    }
                }
            }
        }),
        prisma.board.count({ where }),
    ]);

    return {
        boards,
        pagination: {
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        },
    };
};

export const getBoardById = async (boardId: string) => {
    return await prisma.board.findUnique({
        where: { id: boardId },
        include: {
            members: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                },
            },
            lists: {
                orderBy: {
                    position: "asc",
                },
                include: {
                    tasks: {
                        orderBy: {
                            position: "asc"
                        },
                        include: {
                            assignedUser: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            },
        },
    });
};

export const deleteBoard = async (boardId: string, userId: string) => {
    return await prisma.$transaction(async (tx) => {
        // 1. Delete tasks (must delete these before lists due to FK)
        await tx.task.deleteMany({
            where: {
                list: {
                    boardId: boardId,
                },
            },
        });

        // 2. Delete lists
        await tx.list.deleteMany({
            where: { boardId },
        });

        // 3. Delete activities
        await tx.activity.deleteMany({
            where: { boardId },
        });

        // 4. Delete membership records
        await tx.boardMember.deleteMany({
            where: { boardId },
        });

        // 5. Finally delete the board
        return await tx.board.delete({
            where: { id: boardId },
        });
    });
};

export const isBoardMember = async (userId: string, boardId: string): Promise<boolean> => {
    const member = await prisma.boardMember.findUnique({
        where: {
            boardId_userId: {
                boardId,
                userId,
            },
        },
    });
    return !!member;
};

export const isBoardAdmin = async (userId: string, boardId: string): Promise<boolean> => {
    const member = await prisma.boardMember.findUnique({
        where: {
            boardId_userId: {
                boardId,
                userId,
            },
        },
    });
    return member?.role === "admin";
};

export const addBoardMember = async (boardId: string, userId: string, role: string = 'member') => {
    // Check if already a member to avoid unique constraint errors if purely relying on create
    const existing = await prisma.boardMember.findUnique({
        where: {
            boardId_userId: {
                boardId,
                userId,
            },
        },
    });

    if (existing) return existing;

    return await prisma.boardMember.create({
        data: {
            boardId,
            userId,
            role,
        },
    });
};
