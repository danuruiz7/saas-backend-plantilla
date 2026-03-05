import { eq, and, sql, isNull, isNotNull, ilike, or } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import { db } from '@/db/db.js';
import { users } from '@/db/schema.js';
import type { CreateUserInput, UpdateUserInput } from './users.schemas.js';

type SafeUser = Omit<typeof users.$inferSelect, 'passwordHash'>;

function isSuperAdmin(role: string): boolean {
  return role === 'SUPERADMIN';
}

export async function getUsers(
  callerRole: string,
  callerTenantId: string | null,
  page: number,
  limit: number,
  search?: string,
  role?: string,
  status?: string,
  includeDeleted = false
): Promise<{ data: SafeUser[]; total: number }> {
  const offset = (page - 1) * limit;
  
  const filters = [
    includeDeleted ? isNotNull(users.deletedAt) : isNull(users.deletedAt),
  ];

  if (!isSuperAdmin(callerRole)) {
    filters.push(eq(users.tenantId, callerTenantId!));
  }

  if (search) {
    filters.push(or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))!);
  }

  if (role) {
    filters.push(eq(users.role, role));
  }

  if (status) {
    if (status === 'ACTIVE') filters.push(eq(users.isActive, true));
    if (status === 'INACTIVE') filters.push(eq(users.isActive, false));
  }

  const whereClause = and(...filters);

  const data = await db.query.users.findMany({
    columns: { passwordHash: false },
    where: whereClause,
    limit,
    offset,
  });

  const [countRes] = await db.select({ count: sql<number>`count(*)` }).from(users).where(whereClause);
  const total = Number(countRes?.count ?? 0);

  return { data, total };
}


export async function getUserById(id: string, callerRole: string, callerTenantId: string | null): Promise<SafeUser | null> {
  const filters = [eq(users.id, id), isNull(users.deletedAt)];
  
  if (!isSuperAdmin(callerRole)) {
    filters.push(eq(users.tenantId, callerTenantId!));
  }

  const user = await db.query.users.findFirst({
    columns: { passwordHash: false },
    where: and(...filters),
  });
  return user ?? null;
}

export async function createUser(input: CreateUserInput, callerRole: string, callerTenantId: string | null): Promise<SafeUser> {
  const tenantId = isSuperAdmin(callerRole) ? (input.tenantId ?? null) : callerTenantId;
  const passwordHash = await bcrypt.hash(input.password, 10);

  const [user] = await db
    .insert(users)
    .values({ email: input.email, passwordHash, name: input.name, role: input.role, tenantId })
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, tenantId: users.tenantId, isActive: users.isActive, avatarUrl: users.avatarUrl, createdAt: users.createdAt, updatedAt: users.updatedAt, deletedAt: users.deletedAt });

  if (!user) throw new Error('CREATE_FAILED');
  return user;
}

export async function updateUser(id: string, input: UpdateUserInput, callerRole: string, callerTenantId: string | null): Promise<SafeUser | null> {
  const where = isSuperAdmin(callerRole)
    ? eq(users.id, id)
    : and(eq(users.id, id), eq(users.tenantId, callerTenantId!));

  const [user] = await db
    .update(users)
    .set({ ...input, updatedAt: new Date() })
    .where(where)
    .returning({ id: users.id, email: users.email, name: users.name, role: users.role, tenantId: users.tenantId, isActive: users.isActive, avatarUrl: users.avatarUrl, createdAt: users.createdAt, updatedAt: users.updatedAt, deletedAt: users.deletedAt });

  return user ?? null;
}

export async function deleteUser(id: string, callerRole: string, callerTenantId: string | null): Promise<boolean> {
  const where = isSuperAdmin(callerRole)
    ? and(eq(users.id, id), isNull(users.deletedAt))
    : and(eq(users.id, id), eq(users.tenantId, callerTenantId!), isNull(users.deletedAt));

  const [deleted] = await db
    .update(users)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(where)
    .returning({ id: users.id });
    
  return !!deleted;
}

export async function restoreUser(id: string, callerRole: string, callerTenantId: string | null): Promise<boolean> {
  const where = isSuperAdmin(callerRole)
    ? and(eq(users.id, id), isNotNull(users.deletedAt))
    : and(eq(users.id, id), eq(users.tenantId, callerTenantId!), isNotNull(users.deletedAt));

  const [restored] = await db
    .update(users)
    .set({ deletedAt: null, updatedAt: new Date() })
    .where(where)
    .returning({ id: users.id });

  return !!restored;
}

export async function setActiveUser(
  id: string,
  isActive: boolean,
  callerRole: string,
  callerTenantId: string | null
): Promise<boolean> {
  const where = isSuperAdmin(callerRole)
    ? eq(users.id, id)
    : and(eq(users.id, id), eq(users.tenantId, callerTenantId!), eq(users.role, 'STAFF'));

  const [updated] = await db
    .update(users)
    .set({ isActive, updatedAt: new Date() })
    .where(where)
    .returning({ id: users.id });

  return !!updated;
}
