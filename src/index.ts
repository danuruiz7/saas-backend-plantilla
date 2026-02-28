import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRouter } from './modules/auth/auth.routes.js';
import { usersRouter } from './modules/users/users.routes.js';
import { tenantsRouter } from './modules/tenants/tenants.routes.js';

const app = express();

// Seguridad
app.use(helmet());
app.use(cors({
  origin: env.ALLOWED_ORIGINS.split(',').map(o => o.trim()),
  credentials: true,
}));

// Logger HTTP
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.url} ${res.statusCode}  ${Date.now() - start}ms`);
  });
  next();
});

app.use(express.json());

// Rutas
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    env: env.NODE_ENV,
    uptime: `${Math.floor(process.uptime())}s`,
    timestamp: new Date().toISOString(),
  });
});

// Auth Rutas para la autenticación del los usuarios
app.use('/api/auth', authRouter);

// Users Rutas para la gestión de usuarios
app.use('/api/users', usersRouter);

// Tenants Rutas para la gestión de tenants
app.use('/api/tenants', tenantsRouter);

// Global error handler (debe ir último)
app.use(errorHandler);

app.listen(env.PORT, () => {
  logger.info(`🚀 Server running on port ${env.PORT} [${env.NODE_ENV}]`);
});
