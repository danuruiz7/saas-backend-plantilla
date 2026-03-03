import {
  pgTable,
  text,
  boolean,
  // integer,
  timestamp,
  uuid,
  jsonb,
  // unique,
} from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  plan: text('plan', { enum: ['free', 'pro', 'enterprise'] }).notNull().default('free'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  logoUrl: text('logo_url'),
  settings: jsonb('settings').default({}),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  role: text('role').notNull().default('STAFF'), // SUPERADMIN | OWNER | STAFF
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  deletedAt: timestamp('deleted_at'),
});

// export const customers = pgTable(
//   'customers',
//   {
//     id: uuid('id').defaultRandom().primaryKey(),
//     email: text('email'),
//     phone: text('phone'),
//     name: text('name').notNull(),
//   },
//   (t) => [unique().on(t.email, t.phone)]
// );

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  userAgent: text('user_agent'),
  ipAddress: text('ip_address'),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passwordResetTokens = pgTable('password_reset_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userInvitations = pgTable('user_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  token: text('token').notNull().unique(),
  role: text('role').notNull().default('STAFF'), // OWNER | STAFF
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// export const verificationTokens = pgTable('verification_tokens', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   identifier: text('identifier').notNull(),
//   token: text('token').notNull(),
//   expiresAt: timestamp('expires_at').notNull(),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
// });

// export const services = pgTable('services', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id')
//     .notNull()
//     .references(() => tenants.id, { onDelete: 'cascade' }),
//   name: text('name').notNull(),
//   durationMin: integer('duration_min').notNull(),
//   price: integer('price'),
// });

// export const bookings = pgTable('bookings', {
//   id: uuid('id').defaultRandom().primaryKey(),
//   tenantId: uuid('tenant_id')
//     .notNull()
//     .references(() => tenants.id, { onDelete: 'cascade' }),
//   customerId: uuid('customer_id')
//     .notNull()
//     .references(() => customers.id),
//   staffId: uuid('staff_id')
//     .notNull()
//     .references(() => users.id),
//   startTime: timestamp('start_time').notNull(),
//   endTime: timestamp('end_time').notNull(),
//   status: text('status').notNull().default('PENDING'), // PENDING | CONFIRMED | CANCELLED
// });

// export const bookingServices = pgTable('booking_services', {
//   bookingId: uuid('booking_id')
//     .notNull()
//     .references(() => bookings.id, { onDelete: 'cascade' }),
//   serviceId: uuid('service_id')
//     .notNull()
//     .references(() => services.id, { onDelete: 'cascade' }),
// });
