import { Request, Response, NextFunction } from "express";
import prisma from "../../config/db";
import { successResponse, errorResponse } from "../../utils/response.helper";

export const getDashboardStats = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.userId!;

        // 1. Total Boards
        const totalBoards = await prisma.board.count({
            where: {
                members: { some: { userId } }
            }
        });

        // 2. Total Tasks (Created by me OR Assigned to me)
        const totalTasks = await prisma.task.count({
            where: {
                OR: [
                    { creatorId: userId },
                    { assignedUserId: userId }
                ]
            }
        });

        // 4. Tasks Assigned to Me (All tasks assigned to current user)
        const assignedToMe = await prisma.task.count({
            where: { assignedUserId: userId }
        });

        // 5. Active Tasks (Assigned to me AND Not in "Done" lists)
        const completed = await prisma.task.count({
            where: {
                assignedUserId: userId,
                list: {
                    title: { in: ["Done", "Completed", "Finished", "Complete"] }
                }
            }
        });
        const activeTasks = assignedToMe - completed;

        // 8. Recent Activity (Only my activities, max 3)
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
                assignedToMe,
                activeTasks
            },
            recentActivity
        }, "Dashboard stats fetched successfully");

    } catch (error) {
        next(error);
    }
};
