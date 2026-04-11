# Project Overview

## Purpose

`despensa-api` is a REST API for household pantry management.
The goal is to help users control stock, expiration dates, and shopping planning.

## Core use cases

- Register products and categories.
- Track pantry stock by quantity and unit.
- Track expiration dates and identify items close to expiring.
- Generate and manage shopping lists based on stock needs.

## Scope (MVP)

- Authentication and basic user account management.
- Role-based authorization with three roles: `USER`, `CONTRIBUTOR`, `ADMIN`.
- CRUD for product catalog and categories.
- CRUD for pantry items with quantity and expiration date.
- CRUD for shopping lists and shopping list items.
- Basic health endpoint and API-level validation.

## Out of scope (for now)

- Real-time notifications.
- OCR / barcode scanning.
- Integrations with external supermarkets.
- Advanced analytics dashboards.

## Architectural principles

- Controllers are transport layer only.
- Business logic lives in services.
- Validation is explicit and runs before services.
- Reusable pure logic goes in `src/lib`.
- Keep modules small and cohesive.

## Runtime and environment

- Node.js + Express 5 + TypeScript strict mode.
- ESM modules (`type: module`, `module: NodeNext`).
- Environment variables are loaded from `.env` and documented in `.env.example`.

## Quality gates

Before shipping changes:

1. `npm run typecheck`
2. `npm run build`
3. Update docs if behavior or contracts changed.
