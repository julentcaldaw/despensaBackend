# despensa-api

API REST con Node.js, Express 5 y TypeScript.

## Para que sirve este proyecto

Esta API permite gestionar una despensa domestica:

- Control de inventario por producto.
- Seguimiento de cantidades y caducidades.
- Planificacion de listas de compra.
- Control de acceso por roles de usuario (`USER`, `CONTRIBUTOR`, `ADMIN`).

## Requisitos

- Node.js 20+
- npm 10+

## Primer arranque

1. Instalar dependencias:
   ```bash
   npm install
   ```
2. Crear variables de entorno desde ejemplo:
   ```bash
   cp .env.example .env
   ```
3. Configurar las variables de entorno principales en `.env`:
   - `DATABASE_URL`: cadena de conexión PostgreSQL
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`: claves secretas para JWT
   - `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`: (opcional) para almacenamiento de archivos
   - Ver más en `.env.example`
4. Ejecutar migraciones y generar Prisma Client:
   ```bash
   npm run prisma:migrate
   npm run prisma:generate
   ```
5. Levantar en desarrollo:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev`: arranque en caliente con `tsx watch`.
- `npm run typecheck`: validación de tipos sin emitir archivos.
- `npm run build`: compila TypeScript a `dist/`.
- `npm run start`: ejecuta la build compilada.
- `npm run prisma:migrate`: aplica migraciones de base de datos.
- `npm run prisma:generate`: genera el cliente Prisma.

## Estructura base

- `src/index.ts`: bootstrap del servidor y endpoint de salud.
- `src/modules/automation/automation.service.ts`: cliente interno para interactuar con n8n (no expuesto como endpoint HTTP).
- `.github/copilot-instructions.md`: pautas para Copilot.
- `AGENTS.md`: contexto operativo para agentes.

## Entidades principales

- User
- Pantry
- PantryItem
- Product
- Category
- ShoppingList
- ShoppingListItem

## Documentacion de contexto

- `docs/PROJECT_OVERVIEW.md`: objetivo, alcance y principios de arquitectura.
- `docs/DOMAIN_MODEL.md`: entidades, relaciones e invariantes del dominio.
- `docs/API_CONVENTIONS.md`: estandares de respuestas, errores y rutas.

## Convenciones de API

- Respuesta de éxito:
  ```json
  {
    "ok": true,
    "data": {}
  }
  ```
- Respuesta de error:
  ```json
  {
    "ok": false,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "Invalid request body",
      "details": {}
    }
  }
  ```
  Más detalles en `docs/API_CONVENTIONS.md`.

## Documentación OpenAPI/Swagger

- Documentación interactiva disponible en: [http://localhost:3000/docs](http://localhost:3000/docs)

## Endpoint inicial

- `GET /health`

## Cómo contribuir

1. Crea un fork y una rama para tu feature/fix.
2. Sigue las convenciones de código y respuesta.
3. Ejecuta `npm run typecheck` y `npm run build` antes de enviar PR.
4. Actualiza la documentación relevante si cambias el comportamiento.
5. Para dudas o problemas, abre un issue.
