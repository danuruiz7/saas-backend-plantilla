import { Request, Response } from 'express';
import crypto from 'crypto';
import { ZodError } from 'zod';
import { env } from '@/config/env.js';
import { generateUploadUrl } from '@/lib/storage.js';
import { presignedUrlSchema } from './storage.schemas.js';

export async function getPresignedUrl(req: Request, res: Response): Promise<void> {
  try {
    const { filename, contentType, folder } = presignedUrlSchema.parse(req.body);

    const user = req.user; // Added by requireAuth middleware
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const tenantPrefix = user.tenantId ? `${user.tenantId}/` : 'global/';
    const uniqueFilename = `${user.sub}_${crypto.randomUUID()}_${filename}`;
    const key = `${tenantPrefix}${folder}/${uniqueFilename}`;

    const { uploadUrl } = await generateUploadUrl(key, contentType);

    // Si se usa Supabase/R2, lo ideal es usar AWS_S3_CDN_URL o el ENDPOINT.
    const baseUrl = env.AWS_S3_CDN_URL || (env.AWS_S3_ENDPOINT ? `${env.AWS_S3_ENDPOINT}/${env.AWS_S3_BUCKET}` : `https://${env.AWS_S3_BUCKET}.s3.${env.AWS_REGION}.amazonaws.com`);

    res.json({
      uploadUrl,
      key,
      url: `${baseUrl}/${key}`
    });
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      res.status(400).json({ error: 'Validation Error', issues: err.issues });
      return;
    }
    console.error('getPresignedUrl error:', err);
    res.status(500).json({ error: 'Failed to generate presigned URL' });
  }
}
