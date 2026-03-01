import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '@/config/env.js';

export const s3Client = new S3Client({
  region: env.AWS_REGION,
  credentials: {
    accessKeyId: env.AWS_ACCESS_KEY_ID,
    secretAccessKey: env.AWS_SECRET_ACCESS_KEY,
  },
  // Solo se usa si se define (ej. Cloudflare R2, Supabase)
  endpoint: env.AWS_S3_ENDPOINT,
  // Necesario para algunos servicios S3-compatibles
  forcePathStyle: !!env.AWS_S3_ENDPOINT, 
});

/**
 * Genera una URL firmada para que el cliente pueda subir directamente un archivo a S3
 */
export async function generateUploadUrl(key: string, contentType: string, expiresIn = 3600): Promise<{ uploadUrl: string; key: string }> {
  const command = new PutObjectCommand({
    Bucket: env.AWS_S3_BUCKET,
    Key: key,
    ContentType: contentType,
  });

  const uploadUrl = await getSignedUrl(s3Client, command, { expiresIn });
  return { uploadUrl, key };
}
