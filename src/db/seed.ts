import { db } from './db.js';
import { tenants, users } from './schema.js';
import bcrypt from 'bcrypt';

async function seed(): Promise<void> {
  console.log('🌱 Seeding database...');

  // Tenants
  const [tenant1, tenant2] = await db
    .insert(tenants)
    .values([
      { 
        name: 'Barbería El Rincón', 
        slug: 'barberia-el-rincon',
        plan: 'pro',
        settings: {
          currency: 'USD',
          timezone: 'America/New_York',
          language: 'es',
          themeColors: {
            primary: '#1D4ED8',
            secondary: '#10B981'
          }
        }
      },
      { 
        name: 'Salón Elegance', 
        slug: 'salon-elegance',
        plan: 'free',
        settings: {
          currency: 'EUR',
          timezone: 'Europe/Madrid',
          language: 'es',
        }
      },
    ])
    .returning();

  if (!tenant1 || !tenant2) throw new Error('Failed to insert tenants');

  console.log('✅ Tenants created');

  // Passwords
  const password = await bcrypt.hash('Test1234!', 10);

  // Users
  await db.insert(users).values([
    {
      email: 'owner1@test.com',
      passwordHash: password,
      name: 'Carlos Ruiz',
      role: 'OWNER',
      tenantId: tenant1.id,
    },
    {
      email: 'staff1@test.com',
      passwordHash: password,
      name: 'Ana López',
      role: 'STAFF',
      tenantId: tenant1.id,
    },
    {
      email: 'owner2@test.com',
      passwordHash: password,
      name: 'María García',
      role: 'OWNER',
      tenantId: tenant2.id,
    },
    {
      email: 'danuruiz7@hotmail.com',
      passwordHash: password,
      name: 'Super Admin',
      role: 'SUPERADMIN',
      tenantId: null,
    },
  ]);

  console.log('✅ Users created');
  console.log('');
  console.log('📋 Test credentials (password: Test1234!):');
  console.log('  owner1@test.com     → OWNER  (Barbería El Rincón)');
  console.log('  staff1@test.com     → STAFF  (Barbería El Rincón)');
  console.log('  owner2@test.com     → OWNER  (Salón Elegance)');
  console.log('  danuruiz7@hotmail.com → SUPERADMIN');

  process.exit(0);
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
