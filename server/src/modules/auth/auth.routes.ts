import { Router } from 'express';
import * as authController from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { signupSchema, loginSchema } from '../../validators/auth.schema';
import { authLimiter } from '../../middlewares/rateLimit.middleware';

const router = Router();

// Apply auth limiter only in non-test environments
const authRateLimiter = process.env.NODE_ENV !== "test"
    ? authLimiter
    : (_req: any, _res: any, next: any) => next();

router.post('/signup', authRateLimiter, validateRequest(signupSchema), authController.signup);
router.post('/login', authRateLimiter, validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);
router.get('/users', authMiddleware, authController.searchUsers);

export default router;
