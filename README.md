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
3. Levantar en desarrollo:
   ```bash
   npm run dev
   ```

## Scripts

- `npm run dev`: arranque en caliente con `tsx watch`.
- `npm run typecheck`: validación de tipos sin emitir archivos.
- `npm run build`: compila TypeScript a `dist/`.
- `npm run start`: ejecuta la build compilada.

## Estructura base

- `src/index.ts`: bootstrap del servidor y endpoint de salud.
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

## Endpoint inicial

- `GET /health`
