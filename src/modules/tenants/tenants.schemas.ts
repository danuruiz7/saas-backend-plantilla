import { z } from 'zod';

export const createTenantSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens'),
});

export const updateTenantSchema = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/, 'Slug must be lowercase alphanumeric and hyphens').optional(),
});

export const createInvitationSchema = z.object({
  email: z.string().email(),
  role: z.enum(['STAFF', 'OWNER']).default('STAFF'),
});

export type CreateTenantInput = z.infer<typeof createTenantSchema>;
export type UpdateTenantInput = z.infer<typeof updateTenantSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
