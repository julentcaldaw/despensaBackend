# AGENTS

## Project overview

- Stack: Node.js + Express 5 + TypeScript (ESM).
- Entrypoint: `src/index.ts`.
- Build output: `dist/`.
- Main purpose: pantry management API (inventory, expiration control, and shopping planning).

## Working commands

- Install deps: `npm install`
- Dev mode: `npm run dev`
- Type check: `npm run typecheck`
- Build: `npm run build`
- Start build: `npm run start`
- Generate Prisma Client: `npm run prisma:generate`
- Run migrations: `npm run prisma:migrate`
- View database UI: `npm run prisma:studio`

## Development guidelines

- Keep TypeScript strict mode enabled.
- Use ESM import/export syntax.
- Prefer small route modules and move business logic into services.
- Validate request payloads before hitting business logic.
- Never commit secrets; use `.env` and keep `.env.example` updated.
- For protected write operations, enforce RBAC with authenticated user role (`USER`, `CONTRIBUTOR`, `ADMIN`).

## Response conventions

- Success response: `{ ok: true, data }`
- Error response: `{ ok: false, error: { code, message, details? } }`
- Prefer explicit HTTP status codes by scenario.

## Domain entities (baseline)

- User
- Pantry
- PantryItem
- Product
- Category
- ShoppingList
- ShoppingListItem

## Source of truth docs

- `README.md`: quick start and high-level context.
- `docs/PROJECT_OVERVIEW.md`: purpose, scope, and decisions.
- `docs/DOMAIN_MODEL.md`: entities, relationships, and invariants.
- `docs/API_CONVENTIONS.md`: response shapes, errors, and endpoint rules.
- `docs/SWAGGER_GUIDE.md`: patterns for documenting endpoints in OpenAPI/Swagger.
- `.github/copilot-instructions.md`: coding rules for Copilot.

## Agent workflow

1. Read `README.md` and `docs/PROJECT_OVERVIEW.md` before large changes.
2. If adding new entities, update `prisma/schema.prisma` first, then run `npm run prisma:migrate`.
3. Generate Prisma types: `npm run prisma:generate` (updates Prisma Client in `node_modules/@prisma/client`).
4. If adding endpoints, document them with JSDoc `@openapi` following `docs/SWAGGER_GUIDE.md`.
5. If touching API contracts, update `docs/API_CONVENTIONS.md`.
6. If touching domain rules, update `docs/DOMAIN_MODEL.md`.
7. Add or update reusable schemas in `src/docs/swagger.ts` if needed.
8. Run `npm run typecheck` and `npm run build` before finalizing.
9. Verify documentation renders correctly at http://localhost:3000/docs.

## Suggested folder structure

- `src/index.ts` bootstrap + middleware
- `src/routes/*` route handlers
- `src/controllers/*` HTTP orchestration
- `src/services/*` business logic
- `src/middlewares/*` auth/validation/error handlers
- `src/lib/*` reusable utilities
- `src/types/*` shared TypeScript types
- `src/modules/automation/*` internal automation integrations (e.g., n8n), not exposed through Express routes

## Internal automation

- Internal n8n integration lives in `src/modules/automation/automation.service.ts`.
- It is intentionally not mounted in `src/index.ts` as public API routes.
- Environment variables:
  - `N8N_URL`
  - `N8N_BASE_URL`
  - `N8N_API_KEY`
  - `N8N_TIMEOUT_MS`
  - `N8N_USER`
  - `N8N_PASSWORD`
