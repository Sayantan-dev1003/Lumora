import { z } from "zod";

export const paginationSchema = z.object({
    page: z.preprocess(
        (val) => val ? parseInt(String(val), 10) : 1,
        z.number().min(1).default(1).optional()
    ),
    limit: z.preprocess(
        (val) => val ? parseInt(String(val), 10) : 10,
        z.number().min(1).max(100).default(10).optional()
    ),
});

// Relax UUID validation - let DB handle non-existent IDs
// This allows invalid UUIDs to pass validation and reach the controller
// where DB queries will return null and trigger a 404 response
export const idParamSchema = z.object({
    id: z.string().min(1, "ID is required")
});

// Keep uuidSchema for backward compatibility with existing validators
// Uses relaxed validation to allow DB to handle non-existent IDs
export const uuidSchema = z.string().min(1, "ID is required");
