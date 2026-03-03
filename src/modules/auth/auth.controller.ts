import type { Request, Response } from 'express';
import { loginSchema, selectTenantSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema, acceptInviteSchema, registerTenantSchema } from './auth.schemas.js';
import {
  loginService,
  meService,
  selectTenantService,
  changePasswordService,
  refreshService,
  logoutService,
  forgotPasswordService,
  resetPasswordService,
  acceptInviteService,
  registerTenantService,
} from './auth.service.js';
import { env } from '@/config/env.js';

const REFRESH_COOKIE_NAME = 'refreshToken';

const cookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  maxAge: 30 * 24 * 60 * 60 * 1000, // 30d in ms
};

export async function loginController(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    const context = {
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.headers['user-agent'],
    };

    const { accessToken, refreshToken, user } = await loginService(parsed.data, context);
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
    res.json({ accessToken, refreshToken, user });
  } catch (err) {
    if (err instanceof Error && ['INVALID_CREDENTIALS', 'USER_DISABLED'].includes(err.message)) {
      res.status(401).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function acceptInviteController(req: Request, res: Response): Promise<void> {
  const parsed = acceptInviteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    await acceptInviteService(parsed.data);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_INVITE_TOKEN') {
        res.status(400).json({ error: 'INVALID_INVITE_TOKEN' });
        return;
      }
      if (err.message === 'INVITE_TOKEN_EXPIRED') {
        res.status(400).json({ error: 'INVITE_TOKEN_EXPIRED' });
        return;
      }
      if (err.message === 'USER_ALREADY_EXISTS') {
        res.status(409).json({ error: 'USER_ALREADY_EXISTS' });
        return;
      }
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function forgotPasswordController(req: Request, res: Response): Promise<void> {
  const parsed = forgotPasswordSchema.safeParse(req.body);
  console.log("FORGOT CONTROLLER ---> ", parsed)
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    await forgotPasswordService(parsed.data);
    // Always return success to avoid email enumeration
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function resetPasswordController(req: Request, res: Response): Promise<void> {
  const parsed = resetPasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    await resetPasswordService(parsed.data);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof Error && ['INVALID_RESET_TOKEN', 'RESET_TOKEN_EXPIRED'].includes(err.message)) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function refreshController(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

  if (!token) {
    res.status(401).json({ error: 'MISSING_REFRESH_TOKEN' });
    return;
  }

  try {
    const { accessToken } = await refreshService(token);
    res.json({ accessToken });
  } catch (err) {
    res.clearCookie(REFRESH_COOKIE_NAME);
    if (err instanceof Error && ['INVALID_REFRESH_TOKEN', 'REFRESH_TOKEN_EXPIRED', 'USER_DISABLED'].includes(err.message)) {
      res.status(401).json({ error: err.message });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function logoutController(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE_NAME] as string | undefined;

  if (token) {
    try {
      await logoutService(token);
    } catch {
      // Silent — siempre limpiamos la cookie
    }
  }

  res.clearCookie(REFRESH_COOKIE_NAME);
  res.json({ success: true });
}

export async function meController(req: Request, res: Response): Promise<void> {
  const userId = req.user?.sub;

  if (!userId) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  try {
    const user = await meService(userId);
    if (!user) {
      res.status(404).json({ error: 'USER_NOT_FOUND' });
      return;
    }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function selectTenantController(req: Request, res: Response): Promise<void> {
  const parsed = selectTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await selectTenantService(req.user!.sub, req.user!.email, parsed.data);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'TENANT_NOT_FOUND') {
      res.status(404).json({ error: 'TENANT_NOT_FOUND' });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function changePasswordController(req: Request, res: Response): Promise<void> {
  const parsed = changePasswordSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    await changePasswordService(req.user!.sub, parsed.data);
    res.json({ success: true });
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function registerTenantController(req: Request, res: Response): Promise<void> {
  const parsed = registerTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    const { user, tenant } = await registerTenantService(parsed.data);
    res.status(201).json({
      message: 'Tenant and User created successfully',
      tenantId: tenant.id,
      userId: user.id
    });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'TENANT_SLUG_TAKEN') {
        res.status(409).json({ error: 'TENANT_SLUG_TAKEN' });
        return;
      }
      if (err.message === 'USER_ALREADY_EXISTS') {
        res.status(409).json({ error: 'USER_ALREADY_EXISTS' });
        return;
      }
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
