import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.schema";

export const createTaskSchema = z.object({
    body: z.object({
        title: z.string().min(1, { message: "Title is required" }).max(255),
        description: z.string().optional(),
        listId: uuidSchema,
        position: z.number().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        dueDate: z.string().datetime().optional().nullable(),
        assignedUserId: uuidSchema.optional().nullable(),
    }),
});

export const updateTaskSchema = z.object({
    params: z.object({
        id: uuidSchema,
    }),
    body: z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional(),
        position: z.number().optional(),
        priority: z.enum(["LOW", "MEDIUM", "HIGH"]).optional(),
        dueDate: z.string().datetime().optional().nullable(),
        listId: uuidSchema.optional(), // For moving tasks between lists
        assignedUserId: uuidSchema.optional().nullable(),
    }),
});

export const reorderTaskSchema = z.object({
    body: z.object({
        listId: uuidSchema,
        taskIds: z.array(uuidSchema),
    }),
});

export const searchTaskSchema = z.object({
    query: paginationSchema.extend({
        search: z.string().optional(),
        boardId: uuidSchema,
    }),
});
