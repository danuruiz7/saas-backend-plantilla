# Multi-Tenant SaaS Backend Template

Plantilla robusta y genérica para aplicaciones SaaS multi-tenancy con Node.js, Express y Drizzle ORM.

## Características

- 🏢 **Multi-tenancy**: Aislamiento de datos por `tenantId`.
- 🔐 **Auth & RBAC**: JWT, roles (SUPERADMIN, OWNER, STAFF), y protección de rutas.
- 🚀 **Seguridad**: Helmet, CORS configurable, Rate Limiting y Global Error Handling.
- 📄 **Paginación**: Utilidad genérica para respuestas paginadas.
- 🛠️ **Arquitectura**: Módulos claros (auth, users, tenants), servicios y controladores desacoplados.
- 🗃️ **Base de Datos**: PostgreSQL con Drizzle ORM y migraciones automáticas.

## Stack Tecnológico

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **ORM**: Drizzle ORM + PostgreSQL
- **Validación**: Zod
- **Logs**: Pino

## Instalación

1. Clonar y entrar:
   ```bash
   npm install
   ```
2. Configurar `.env` (basado en `env.ts`):
   ```env
   DATABASE_URL=
   JWT_SECRET=
   ALLOWED_ORIGINS=http://localhost:3001
   ```
3. Migraciones:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   ```

## Endpoints Principales

- `POST /api/auth/login`: Autenticación y obtención de JWT.
- `GET /api/auth/me`: Datos del usuario actual.
- `PATCH /api/auth/change-password`: Cambio de contraseña.
- `POST /api/auth/select-tenant`: (SUPERADMIN) Impersonar un tenant.
- `GET /api/users`: CRUD de usuarios (filtrado por tenant si no es SUPERADMIN).
- `GET /api/tenants`: (SUPERADMIN) Gestión de negocios.

## Paginación

Usa query params `page` y `limit` (max 100):
`GET /api/users?page=1&limit=10`
