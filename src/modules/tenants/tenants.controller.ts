import type { Request, Response } from 'express';
import { createTenantSchema, updateTenantSchema, createInvitationSchema } from './tenants.schemas.js';
import { getTenantsService, setActiveTenant, createTenant, updateTenant, deleteTenant, restoreTenant, createInvitation, getInvitations, deleteInvitation, resendInvitation, getTenantBySlugService } from './tenants.service.js';
import { getPaginationParams, formatPaginatedResponse } from '@/lib/pagination.js';
import { db } from '@/db/db.js';
import { eq } from 'drizzle-orm';
import { tenants } from '@/db/schema.js';

export async function getTenantsController(req: Request, res: Response): Promise<void> {
  try {
    const { page, limit } = getPaginationParams(req.query as Record<string, unknown>);
    const includeDeleted = req.query['trash'] === 'true';
    const { data, total } = await getTenantsService(page, limit, includeDeleted);
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

export async function updateMyTenantController(req: Request, res: Response): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: 'FORBIDDEN_NO_TENANT' });
    return;
  }

  const parsed = updateTenantSchema.partial().safeParse(req.body); // Allow partial updates
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    const tenant = await updateTenant(tenantId, parsed.data);
    res.json(tenant);
  } catch (error) {
    console.error("Error updating own tenant:", error);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function getMyTenantController(req: Request, res: Response): Promise<void> {
  const tenantId = req.user?.tenantId;
  if (!tenantId) {
    res.status(403).json({ error: 'FORBIDDEN_NO_TENANT' });
    return;
  }

  try {
    const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
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

export async function restoreTenantController(req: Request, res: Response): Promise<void> {
  try {
    const restored = await restoreTenant(String(req.params['id']));
    if (!restored) { res.status(404).json({ error: 'TENANT_NOT_FOUND' }); return; }
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function createInvitationController(req: Request, res: Response): Promise<void> {
  const parsed = createInvitationSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    return;
  }

  try {
    const callerRole = req.user?.role ?? '';
    const callerTenantId = req.user?.tenantId ?? null;
    
    await createInvitation(String(req.params['id']), callerRole, callerTenantId, parsed.data);
    res.json({ success: true });
  }  catch (err) {
    if (err instanceof Error) {
      if (err.message === 'FORBIDDEN') {
        res.status(403).json({ error: 'FORBIDDEN' });
        return;
      }
      if (err.message === 'TENANT_NOT_FOUND') {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
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

export async function getInvitationsController(req: Request, res: Response): Promise<void> {
  try {
    const invites = await getInvitations(String(req.params['id']));
    res.json(invites);
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function deleteInvitationController(req: Request, res: Response): Promise<void> {
  try {
    const deleted = await deleteInvitation(String(req.params['id']), String(req.params['invitationId']));
    if (!deleted) {
      res.status(404).json({ error: 'INVITATION_NOT_FOUND' });
      return;
    }
    res.status(204).send();
  } catch {
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function resendInvitationController(req: Request, res: Response): Promise<void> {
  try {
    await resendInvitation(String(req.params['id']), String(req.params['invitationId']));
    res.json({ success: true });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVITATION_NOT_FOUND') {
        res.status(404).json({ error: 'INVITATION_NOT_FOUND' });
        return;
      }
      if (err.message === 'TENANT_NOT_FOUND') {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
        return;
      }
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function getTenantBySlugController(req: Request, res: Response): Promise<void> {
  try {
    const slug = String(req.params['slug']);
    if (!slug) {
      res.status(400).json({ error: 'SLUG_REQUIRED' });
      return;
    }

    const tenant = await getTenantBySlugService(slug);
    
    if (!tenant || !tenant.isActive) {
      res.status(404).json({ error: 'TENANT_NOT_FOUND' });
      return;
    }

    // Retornamos solo datos públicos
    res.json({
      id: tenant.id,
      name: tenant.name,
      slug: tenant.slug,
      logoUrl: tenant.logoUrl,
      settings: tenant.settings,
    });
  } catch (error) {
    console.error("Error fetching tenant by slug:", error);
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
