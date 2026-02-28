# Multi-Tenant SaaS Backend Template

Plantilla robusta y genérica para aplicaciones SaaS multi-tenancy con Node.js, Express y Drizzle ORM.

## Características

- 🏢 **Multi-tenancy**: Aislamiento de datos por `tenantId`.
- 🔐 **Auth & RBAC**: JWT, roles (SUPERADMIN, OWNER, STAFF), y protección de rutas.
- 🚀 **Seguridad**: Helmet, CORS configurable, Rate Limiting y Global Error Handling.
- 📄 **Paginación**: Utilidad genérica para respuestas paginadas.
- 🛠️ **Arquitectura**: Módulos claros (auth, users, tenants), servicios y controladores desacoplados.
- 🗃️ **Base de Datos**: PostgreSQL con Drizzle ORM y migraciones versionadas.
- 🐳 **Docker**: Totalmente dockerizado con multi-stage build y `docker-compose`.

## Stack Tecnológico

- **Runtime**: Node.js 20+ (con TypeScript)
- **Framework**: Express.js
- **ORM**: Drizzle ORM + PostgreSQL
- **Validación**: Zod
- **Logs**: Pino

## Instalación

### Opción A: Desarrollo Local (necesita Node.js)

1. Clonar e instalar:
   ```bash
   pnpm install
   ```
2. Configurar `.env` (basado en `env.ts`):
   ```env
   DATABASE_URL=postgresql://user:pass@localhost:5432/reserva_db
   JWT_SECRET=super_secret_key_32chars_min
   ALLOWED_ORIGINS=http://localhost:3001
   ```
3. Base de datos:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```

### Opción B: Docker (Recomendado)

1. Levantar servicios:
   ```bash
   docker-compose up --build
   ```
2. (Opcional) Correr seed dentro del contenedor:
   ```bash
   docker exec -it reserva_api pnpm db:seed
   ```

## Comandos Útiles

- `pnpm dev`: Inicia el servidor en modo desarrollo con hot-reload.
- `pnpm build`: Compila el proyecto a JS en la carpeta `dist`.
- `pnpm start`: Ejecuta la versión compilada.
- `pnpm db:studio`: Abre la interfaz visual de Drizzle para explorar la base de datos.

## Endpoints Principales

- `POST /api/auth/login`: Autenticación y obtención de JWT.
- `GET /api/auth/me`: Datos del usuario actual.
- `PATCH /api/auth/change-password`: Cambio de contraseña.
- `POST /api/auth/select-tenant`: (SUPERADMIN) Impersonar un tenant.
- `GET /api/users`: CRUD de usuarios (con aislamiento multi-tenant).
- `GET /api/tenants`: (SUPERADMIN) Gestión de negocios.

## Paginación y Filtrado

Todos los listados aceptan los parámetros `page` y `limit`:
`GET /api/users?page=1&limit=10`

