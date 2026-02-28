import { eq } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '@/db/db.js';
import { users, tenants } from '@/db/schema.js';
import { env } from '@/config/env.js';
import type { LoginInput, SelectTenantInput, ChangePasswordInput } from './auth.schemas.js';

export async function meService(userId: string): Promise<Omit<typeof users.$inferSelect, 'passwordHash'> | null> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: {
      passwordHash: false,
    },
  });

  return user ?? null;
}

export async function loginService(input: LoginInput): Promise<{ token: string }> {
  const user = await db.query.users.findFirst({
    where: eq(users.email, input.email),
  });

  if (!user) throw new Error('INVALID_CREDENTIALS');

  const valid = await bcrypt.compare(input.password, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, tenantId: user.tenantId },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return { token };
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
    {
      sub: callerId,
      email: callerEmail,
      role: 'SUPERADMIN',
      tenantId: tenant.id,
      impersonating: true,
    },
    env.JWT_SECRET,
    { expiresIn: env.JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return { token };
}

export async function changePasswordService(userId: string, input: ChangePasswordInput): Promise<void> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const valid = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!valid) throw new Error('INVALID_CREDENTIALS');

  const newHash = await bcrypt.hash(input.newPassword, 10);
  await db.update(users).set({ passwordHash: newHash, updatedAt: new Date() }).where(eq(users.id, userId));
}
