import crypto from 'node:crypto';
import { eq, sql } from 'drizzle-orm';
import { db } from '@/db/db.js';
import { tenants, users, userInvitations } from '@/db/schema.js';
import { env } from '@/config/env.js';
import { sendInvitationEmail } from '@/lib/email.js';
import type { CreateTenantInput, UpdateTenantInput, CreateInvitationInput } from './tenants.schemas.js';

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

export async function createInvitation(tenantId: string, callerRole: string, callerTenantId: string | null, input: CreateInvitationInput): Promise<void> {
  if (callerRole !== 'SUPERADMIN' && !(callerRole === 'OWNER' && callerTenantId === tenantId)) {
    throw new Error('FORBIDDEN');
  }

  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) throw new Error('TENANT_NOT_FOUND');

  const existingUser = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existingUser) throw new Error('USER_ALREADY_EXISTS');

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  await db.insert(userInvitations).values({
    tenantId,
    email: input.email,
    token,
    role: input.role,
    expiresAt,
  });

  const inviteUrl = `${env.APP_URL}/accept-invite?token=${token}`;
  await sendInvitationEmail(input.email, tenant.name, inviteUrl);
}


