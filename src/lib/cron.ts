import { lte } from 'drizzle-orm';
import { db } from '@/db/db.js';
import { users, tenants } from '@/db/schema.js';
import { logger } from './logger.js';

/**
 * Tarea de limpieza para eliminar permanentemente registros que llevan en la papelera more de 30 días.
 */
export async function cleanupTrash(): Promise<void> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  try {
    logger.info('Iniciando limpieza de papelera...');

    const deletedUsers = await db.delete(users)
      .where(lte(users.deletedAt, thirtyDaysAgo))
      .returning({ id: users.id });

    const deletedTenants = await db.delete(tenants)
      .where(lte(tenants.deletedAt, thirtyDaysAgo))
      .returning({ id: tenants.id });

    logger.info(`Limpieza completada: ${deletedUsers.length} usuarios y ${deletedTenants.length} tenants eliminados permanentemente.`);
  } catch (error) {
    logger.error(error, 'Error durante la limpieza de papelera:');
  }
}
