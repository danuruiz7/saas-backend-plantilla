import {
  pgTable,
  text,
  boolean,
  // integer,
  timestamp,
  uuid,
  // unique,
} from 'drizzle-orm/pg-core';

export const tenants = pgTable('tenants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  name: text('name').notNull(),
  role: text('role').notNull().default('STAFF'), // SUPERADMIN | OWNER | STAFF
  tenantId: uuid('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
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
