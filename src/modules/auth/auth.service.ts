import crypto from 'node:crypto';
import { eq, lt, and, inArray, isNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '@/db/db.js';
import { users, tenants, refreshTokens, passwordResetTokens, userInvitations } from '@/db/schema.js';
import { env } from '@/config/env.js';
import { sendPasswordResetEmail } from '@/lib/email.js';
import type { LoginInput, SelectTenantInput, ChangePasswordInput, ForgotPasswordInput, ResetPasswordInput, AcceptInviteInput, RegisterTenantInput } from './auth.schemas.js';

function parseDuration(str: string): number {
  const units: Record<string, number> = { s: 1e3, m: 6e4, h: 36e5, d: 864e5 };
  const m = str.match(/^(\d+)([smhd])$/);
  if (!m) throw new Error(`Invalid duration: ${str}`);
  return parseInt(m[1]!) * units[m[2]!]!;
}

export async function meService(userId: string): Promise<Omit<typeof users.$inferSelect, 'passwordHash'> | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { passwordHash: false },
  });
  return user ?? null;
}

export async function loginService(
  input: LoginInput,
  context?: { ipAddress?: string; userAgent?: string }
): Promise<{ 
  accessToken: string; 
  refreshToken: string; 
  user: {
    id: string;
    email: string;
    name: string;
    role: 'SUPERADMIN' | 'OWNER' | 'STAFF';
    tenantId: string | null;
    isActive: boolean;
    avatarUrl: string | null;
  } 
}> {
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, input.email), isNull(users.deletedAt)),
  });

  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  if (!user.isActive) throw new Error('USER_DISABLED');

  // Limpiar tokens expirados
  await db.delete(refreshTokens).where(
    and(
      eq(refreshTokens.userId, user.id),
      lt(refreshTokens.expiresAt, new Date())
    )
  );

  // Limitar a máximo 3 dispositivos activos por usuario
  const activeTokens = await db.query.refreshTokens.findMany({
    where: eq(refreshTokens.userId, user.id),
    orderBy: (refreshTokens, { desc }) => [desc(refreshTokens.createdAt)],
  });

  if (activeTokens.length >= 3) {
    // Si ya hay 3 (o más) activos, borramos los más viejos, dejamos solo los 2 más recientes
    const tokensToDelete = activeTokens.slice(2).map((t) => t.id);
    await db.delete(refreshTokens).where(inArray(refreshTokens.id, tokensToDelete));
  }

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN));

  await db.insert(refreshTokens).values({
    userId: user.id,
    token: refreshToken,
    expiresAt,
    ipAddress: context?.ipAddress,
    userAgent: context?.userAgent,
  });

  return { 
    accessToken, 
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'SUPERADMIN' | 'OWNER' | 'STAFF',
      tenantId: user.tenantId,
      isActive: user.isActive,
      avatarUrl: user.avatarUrl
    }
  };
}

export async function refreshService(token: string): Promise<{ accessToken: string }> {
  const stored = await db.query.refreshTokens.findFirst({
    where: eq(refreshTokens.token, token),
  });

  if (!stored) throw new Error('INVALID_REFRESH_TOKEN');

  if (stored.expiresAt < new Date()) {
    await db.delete(refreshTokens).where(eq(refreshTokens.id, stored.id));
    throw new Error('REFRESH_TOKEN_EXPIRED');
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, stored.userId),
  });

  if (!user?.isActive) throw new Error('USER_DISABLED');

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return { accessToken };
}

export async function logoutService(token: string): Promise<void> {
  await db.delete(refreshTokens).where(eq(refreshTokens.token, token));
}

export async function selectTenantService(
  callerId: string,
  callerEmail: string,
  input: SelectTenantInput
): Promise<{ token: string }> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, input.tenantId),
  });

  if (!tenant) throw new Error('TENANT_NOT_FOUND');

  const token = jwt.sign(
    { sub: callerId, email: callerEmail, role: 'SUPERADMIN', tenantId: tenant.id, impersonating: true },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return { token };
}

export async function changePasswordService(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });

  if (!user) throw new Error('USER_NOT_FOUND');

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const newHash = await bcrypt.hash(input.newPassword, 10);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));
}

export async function forgotPasswordService(input: ForgotPasswordInput): Promise<void> {
  const user = await db.query.users.findFirst({ where: eq(users.email, input.email) });

  // Always return success — never reveal if email exists
  if (!user || !user.isActive) return;

  // Invalidate any existing reset token for this user
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, user.id));

  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await db.insert(passwordResetTokens).values({ userId: user.id, token, expiresAt });

  const resetUrl = `${env.APP_URL}/reset-password?token=${token}`;
  await sendPasswordResetEmail(user.email, resetUrl);
}

export async function resetPasswordService(input: ResetPasswordInput): Promise<void> {
  const stored = await db.query.passwordResetTokens.findFirst({
    where: eq(passwordResetTokens.token, input.token),
  });

  if (!stored) throw new Error('INVALID_RESET_TOKEN');

  if (stored.expiresAt < new Date()) {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, stored.id));
    throw new Error('RESET_TOKEN_EXPIRED');
  }

  const newHash = await bcrypt.hash(input.password, 10);
  await db.update(users)
    .set({ passwordHash: newHash, updatedAt: new Date() })
    .where(eq(users.id, stored.userId));

  // Delete used token
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.id, stored.id));

  // Invalidate all sessions (security: force re-login)
  await db.delete(refreshTokens).where(eq(refreshTokens.userId, stored.userId));
}

export async function acceptInviteService(input: AcceptInviteInput): Promise<void> {
  const invitation = await db.query.userInvitations.findFirst({
    where: eq(userInvitations.token, input.token),
  });

  if (!invitation) throw new Error('INVALID_INVITE_TOKEN');
  if (invitation.expiresAt < new Date()) {
    await db.delete(userInvitations).where(eq(userInvitations.id, invitation.id));
    throw new Error('INVITE_TOKEN_EXPIRED');
  }

  const existingUser = await db.query.users.findFirst({ where: eq(users.email, invitation.email) });
  if (existingUser) throw new Error('USER_ALREADY_EXISTS');

  const passwordHash = await bcrypt.hash(input.password, 10);

  await db.insert(users).values({
    email: invitation.email,
    passwordHash,
    name: input.name,
    role: invitation.role,
    tenantId: invitation.tenantId,
  });

  await db.delete(userInvitations).where(eq(userInvitations.id, invitation.id));
}

export async function registerTenantService(input: RegisterTenantInput): Promise<{ user: typeof users.$inferSelect; tenant: typeof tenants.$inferSelect }> {
  const existingTenant = await db.query.tenants.findFirst({ where: eq(tenants.slug, input.tenantSlug) });
  if (existingTenant) throw new Error('TENANT_SLUG_TAKEN');

  const existingUser = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (existingUser) throw new Error('USER_ALREADY_EXISTS');

  const passwordHash = await bcrypt.hash(input.password, 10);

  return await db.transaction(async (tx) => {
    const [tenant] = await tx.insert(tenants).values({
      name: input.tenantName,
      slug: input.tenantSlug,
    }).returning();

    const [user] = await tx.insert(users).values({
      email: input.email,
      name: input.userName,
      passwordHash,
      role: 'OWNER',
      tenantId: tenant!.id,
    }).returning();

    return { user: user!, tenant: tenant! };
  });
}
