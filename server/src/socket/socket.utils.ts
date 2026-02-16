import { Server, Socket } from "socket.io";
import { getIO } from "./socket";
import prisma from "../config/db";
import { canViewTask } from "../utils/permissions";
import { Task } from "@prisma/client";

/**
 * Emits an event to a board room but filters which users receive it based on permissions.
 * This ensures data isolation even in real-time updates.
 */
export const emitToBoardSecurely = async (
    boardId: string,
    event: string,
    payload: any,
    entityType: "task" | "list" | "boardMember",
    entity: any
) => {
    const io = getIO();
    const room = io.sockets.adapter.rooms.get(boardId);

    if (!room) return;

    // Get all socket IDs in the room
    const socketIds = Array.from(room);

    // Iterate over sockets and check permissions
    // This is N+1 if we query DB for each. We should batch or cache.
    // Better: Get all participants of the board and their roles once?
    // But we need to map SocketID -> UserId.
    // socket.data.userId is available.

    // 1. Get all connected sockets in the room
    const sockets: Socket[] = [];
    const socketsMap = io.sockets.sockets;

    for (const id of socketIds) {
        const s = socketsMap.get(id);
        if (s && s.data.userId) {
            sockets.push(s);
        }
    }

    if (sockets.length === 0) return;

    // 2. Fetch roles for these users (Batch)
    const userIds = sockets.map(s => s.data.userId);
    const members = await prisma.boardMember.findMany({
        where: {
            boardId,
            userId: { in: userIds }
        }
    });

    const roleMap = new Map<string, string>(); // UserId -> Role
    members.forEach(m => roleMap.set(m.userId, m.role));

    // 3. Emit conditionally
    for (const socket of sockets) {
        const userId = socket.data.userId;
        const role = roleMap.get(userId);

        if (!role) continue; // Should not happen if they are in the room, but safe check

        let shouldEmit = false;

        if (role === "admin") {
            shouldEmit = true;
        } else {
            // Member Logic
            if (entityType === "task") {
                // Check if member can view this task
                shouldEmit = canViewTask(entity as Task, userId, role);
            } else if (entityType === "list") {
                // Lists: Members only see lists with their tasks.
                // If a list is created/updated (empty or name change), do they see it?
                // Rule: "See only lists that contain tasks assigned to them"
                // If strict: They don't see empty lists.
                // So if "list_created" (empty), they shouldn't see it.
                // If "list_updated", do they see it? Only if they can see tasks in it?
                // Simpler approach for lists: 
                // IF Payload has 'tasks' we could check. 
                // But usually list updates are Title/Position.
                // If the user already 'knows' about the list (has tasks in it), they should get updates?
                // This is hard to check stateless.
                // SECURE DEFAULT: Members DO NOT receive List updates unless we verify they have tasks in it.
                // We'd need to check DB: Does this list have tasks for this user?
                if (event === "list_created") {
                    shouldEmit = false; // Empty list
                } else {
                    // Check if they have tasks in this list
                    const count = await prisma.task.count({
                        where: {
                            listId: entity.id,
                            OR: [
                                { assignedUserId: userId },
                                { creatorId: userId }
                            ]
                        }
                    });
                    shouldEmit = count > 0;
                }
            } else if (entityType === "boardMember") {
                // Board Members additions/updates?
                // Admins see all. Members?
                // Members just see the board. Changes to other members might not be relevant/visible?
                // Let's allow members to see who is on the board? 
                // No specific restriction in prompt for BoardMember visibility, 
                // but "See full board structure" restriction might imply hiding meta-data?
                // "See only boards where they are BoardMember"
                // Let's assume safe to emit member updates (like "User X joined") so they know who they are working with?
                // Or maybe restrict. Let's restrict to be safe.
                // If I can't see the board structure, maybe getting notified about other members is leaky?
                // Let's allow it for now as it's collaboration.
                shouldEmit = true;
            }
        }

        if (shouldEmit) {
            socket.emit(event, payload);
        }
    }
};
