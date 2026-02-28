import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '@/db/db.js';
import { users, tenants, refreshTokens } from '@/db/schema.js';
import { env } from '@/config/env.js';
import type { LoginInput, SelectTenantInput, ChangePasswordInput } from './auth.schemas.js';

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

export async function loginService(input: LoginInput): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  if (!user.isActive) throw new Error('USER_DISABLED');

  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  const refreshToken = crypto.randomBytes(64).toString('hex');
  const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN));

  await db.insert(refreshTokens).values({ userId: user.id, token: refreshToken, expiresAt });

  return { accessToken, refreshToken };
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
