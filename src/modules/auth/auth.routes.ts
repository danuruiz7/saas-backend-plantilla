import { Router } from 'express';
import { loginController, meController, selectTenantController, changePasswordController } from './auth.controller.js';
import { requireAuth } from '@/middleware/requireAuth.js';
import { requireRole } from '@/middleware/requireRole.js';
import { loginRateLimiter } from '@/middleware/rateLimiter.js';

export const authRouter: Router = Router();

authRouter.post('/login', loginRateLimiter, loginController);
authRouter.get('/me', requireAuth, meController);
authRouter.post('/select-tenant', requireAuth, requireRole('SUPERADMIN'), selectTenantController);
authRouter.patch('/change-password', requireAuth, changePasswordController);


