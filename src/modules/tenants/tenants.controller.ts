import type { Request, Response } from 'express';
import { createTenantSchema, updateTenantSchema } from './tenants.schemas.js';
import { getTenantsService, setActiveTenant, createTenant, updateTenant, deleteTenant } from './tenants.service.js';
import { getPaginationParams, formatPaginatedResponse } from '@/lib/pagination.js';

export async function getTenantsController(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
    const { data, total } = await getTenantsService(page, limit);
    res.json(formatPaginatedResponse(data, total, page, limit));
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function createTenantController(req: Request, res: Response): Promise<void> {
  const parsed = createTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    const tenant = await createTenant(parsed.data);
    res.status(201).json(tenant);
  } catch (err) {
    if (err instanceof Error && err.message.includes('unique constraint')) {
      res.status(409).json({ error: 'SLUG_ALREADY_EXISTS' });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function updateTenantController(req: Request, res: Response): Promise<void> {
  const parsed = updateTenantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    const tenant = await updateTenant(String(req.params['id']), parsed.data);
    if (!tenant) {
      res.status(404).json({ error: 'TENANT_NOT_FOUND' });
      return;
    }
    res.json(tenant);
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function deleteTenantController(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await deleteTenant(String(req.params['id']));
    if (!deleted) {
      res.status(404).json({ error: 'TENANT_NOT_FOUND' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export function setActiveTenantController(isActive: boolean) {
  return async (req: Request, res: Response): Promise<void> => {
    try {
      const updated = await setActiveTenant(String(req.params['id']), isActive);
      if (!updated) { res.status(404).json({ error: 'TENANT_NOT_FOUND' }); return; }
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  };
}


