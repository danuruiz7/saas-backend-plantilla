import rateLimit from 'express-rate-limit';
import type { RequestHandler } from 'express';

export const loginRateLimiter: RequestHandler = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'TOO_MANY_REQUESTS' },
}) as unknown as RequestHandler;
