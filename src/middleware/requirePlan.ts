import type { Request, Response, NextFunction } from 'express';
import { db } from '@/db/db.js';
import { tenants } from '@/db/schema.js';
import { eq } from 'drizzle-orm';

const PLAN_HIERARCHY = ['free', 'pro', 'enterprise'];

export function requirePlan(minimumPlan: 'free' | 'pro' | 'enterprise') {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.tenantId) {
      res.status(401).json({ error: 'UNAUTHORIZED' });
      return;
    }

    try {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, req.user.tenantId),
        columns: { plan: true },
      });

      if (!tenant) {
        res.status(404).json({ error: 'TENANT_NOT_FOUND' });
        return;
      }

      const tenantPlanIndex = PLAN_HIERARCHY.indexOf(tenant.plan);
      const requiredPlanIndex = PLAN_HIERARCHY.indexOf(minimumPlan);

      if (tenantPlanIndex < requiredPlanIndex) {
        res.status(402).json({ error: 'UPGRADE_REQUIRED', requiredPlan: minimumPlan });
        return;
      }

      next();
    } catch {
      res.status(500).json({ error: 'INTERNAL_ERROR' });
    }
  };
}
