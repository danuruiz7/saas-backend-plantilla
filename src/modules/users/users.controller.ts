import type { Request, Response } from 'express';
import { createUserSchema, updateUserSchema } from './users.schemas.js';
import { getUsers, getUserById, createUser, updateUser, deleteUser, setActiveUser, restoreUser } from './users.service.js';
import { getPaginationParams, formatPaginatedResponse } from '@/lib/pagination.js';

export async function getUsersController(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
    const includeDeleted = req.query['trash'] === 'true';
    const search = req.query['search'] as string | undefined;
    const role = req.query['role'] as string | undefined;
    const status = req.query['status'] as string | undefined;
    
    const { data, total } = await getUsers(req.user!.role, req.user!.tenantId, page, limit, search, role, status, includeDeleted);
    res.json(formatPaginatedResponse(data, total, page, limit));
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function getUserByIdController(req: Request, res: Response): Promise<void> {
  try {
    const user = await getUserById(String(req.params['id']), req.user!.role, req.user!.tenantId);
    if (!user) { res.status(404).json({ error: 'USER_NOT_FOUND' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function createUserController(req: Request, res: Response): Promise<void> {
  const parsed = createUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }); return; }

  try {
    const user = await createUser(parsed.data, req.user!.role, req.user!.tenantId);
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof Error && err.message === 'CREATE_FAILED') { res.status(500).json({ error: 'CREATE_FAILED' }); return; }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function updateUserController(req: Request, res: Response): Promise<void> {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }); return; }

  try {
    const user = await updateUser(String(req.params['id']), parsed.data, req.user!.role, req.user!.tenantId);
    if (!user) { res.status(404).json({ error: 'USER_NOT_FOUND' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function deleteUserController(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await deleteUser(String(req.params['id']), req.user!.role, req.user!.tenantId);
    if (!deleted) { res.status(404).json({ error: 'USER_NOT_FOUND' }); return; }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export function setActiveUserController(isActive: boolean) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await setActiveUser(String(req.params['id']), isActive, req.user!.role, req.user!.tenantId);
      if (!updated) { res.status(404).json({ error: 'USER_NOT_FOUND' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  };
}
export async function restoreUserController(req: Request, res: Response): Promise<void> {
  try {
    const restored = await restoreUser(String(req.params['id']), req.user!.role, req.user!.tenantId);
    if (!restored) { res.status(404).json({ error: 'USER_NOT_FOUND' }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function updateProfileController(req: Request, res: Response): Promise<void> {
  const parsed = updateUserSchema.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() }); return; }

  try {
    // Current user can only update their own profile
    const userId = req.user!.sub;
    const user = await updateUser(userId, parsed.data, req.user!.role, req.user!.tenantId);
    if (!user) { res.status(404).json({ error: 'USER_NOT_FOUND' }); return; }
    res.json(user);
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
