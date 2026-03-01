import { Router } from 'express';
import { requireAuth } from '@/middleware/requireAuth.js';
import { requireRole } from '@/middleware/requireRole.js';
import { createCheckoutController, createPortalController } from './billing.controller.js';
export const billingRouter: Router = Router();

// Endpoint de Checkout protegido para OWNER (quien asume el pago)
billingRouter.post('/checkout', requireAuth, requireRole('OWNER'), createCheckoutController);

// Endpoint de Portal protegido para OWNER
billingRouter.post('/portal', requireAuth, requireRole('OWNER'), createPortalController);


