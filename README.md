# Multi-Tenant SaaS Backend Template

Plantilla robusta y genérica para aplicaciones SaaS multi-tenancy con Node.js, Express y Drizzle ORM.

## Características

- 🏢 **Multi-tenancy**: Aislamiento de datos por `tenantId`.
- 🔐 **Auth & RBAC**: JWT, roles (SUPERADMIN, OWNER, STAFF), y protección de rutas.
- 🚀 **Seguridad**: Helmet, CORS configurable, Rate Limiting y Global Error Handling.
- 📄 **Paginación**: Utilidad genérica para respuestas paginadas.
- 🛠️ **Arquitectura**: Módulos claros (auth, users, tenants, billing, storage).
- 🗃️ **Base de Datos**: PostgreSQL con Drizzle ORM y migraciones versionadas.
- 🐳 **Docker**: Totalmente dockerizado con multi-stage build.
- 💳 **Facturación (Stripe)**: Planes de suscripción (`free`, `pro`, `enterprise`), webhooks y feature flags.
- ☁️ **Storage**: Soporte para subida directa desde el cliente S3-compatible (AWS, Supabase, Cloudflare R2) con generación de Presigned URLs.
- 🤝 **Onboarding Autónomo**: Registro público para nuevos tenants y dueños (Owners).
- ⚙️ **Configuraciones Dinámicas**: Atributos en JSONB (moneda, zona horaria, colores, idioma) y Logos/Avatares por cada Tenant y User.

---

## Stack Tecnológico

| Capa        | Tecnología                     |
| ----------- | ------------------------------ |
| Runtime     | Node.js 20+ (TypeScript)       |
| Framework   | Express.js 5                   |
| ORM         | Drizzle ORM + PostgreSQL       |
| Validación  | Zod                            |
| Logs        | Pino                           |
| Auth        | JWT (jsonwebtoken) + bcrypt    |
| Storage     | AWS SDK v3 (S3 Compatible)     |

---

## Estructura del Proyecto

```
src/
├── config/
│   └── env.ts              # Validación de variables de entorno con Zod
├── db/
│   ├── db.ts               # Instancia de Drizzle + pool de conexión
│   ├── schema.ts           # Definición de tablas
│   └── seed.ts             # Datos de prueba iniciales
├── lib/
│   ├── logger.ts           # Logger con Pino
│   └── pagination.ts       # Utilidades de paginación
├── middleware/
│   ├── errorHandler.ts     # Manejador global de errores
│   ├── rateLimiter.ts      # Rate limiting para /login
│   ├── requireAuth.ts      # Verificación de JWT + estado de user/tenant
│   └── requireRole.ts      # Guard de autorización por rol
├── modules/
│   ├── auth/               # login, me, select-tenant, change-password
│   ├── users/              # CRUD de usuarios (incluye actualización de avatarUrl)
│   ├── tenants/            # CRUD de tenants (incluye actualización de logoUrl)
│   ├── billing/            # Integración con Stripe (Cajas, Portal, Webhooks)
│   └── storage/            # Generación de URLs firmadas (S3 Presigned URLs)
```

---

## Instalación

### Opción A: Desarrollo Local (necesita Node.js)

1. Clonar e instalar:
   ```bash
   pnpm install
   ```
2. Configurar `.env` (ver sección [Variables de Entorno](#variables-de-entorno)):
   ```bash
   cp .env.example .env
   ```
3. Base de datos:
   ```bash
   pnpm db:generate
   pnpm db:migrate
   pnpm db:seed
   ```
4. Iniciar servidor:
   ```bash
   pnpm dev
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

---

## Variables de Entorno

| Variable                | Requerida | Default                    | Descripción                                      |
| ----------------------- | --------- | -------------------------- | ------------------------------------------------ |
| `DATABASE_URL`          | ✅        | —                          | URL de conexión PostgreSQL                       |
| `JWT_SECRET`            | ✅        | —                          | Clave secreta JWT (mínimo 32 caracteres)         |
| `JWT_EXPIRES_IN`        | ❌        | `7d`                       | Duración del token JWT                           |
| `ALLOWED_ORIGINS`       | ❌        | `http://localhost:3001`    | Orígenes CORS permitidos (separados por coma)    |
| `PORT`                  | ❌        | `3000`                     | Puerto del servidor                              |
| `OTP_EXPIRES_IN_MINUTES`| ❌        | `10`                       | Expiración de OTPs en minutos                    |
| `AWS_REGION`            | ✅        | `eu-central-1`             | Región del Bucket S3                             |
| `AWS_ACCESS_KEY_ID`     | ✅        | —                          | Access Key (Para Supabase, MinIO, etc)           |
| `AWS_SECRET_ACCESS_KEY` | ✅        | —                          | Secret Key                                       |
| `AWS_S3_BUCKET`         | ✅        | —                          | Nombre del bucket S3                             |
| `AWS_S3_ENDPOINT`       | ❌        | —                          | (Opcional) Requerido en Supabase, Cloudflare R2  |
| `AWS_S3_CDN_URL`        | ❌        | —                          | Ruta base pública para servir los archivos       |

Ejemplo mínimo:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/reserva_db
JWT_SECRET=super_secret_key_at_least_32_chars_long
ALLOWED_ORIGINS=http://localhost:3001
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=tu-access-key
AWS_SECRET_ACCESS_KEY=tu-secret-key
AWS_S3_BUCKET=uploads
AWS_S3_ENDPOINT=https://your-project.storage.supabase.co/storage/v1/s3
AWS_S3_CDN_URL=https://your-project.supabase.co/storage/v1/object/public/uploads
```

---

## Comandos Útiles

| Comando           | Descripción                                          |
| ----------------- | ---------------------------------------------------- |
| `pnpm dev`        | Inicia el servidor en modo desarrollo con hot-reload |
| `pnpm build`      | Compila el proyecto a JS en `dist/`                  |
| `pnpm start`      | Ejecuta la versión compilada                         |
| `pnpm lint`       | Analiza el código con ESLint                         |
| `pnpm lint:fix`   | Corrige automáticamente los errores de lint          |
| `pnpm db:generate`| Genera migraciones a partir del schema               |
| `pnpm db:migrate` | Aplica las migraciones pendientes                    |
| `pnpm db:seed`    | Inserta datos de prueba en la base de datos          |
| `pnpm db:studio`  | Abre la interfaz visual de Drizzle Studio            |

---

## Sistema de Roles

| Rol           | Alcance       | Capacidades                                                                 |
| ------------- | ------------- | --------------------------------------------------------------------------- |
| `SUPERADMIN`  | Global        | Gestión de todos los tenants y usuarios. Puede impersonar cualquier tenant. |
| `OWNER`       | Tenant propio | CRUD de usuarios de su tenant.                                              |
| `STAFF`       | —             | Solo puede autenticarse y ver sus propios datos.                            |

---

## Endpoints

### Auth — `/api/auth`

| Método | Ruta              | Auth              | Descripción                                     |
| ------ | ----------------- | ----------------- | ----------------------------------------------- |
| POST   | `/login`          | ❌                | Autenticación. Devuelve JWT.                    |
| POST   | `/register-tenant`| ❌                | Registro autónomo de un nuevo Tenant y su Owner.|
| GET    | `/me`             | JWT               | Datos del usuario autenticado.                  |
| PATCH  | `/change-password`| JWT               | Cambio de contraseña.                           |
| POST   | `/select-tenant`  | JWT + SUPERADMIN  | Genera token impersonando un tenant.            |

### Users — `/api/users`

> Requiere JWT + rol `OWNER` o `SUPERADMIN`. Los OWNER solo ven/modifican usuarios de su tenant.

| Método | Ruta               | Descripción               |
| ------ | ------------------ | ------------------------- |
| GET    | `/?trash=true`     | Lista usuarios en la papelera |
| GET    | `/:id`             | Obtener usuario por ID    |
| POST   | `/`                | Crear usuario             |
| PATCH  | `/:id`             | Actualizar usuario        |
| DELETE | `/:id`             | Mover a la papelera       |
| POST   | `/:id/restore`     | Restaurar desde la papelera|
| PATCH  | `/:id/activate`    | Activar usuario           |
| PATCH  | `/:id/deactivate`  | Desactivar usuario        |

### Tenants — `/api/tenants`

> Requiere JWT + rol `SUPERADMIN`. Excepto `/invitations` que delega rol en el servicio (OWNER del propio tenant o SUPERADMIN).

| Método | Ruta                                      | Descripción                                   |
| ------ | ----------------------------------------- | --------------------------------------------- |
| GET    | `/?trash=true`     | Lista tenants en la papelera  |
| POST   | `/`                | Crear tenant                                  |
| PATCH  | `/:id`             | Actualizar tenant                             |
| DELETE | `/:id`             | Mover a la papelera                           |
| POST   | `/:id/restore`     | Restaurar desde la papelera                   |
| PATCH  | `/:id/activate`    | Activar tenant                                |
| PATCH  | `/:id/deactivate`  | Desactivar tenant                             |
| POST   | `/:id/invitations`                        | Crear invitación para el tenant               |
| GET    | `/:id/invitations`                        | Lista todas las invitaciones del tenant       |
| DELETE | `/:id/invitations/:invitationId`          | Elimina una invitación pendiente              |
| POST   | `/:id/invitations/:invitationId/resend`   | Reenvía correo de invitación                  |

### Billing — `/api/billing`

> Requiere JWT + rol `OWNER` para generar sesiones. El webhook es público y verificado por Stripe. Adicionalmente existen guards de Feature Flags como `requirePlan('pro')`.

| Método | Ruta               | Descripción                                               |
| ------ | ------------------ | --------------------------------------------------------- |
| POST   | `/checkout`        | Redirige al Stripe Checkout para suscribirse a un plan.   |
| POST   | `/portal`          | Redirige al Stripe Customer Portal para gestionar pagos.  |
| POST   | `/webhook`         | Endpoint para recibir y procesar eventos de Stripe.       |

### Storage — `/api/storage`

> Requiere JWT. Genera URLs firmadas para carga directa (presigned URLs) a buckets S3/R2 desde el cliente.

| Método | Ruta               | Descripción                                               |
| ------ | ------------------ | --------------------------------------------------------- |
| POST   | `/presigned-url`   | Devuelve una URL firmada de S3 para subir un archivo.     |

### Health

| Método | Ruta      | Descripción           |
| ------ | --------- | --------------------- |
| GET    | `/health` | Estado del servidor.  |

---

## Sistema de Papelera (Soft Delete)

El sistema implementa un mecanismo de **Soft Delete** para evitar la pérdida accidental de datos.

- **Funcionamiento**: Al "eliminar" un usuario o tenant, se marca la columna `deletedAt` con la fecha actual. El registro deja de ser visible en las consultas normales y el login.
- **Recuperación**: Se pueden listar los elementos eliminados añadiendo `?trash=true` a la URL (ej. `/api/users?trash=true`) y restaurarlos mediante el endpoint `POST /restore`.
- **Limpieza Automática**: Existe un script de mantenimiento en `src/lib/cron.ts` que elimina permanentemente (Hard Delete) los registros que llevan **más de 30 días** en la papelera.

---

## Paginación

Todos los endpoints de listado aceptan los parámetros `page` y `limit` vía query string:

```
GET /api/users?page=1&limit=10
GET /api/tenants?page=2&limit=20
```

Respuesta:
```json
{
  "data": [...],
  "meta": {
    "total": 42,
    "page": 1,
    "limit": 10,
    "totalPages": 5
  }
}
```

---

## Manejo de Errores

El servidor devuelve errores en el siguiente formato:

```json
{ "error": "ERROR_CODE" }
```

Códigos comunes:

| Código               | HTTP | Descripción                              |
| -------------------- | ---- | ---------------------------------------- |
| `UNAUTHORIZED`       | 401  | Token ausente o malformado.              |
| `INVALID_TOKEN`      | 401  | Token inválido o expirado.               |
| `USER_DISABLED`      | 403  | El usuario está desactivado.             |
| `TENANT_DISABLED`    | 403  | El tenant está desactivado.              |
| `INVALID_CREDENTIALS`| —    | Email o contraseña incorrectos.          |
| `INTERNAL_ERROR`     | 500  | Error interno del servidor.              |

---

## Datos de Prueba (Seed)

Al ejecutar `pnpm db:seed` se crean los siguientes registros. Contraseña para todos: **`Test1234!`**

| Email                   | Rol         | Tenant               |
| ----------------------- | ----------- | -------------------- |
| `superadmin@test.com`   | SUPERADMIN  | —                    |
| `owner1@test.com`       | OWNER       | Barbería El Rincón   |
| `staff1@test.com`       | STAFF       | Barbería El Rincón   |
| `owner2@test.com`       | OWNER       | Salón Elegance       |
