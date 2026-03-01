import { Router } from 'express';
import {
  loginController,
  meController,
  selectTenantController,
  changePasswordController,
  refreshController,
  logoutController,
  forgotPasswordController,
  resetPasswordController,
  acceptInviteController,
  registerTenantController,
} from './auth.controller.js';
import { requireAuth } from '@/middleware/requireAuth.js';
import { requireRole } from '@/middleware/requireRole.js';
import { loginRateLimiter } from '@/middleware/rateLimiter.js';

export const authRouter: Router = Router();

authRouter.post('/login', loginRateLimiter, loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);
authRouter.post('/forgot-password', forgotPasswordController);
authRouter.post('/reset-password', resetPasswordController);
authRouter.post('/accept-invite', acceptInviteController);
authRouter.post('/register-tenant', registerTenantController);
authRouter.get('/me', requireAuth, meController);
authRouter.post('/select-tenant', requireAuth, requireRole('SUPERADMIN'), selectTenantController);
authRouter.patch('/change-password', requireAuth, changePasswordController);
