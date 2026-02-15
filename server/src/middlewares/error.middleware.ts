import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { logger } from "../utils/logger";
import { errorResponse } from "../utils/response.helper";

interface AppError extends Error {
    statusCode?: number;
    code?: string;
}

export const errorHandler = (
    err: AppError,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const statusCode = err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Structured logging
    logger.error(message, {
        path: req.path,
        method: req.method,
        userId: req.userId,
        stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
        code: err.code, // Log Prisma error code if present
        statusCode
    });

    // Handle Prisma Errors
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
        if (err.code === 'P2002') {
            return errorResponse(res, "Unique constraint violation. A record with this value already exists.", 409);
        }
        if (err.code === 'P2025') {
            return errorResponse(res, "Record not found.", 404);
        }
    }

    // Handle Zod Validation Errors
    if (err instanceof ZodError) {
        const issues = (err as any).errors.map((e: any) => `${e.path.join('.')}: ${e.message}`).join(', ');
        return errorResponse(res, `Validation Error: ${issues}`, 400);
    }

    // Handle JWT Errors
    if (err.name === 'JsonWebTokenError') {
        return errorResponse(res, "Invalid token", 401);
    }
    if (err.name === 'TokenExpiredError') {
        return errorResponse(res, "Token expired", 401);
    }

    // Default Error Response
    // Don't expose internal server error details in production unless it's a known operational error (indicated by statusCode != 500)
    const clientMessage = statusCode === 500 && process.env.NODE_ENV === 'production'
        ? "Internal Server Error"
        : message;

    return errorResponse(res, clientMessage, statusCode);
};
