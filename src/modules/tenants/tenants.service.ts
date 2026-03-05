import crypto from 'node:crypto';
import { eq, sql, and, isNull, isNotNull } from 'drizzle-orm';
import { db } from '@/db/db.js';
import { tenants, users, userInvitations } from '@/db/schema.js';
import { env } from '@/config/env.js';
import { sendInvitationEmail } from '@/lib/email.js';
import type { CreateTenantInput, UpdateTenantInput, CreateInvitationInput } from './tenants.schemas.js';

export async function getTenantsService(page: number, limit: number, includeDeleted = false): Promise<{ data: typeof tenants.$inferSelect[]; total: number }> {
  const offset = (page - 1) * limit;
  const whereClause = includeDeleted ? isNotNull(tenants.deletedAt) : isNull(tenants.deletedAt);

  const data = await db.query.tenants.findMany({
    where: whereClause,
    orderBy: (t, { asc }) => asc(t.name),
    limit,
    offset,
  });

  const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(tenants).where(whereClause);
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
  const [deleted] = await db
    .update(tenants)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(tenants.id, id))
    .returning({ id: tenants.id });
  return !!deleted;
}

export async function restoreTenant(id: string): Promise<boolean> {
  const [restored] = await db
    .update(tenants)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(and(eq(tenants.id, id), isNotNull(tenants.deletedAt)))
    .returning({ id: tenants.id });
  return !!restored;
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


export async function getInvitations(tenantId: string): Promise<typeof userInvitations.$inferSelect[]> {
  const invites = await db.query.userInvitations.findMany({
    where: eq(userInvitations.tenantId, tenantId),
  });
  return invites;
}

export async function deleteInvitation(tenantId: string, invitationId: string): Promise<boolean> {
  const result = await db.delete(userInvitations).where(
    and(
      eq(userInvitations.id, invitationId),
      eq(userInvitations.tenantId, tenantId)
    )
  ).returning();
  return result.length > 0;
}

export async function resendInvitation(tenantId: string, invitationId: string): Promise<void> {
  const invitation = await db.query.userInvitations.findFirst({
    where: and(
      eq(userInvitations.id, invitationId),
      eq(userInvitations.tenantId, tenantId)
    ),
  });

  if (!invitation) throw new Error('INVITATION_NOT_FOUND');
  
  const tenant = await db.query.tenants.findFirst({ where: eq(tenants.id, tenantId) });
  if (!tenant) throw new Error('TENANT_NOT_FOUND');

  const inviteUrl = `${env.APP_URL}/accept-invite?token=${invitation.token}`;
  await sendInvitationEmail(invitation.email, tenant.name, inviteUrl);
}

export async function getTenantBySlugService(slug: string): Promise<typeof tenants.$inferSelect | null> {
  const tenant = await db.query.tenants.findFirst({
    where: and(eq(tenants.slug, slug), isNull(tenants.deletedAt)),
  });
  return tenant ?? null;
}

