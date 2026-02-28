import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import { env } from '@/config/env.js';
import { db } from '@/db/db.js';
import { users, tenants } from '@/db/schema.js';

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;

  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'UNAUTHORIZED' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as {
      sub: string;
      email: string;
      role: string;
      tenantId: string | null;
      impersonating?: boolean;
    };

    // Verificar usuario activo
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.sub),
      columns: { isActive: true },
    });

    if (!user?.isActive) {
      res.status(403).json({ error: 'USER_DISABLED' });
      return;
    }

    // Verificar tenant activo (si aplica)
    if (payload.tenantId) {
      const tenant = await db.query.tenants.findFirst({
        where: eq(tenants.id, payload.tenantId),
        columns: { isActive: true },
      });

      if (!tenant?.isActive) {
        res.status(403).json({ error: 'TENANT_DISABLED' });
        return;
      }
    }

    req.user = payload;
    next();
  } catch {
    res.status(401).json({ error: 'INVALID_TOKEN' });
  }
}

