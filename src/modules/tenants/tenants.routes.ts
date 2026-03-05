import { Router } from 'express';
import { requireAuth } from '@/middleware/requireAuth.js';
import { requireRole } from '@/middleware/requireRole.js';
import {
  getTenantsController,
  createTenantController,
  updateTenantController,
  deleteTenantController,
  setActiveTenantController,
  restoreTenantController,
  createInvitationController,
  getInvitationsController,
  deleteInvitationController,
  resendInvitationController,
  updateMyTenantController,
  getMyTenantController,
  getTenantBySlugController,
} from './tenants.controller.js';

export const tenantsRouter: Router = Router();

// Public routes
tenantsRouter.get('/public/:slug', getTenantBySlugController);

// Endpoint for creating invitations relies on its own role check inside the service
tenantsRouter.post('/:id/invitations', requireAuth, createInvitationController);
tenantsRouter.get('/:id/invitations', requireAuth, getInvitationsController);
tenantsRouter.delete('/:id/invitations/:invitationId', requireAuth, deleteInvitationController);
tenantsRouter.post('/:id/invitations/:invitationId/resend', requireAuth, resendInvitationController);
tenantsRouter.get('/me', requireAuth, getMyTenantController); // Get own tenant info
tenantsRouter.patch('/me', requireAuth, requireRole('OWNER'), updateMyTenantController); // For OWNER to update their own tenant

tenantsRouter.use(requireAuth, requireRole('SUPERADMIN'));

tenantsRouter.get('/', getTenantsController);
tenantsRouter.post('/', createTenantController);
tenantsRouter.patch('/:id', updateTenantController);
tenantsRouter.delete('/:id', deleteTenantController);
tenantsRouter.post('/:id/restore', restoreTenantController);
tenantsRouter.patch('/:id/deactivate', setActiveTenantController(false));
tenantsRouter.patch('/:id/activate', setActiveTenantController(true));


