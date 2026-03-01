import type { Request, Response } from 'express';
import { createCheckoutSession, createPortalSession, handleStripeWebhook } from './billing.service.js';

export async function createCheckoutController(req: Request, res: Response): Promise<void> {
  const body = req.body as Record<string, unknown>;
  const plan = body['plan'] as string | undefined;
  if (!plan) { res.status(400).json({ error: 'PLAN_REQUIRED' }); return; }

  try {
    const url = await createCheckoutSession(req.user!.tenantId!, plan);
    res.json({ url });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === 'INVALID_PLAN') { res.status(400).json({ error: 'INVALID_PLAN' }); return; }
      if (err.message === 'TENANT_NOT_FOUND') { res.status(404).json({ error: 'TENANT_NOT_FOUND' }); return; }
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function createPortalController(req: Request, res: Response): Promise<void> {
  try {
    const url = await createPortalSession(req.user!.tenantId!);
    res.json({ url });
  } catch (err) {
    if (err instanceof Error && err.message === 'NOT_SUBSCRIBED') {
      res.status(400).json({ error: 'NOT_SUBSCRIBED' });
      return;
    }
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}

export async function webhookController(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature'] as string;
  
  if (!signature) {
    res.status(400).json({ error: 'MISSING_SIGNATURE' });
    return;
  }

  try {
    await handleStripeWebhook(signature, req.body as Buffer);
    res.json({ received: true });
  } catch {
    res.status(400).json({ error: 'WEBHOOK_ERROR' });
  }
}
