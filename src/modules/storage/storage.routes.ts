import { Router } from 'express';
import { requireAuth } from '@/middleware/requireAuth.js';
import { getPresignedUrl } from './storage.controller.js';

export const storageRouter = Router();

// Endpoint para solicitar URL de subida (protegido con Auth)
// POST /api/storage/presigned-url
storageRouter.post('/presigned-url', requireAuth, getPresignedUrl);
