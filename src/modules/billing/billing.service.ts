import Stripe from 'stripe';
import { eq } from 'drizzle-orm';
import { env } from '@/config/env.js';
import { db } from '@/db/db.js';
import { tenants } from '@/db/schema.js';

export const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-02-25.clover',
});

// Este mapeo idealmente iría en base de datos.
const PLAN_PRICE_IDS: Record<string, string> = {
  pro: 'price_PRO_ID_AQUI',
  enterprise: 'price_ENTERPRISE_ID_AQUI',
};

export async function createCheckoutSession(tenantId: string, plan: string): Promise<string> {
  if (!['pro', 'enterprise'].includes(plan)) {
    throw new Error('INVALID_PLAN');
  }

  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant) throw new Error('TENANT_NOT_FOUND');

  let customerId = tenant.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: tenant.name,
      metadata: { tenantId: tenant.id },
    });
    customerId = customer.id;
    await db.update(tenants).set({ stripeCustomerId: customerId }).where(eq(tenants.id, tenantId));
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: PLAN_PRICE_IDS[plan],
        quantity: 1,
      },
    ],
    mode: 'subscription',
    success_url: `${env.APP_URL}/billing?success=true`,
    cancel_url: `${env.APP_URL}/billing?canceled=true`,
    metadata: {
      tenantId: tenant.id,
      plan,
    },
  });

  return session.url!;
}

export async function createPortalSession(tenantId: string): Promise<string> {
  const tenant = await db.query.tenants.findFirst({
    where: eq(tenants.id, tenantId),
  });

  if (!tenant || !tenant.stripeCustomerId) {
    throw new Error('NOT_SUBSCRIBED');
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: `${env.APP_URL}/billing`,
  });

  return session.url;
}

export async function handleStripeWebhook(signature: string, rawBody: Buffer): Promise<void> {
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    throw new Error('WEBHOOK_ERROR');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as unknown as Record<string, unknown>;
      const metadata = session['metadata'] as Record<string, string> | undefined;
      const tenantId = metadata?.['tenantId'];
      const plan = metadata?.['plan'];

      if (tenantId && plan) {
        await db.update(tenants)
          .set({ plan: plan as 'free' | 'pro' | 'enterprise', stripeSubscriptionId: session['subscription'] as string })
          .where(eq(tenants.id, tenantId));
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as unknown as Record<string, unknown>;
      const customerId = subscription['customer'] as string;

      await db.update(tenants)
        .set({ plan: 'free', stripeSubscriptionId: null })
        .where(eq(tenants.stripeCustomerId, customerId));
      break;
    }
    // Añadir más eventos si se necesitan (ej. past_due, actualizado)
  }
}
