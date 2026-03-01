import { z } from 'zod';

export const presignedUrlSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  contentType: z.string().min(1, 'Content type is required'),
  folder: z.enum(['avatars', 'logos', 'documents']).default('documents'),
});
