import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

const COOKIE_NAME = 'token';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

export const signup = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user, token } = await authService.signup(req.body);

        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE,
        });

        res.status(201).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { user, token } = await authService.login(req.body);

        res.cookie(COOKIE_NAME, token, {
            httpOnly: true,
            secure: IS_PRODUCTION,
            sameSite: 'lax',
            maxAge: COOKIE_MAX_AGE,
        });

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};

export const logout = (req: Request, res: Response) => {
    res.clearCookie(COOKIE_NAME);
    res.status(200).json({
        success: true,
        message: 'Logged out successfully',
    });
};

export const getMe = async (req: Request, res: Response, next: NextFunction) => {
    try {
        if (!req.userId) {
            res.status(401).json({
                success: false,
                message: 'Unauthorized',
            });
            return;
        }

        const user = await authService.getUserById(req.userId);

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};
