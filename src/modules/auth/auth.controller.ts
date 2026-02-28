import type { Request, Response } from 'express';
import { loginSchema, selectTenantSchema, changePasswordSchema } from './auth.schemas.js';
import { loginService, meService, selectTenantService, changePasswordService } from './auth.service.js';

export async function loginController(req: Request, res: Response): Promise<void> {
  const parsed = loginSchema.safeParse(req.body);
  
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    const result = await loginService(parsed.data);
    res.json(result);
  } catch (err) {
    if (err instanceof Error && err.message === 'INVALID_CREDENTIALS') {
      res.status(401).json({ error: 'INVALID_CREDENTIALS' });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
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
