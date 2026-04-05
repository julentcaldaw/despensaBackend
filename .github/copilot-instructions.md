# Copilot Instructions for despensa-api

## Mission
Build and maintain a REST API for pantry management (despensa): users can track products, stock, expiration dates, and shopping planning.

## Tech constraints
- Use TypeScript with strict typing.
- Use Node.js ESM syntax (`import` / `export`).
- Keep compatibility with Express 5 APIs.
- Read environment variables through `process.env` and document them in `.env.example`.
- Do not introduce ORMs/frameworks unless explicitly requested.

## Architecture and boundaries
- Keep controllers thin: map HTTP input/output only.
- Move business rules to services.
- Keep reusable pure helpers in `src/lib`.
- Keep validation in dedicated middleware or validators.
- Keep route modules small and organized by resource.

## Domain model baseline
Core entities expected in this project:
- User
- Pantry
- PantryItem
- Product
- Category
- ShoppingList
- ShoppingListItem

If new entities are introduced, update docs in `docs/DOMAIN_MODEL.md`.

## API conventions
- Use consistent JSON shapes for success and error responses.
- Prefer this response shape for success:
	- `{ "ok": true, "data": ... }`
- Prefer this response shape for errors:
	- `{ "ok": false, "error": { "code": string, "message": string, "details"?: unknown } }`
- Use proper HTTP status codes and avoid returning `200` on failures.
- Validate request body, params, and query before service calls.

## Security basics
- Never hardcode secrets or tokens.
- Validate auth inputs and guard protected routes.
- Use least-privilege defaults for CORS and JWT settings.
- Avoid leaking internal errors in production responses.

## TypeScript guidelines
- Favor explicit types at API boundaries.
- Avoid `any`; prefer `unknown` plus narrowing.
- Keep DTOs and domain types separated when needed.
- Avoid large union types in controllers; move complexity into typed helpers.

## Dependency policy
- Avoid adding new dependencies unless justified.
- Prefer built-in Node.js APIs or existing project utilities first.
- If a dependency is added, document why in PR notes and update docs if relevant.

## Quality checks before proposing changes
- Ensure code compiles with `npm run typecheck`.
- Ensure build succeeds with `npm run build`.
- Keep imports sorted and remove dead code.
- Keep changes scoped to the requested task.

## Swagger/OpenAPI documentation
- Every endpoint must have JSDoc `@openapi` block immediately before its handler.
- Document: summary, description, tags, parameters, requestBody, and responses.
- Use reusable schemas in `components.schemas` (define in `src/docs/swagger.ts`).
- Reference schemas with `$ref: '#/components/schemas/SchemaName'`.
- Always include error responses (400, 401, 404, 422) in documentation.
- Add `security: [{ bearerAuth: [] }]` to protected endpoints.
- For detailed patterns, see `docs/SWAGGER_GUIDE.md`.
- Validate with `npm run build` and check http://localhost:3000/docs.

## Documentation update rule
When changing behavior, update relevant docs in:
- `README.md`
- `AGENTS.md`
- `docs/PROJECT_OVERVIEW.md`
- `docs/DOMAIN_MODEL.md`
- `docs/API_CONVENTIONS.md`
- `docs/SWAGGER_GUIDE.md` (if adding new code patterns)
