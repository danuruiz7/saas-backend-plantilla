import { Router } from 'express';
import { requireAuth } from '@/middleware/requireAuth.js';
import { requireRole } from '@/middleware/requireRole.js';
import {
  getTenantsController,
  createTenantController,
  updateTenantController,
  deleteTenantController,
  setActiveTenantController,
  createInvitationController,
  getInvitationsController,
  deleteInvitationController,
  resendInvitationController,
} from './tenants.controller.js';

export const tenantsRouter: Router = Router();

// Endpoint for creating invitations relies on its own role check inside the service
tenantsRouter.post('/:id/invitations', requireAuth, createInvitationController);
tenantsRouter.get('/:id/invitations', requireAuth, getInvitationsController);
tenantsRouter.delete('/:id/invitations/:invitationId', requireAuth, deleteInvitationController);
tenantsRouter.post('/:id/invitations/:invitationId/resend', requireAuth, resendInvitationController);

tenantsRouter.use(requireAuth, requireRole('SUPERADMIN'));

tenantsRouter.get('/', getTenantsController);
tenantsRouter.post('/', createTenantController);
tenantsRouter.patch('/:id', updateTenantController);
tenantsRouter.delete('/:id', deleteTenantController);
tenantsRouter.patch('/:id/deactivate', setActiveTenantController(false));
tenantsRouter.patch('/:id/activate', setActiveTenantController(true));


