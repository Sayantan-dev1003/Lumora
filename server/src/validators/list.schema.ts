import { z } from "zod";
import { uuidSchema } from "./common.schema";

export const createListSchema = z.object({
    body: z.object({
        title: z.string().min(1, { message: "Title is required" }).max(255),
        boardId: uuidSchema,
        position: z.number().optional(),
    }),
});

export const updateListSchema = z.object({
    params: z.object({
        id: uuidSchema,
    }),
    body: z.object({
        title: z.string().min(1).max(255).optional(),
        position: z.number().optional(),
    }),
});

export const reorderListSchema = z.object({
    body: z.object({
        boardId: uuidSchema,
        listIds: z.array(uuidSchema),
    }),
});
