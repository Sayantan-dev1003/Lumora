import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';

// Extend Express Request interface to include userId
declare global {
    namespace Express {
        interface Request {
            userId?: string;
        }
    }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const token = req.cookies.token;

    if (!token) {
        res.status(401).json({
            success: false,
            message: 'Unauthorized: No token provided',
        });
        return;
    }

    const decoded = verifyToken(token);

    if (!decoded) {
        res.status(401).json({
            success: false,
            message: 'Unauthorized: Invalid token',
        });
        return;
    }

    req.userId = decoded.userId;
    next();
};
