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
└── modules/
    ├── auth/               # login, me, select-tenant, change-password
    ├── users/              # CRUD de usuarios con aislamiento multi-tenant
    └── tenants/            # CRUD de tenants (solo SUPERADMIN)
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

Ejemplo mínimo:
```env
DATABASE_URL=postgresql://user:pass@localhost:5432/reserva_db
JWT_SECRET=super_secret_key_at_least_32_chars_long
ALLOWED_ORIGINS=http://localhost:3001
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
| GET    | `/me`             | JWT               | Datos del usuario autenticado.                  |
| PATCH  | `/change-password`| JWT               | Cambio de contraseña.                           |
| POST   | `/select-tenant`  | JWT + SUPERADMIN  | Genera token impersonando un tenant.            |

### Users — `/api/users`

> Requiere JWT + rol `OWNER` o `SUPERADMIN`. Los OWNER solo ven/modifican usuarios de su tenant.

| Método | Ruta               | Descripción               |
| ------ | ------------------ | ------------------------- |
| GET    | `/`                | Lista usuarios (paginado) |
| GET    | `/:id`             | Obtener usuario por ID    |
| POST   | `/`                | Crear usuario             |
| PATCH  | `/:id`             | Actualizar usuario        |
| DELETE | `/:id`             | Eliminar usuario          |
| PATCH  | `/:id/activate`    | Activar usuario           |
| PATCH  | `/:id/deactivate`  | Desactivar usuario        |

### Tenants — `/api/tenants`

> Requiere JWT + rol `SUPERADMIN`. Excepto `/invitations` que delega rol en el servicio (OWNER del propio tenant o SUPERADMIN).

| Método | Ruta                                      | Descripción                                   |
| ------ | ----------------------------------------- | --------------------------------------------- |
| GET    | `/`                                       | Lista tenants (paginado)                      |
| POST   | `/`                                       | Crear tenant                                  |
| PATCH  | `/:id`                                    | Actualizar tenant                             |
| DELETE | `/:id`                                    | Eliminar tenant                               |
| PATCH  | `/:id/activate`                           | Activar tenant                                |
| PATCH  | `/:id/deactivate`                         | Desactivar tenant                             |
| POST   | `/:id/invitations`                        | Crear invitación para el tenant               |
| GET    | `/:id/invitations`                        | Lista todas las invitaciones del tenant       |
| DELETE | `/:id/invitations/:invitationId`          | Elimina una invitación pendiente              |
| POST   | `/:id/invitations/:invitationId/resend`   | Reenvía correo de invitación                  |

### Health

| Método | Ruta      | Descripción           |
| ------ | --------- | --------------------- |
| GET    | `/health` | Estado del servidor.  |

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
