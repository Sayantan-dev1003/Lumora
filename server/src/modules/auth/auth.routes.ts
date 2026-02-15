import { Router } from 'express';
import * as authController from './auth.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { validateRequest } from '../../middlewares/validate.middleware';
import { signupSchema, loginSchema } from '../../validators/auth.schema';
import { authLimiter } from '../../middlewares/rateLimit.middleware';

const router = Router();

router.post('/signup', authLimiter, validateRequest(signupSchema), authController.signup);
router.post('/login', authLimiter, validateRequest(loginSchema), authController.login);
router.post('/logout', authController.logout);
router.get('/me', authMiddleware, authController.getMe);

export default router;
