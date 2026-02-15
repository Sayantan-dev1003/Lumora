import { Request, Response, NextFunction } from "express";
import { ZodError, ZodType, ZodIssue } from "zod";

export const validateRequest = (schema: ZodType<any>) => async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });
        next();
    } catch (error) {
        if (error instanceof ZodError) {
            res.status(400).json({
                success: false,
                message: "Validation Error",
                errors: error.issues.map((e: ZodIssue) => ({
                    field: e.path.join("."),
                    message: e.message,
                })),
            });
            return;
        }
        next(error);
    }
};
