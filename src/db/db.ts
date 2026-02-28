import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env } from '@/config/env.js';
import * as schema from '@/db/schema.js';
import { logger } from '@/lib/logger.js';

const pool = new Pool({ connectionString: env.DATABASE_URL });

pool.connect()
  .then(client => {
    logger.info('✅ Database connected');
    client.release();
  })
  .catch(err => {
    logger.error({ err }, '❌ Database connection failed');
    process.exit(1);
  });

export const db = drizzle(pool, { schema });
