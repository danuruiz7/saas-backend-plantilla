import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/db.js';
import { tenants } from '@/db/schema.js';
import type { CreateTenantInput, UpdateTenantInput } from './tenants.schemas.js';

export async function getTenantsService(page: number, limit: number): Promise<{ data: typeof tenants.$inferSelect[]; total: number }> {
  const offset = (page - 1) * limit;

  const data = await db.query.tenants.findMany({
    orderBy: (t, { asc }) => asc(t.name),
    limit,
    offset,
  });

  const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(tenants);
  const total = Number(countRes?.count ?? 0);

  return { data, total };
}


export async function createTenant(input: CreateTenantInput): Promise<typeof tenants.$inferSelect> {
  const [tenant] = await db.insert(tenants).values(input).returning();
  if (!tenant) throw new Error('CREATE_FAILED');
  return tenant;
}

export async function updateTenant(id: string, input: UpdateTenantInput): Promise<typeof tenants.$inferSelect | null> {
  const [tenant] = await db
    .update(tenants)
    .set({ ...input, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning();
  return tenant ?? null;
}

export async function deleteTenant(id: string): Promise<boolean> {
  const [deleted] = await db.delete(tenants).where(eq(tenants.id, id)).returning({ id: tenants.id });
  return !!deleted;
}

export async function setActiveTenant(id: string, isActive: boolean): Promise<boolean> {
  const [updated] = await db
    .update(tenants)
    .set({ isActive, updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning({ id: tenants.id });

  return !!updated;
}


