import { z } from "zod";
import { uuidSchema, paginationSchema } from "./common.schema";

export const createBoardSchema = z.object({
    body: z.object({
        title: z.string().min(1, { message: "Title is required" }).max(255),
        description: z.string().max(1000).optional(),
    }),
});

export const getBoardsSchema = z.object({
    query: paginationSchema.extend({
        type: z.enum(['created', 'member', 'all']).optional(),
    }),
});

export const updateBoardSchema = z.object({
    params: z.object({
        id: uuidSchema,
    }),
    body: z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(1000).optional(),
    }),
});

export const boardIdSchema = z.object({
    params: z.object({
        id: uuidSchema,
    }),
});
