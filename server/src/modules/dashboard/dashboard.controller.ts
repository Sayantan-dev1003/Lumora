import { Request, Response, NextFunction } from "express";
import prisma from "../../config/db";
import { successResponse, errorResponse } from "../../utils/response.helper";

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;

        // Total Boards
        const totalBoards = await prisma.board.count({
            where: {
                members: { some: { userId } }
            }
        });

        // Total Tasks (Created by me OR Assigned to me)
        // Total Tasks (Created by me OR Assigned to me / All tasks)
        const totalTasks = await prisma.task.count({
            where: {
                OR: [
                    { creatorId: userId },
                    { assignedUserId: userId }
                ]
            }
        });

        // Completed Tasks (Created by me OR Assigned to me, AND isCompleted is true)
        const completedTasks = await prisma.task.count({
            where: {
                status: "DONE",
                OR: [
                    { creatorId: userId },
                    { assignedUserId: userId }
                ]
            }
        });

        // Active Tasks (Created by me OR Assigned to me, AND isCompleted is false)
        const activeTasks = await prisma.task.count({
            where: {
                status: { not: "DONE" },
                OR: [
                    { creatorId: userId },
                    { assignedUserId: userId }
                ]
            }
        });

        // Recent Activity (Only my activities, max 3)
        const recentActivity = await prisma.activity.findMany({
            where: { userId },
            take: 3,
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                board: {
                    select: { title: true }
                }
            }
        });

        return successResponse(res, {
            stats: {
                totalBoards,
                totalTasks,
                completedTasks,
                activeTasks
            },
            recentActivity
        }, "Dashboard stats fetched successfully");

    } catch (error) {
        next(error);
    }
};
