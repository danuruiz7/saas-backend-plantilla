import { Router } from 'express';
import { requireAuth } from '@/middleware/requireAuth.js';
import { requireRole } from '@/middleware/requireRole.js';
import {
  getTenantsController,
  createTenantController,
  updateTenantController,
  deleteTenantController,
  setActiveTenantController,
} from './tenants.controller.js';

export const tenantsRouter: Router = Router();

tenantsRouter.use(requireAuth, requireRole('SUPERADMIN'));

tenantsRouter.get('/', getTenantsController);
tenantsRouter.post('/', createTenantController);
tenantsRouter.patch('/:id', updateTenantController);
tenantsRouter.delete('/:id', deleteTenantController);
tenantsRouter.patch('/:id/deactivate', setActiveTenantController(false));
tenantsRouter.patch('/:id/activate', setActiveTenantController(true));


