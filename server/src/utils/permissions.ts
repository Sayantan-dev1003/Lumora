import { Task, BoardMember } from "@prisma/client";

/**
 * Checks if a user can view a specific task.
 * Addmins can view all tasks.
 * Members can view tasks assigned to them OR created by them.
 */
export const canViewTask = (task: Task, userId: string, role: string): boolean => {
    if (role === "admin") return true;
    return task.assignedUserId === userId || task.creatorId === userId;
};

/**
 * Checks if a user can edit a specific task.
 * Admins can edit all tasks.
 * Members can edit tasks they created.
 * Members can also edit tasks assigned to them.
 * Members can edit unassigned tasks.
 */
export const canEditTask = (task: Task, userId: string, role: string): boolean => {
    if (role === "admin") return true;
    if (role === "member" && task.creatorId === userId) return true;
    if (role === "member" && task.assignedUserId === userId) return true;
    if (role === "member" && !task.assignedUserId) return true;
    return false;
};

/**
 * Checks if a user can modify board structure (create/delete lists, delete board).
 * Only Admins can do this.
 */
export const canModifyBoardStructure = (role: string): boolean => {
    return role === "admin";
};
