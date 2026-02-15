import { z } from "zod";

export const paginationSchema = z.object({
    page: z.preprocess((val) => parseInt(String(val), 10), z.number().min(1).default(1)),
    limit: z.preprocess((val) => parseInt(String(val), 10), z.number().min(1).max(100).default(20)),
});

export const uuidSchema = z.string().uuid({ message: "Invalid UUID format" });
