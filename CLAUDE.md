# Fintrace — Claude Code Context

## What this is
Agentic PFM (Personal Financial Management) copilot with an approval & audit layer.
AI agent analyzes Plaid Sandbox transactions, proposes financial actions, requires
explicit human approval before simulated execution. Every decision is logged to an
append-only audit trail.

## Architecture
pnpm monorepo:
- `apps/web` — Vite + React + TypeScript + Tailwind (port 5173)
- `apps/api` — Fastify + TypeScript (port 3001)
- `packages/shared` — shared domain types

Frontend proxies `/api/*` to the backend via Vite config.

## Database
Postgres. Migrations in `apps/api/migrations/`, run with `pnpm db:migrate`.
- `audit_log` table is **append-only** — triggers block UPDATE/DELETE.

## Three agent actions (scope-locked)
1. **Subscription detection** — recurring charge heuristics, propose cancellation
2. **Savings auto-transfer** — income detection, propose transfer based on surplus
3. **Spending anomaly** — z-score outlier detection, propose "flag for review" only

Detection is deterministic/rule-based. No LLM for decision-making (no ANTHROPIC_API_KEY).

## Commands
- `pnpm dev` — start both apps
- `pnpm db:migrate` — run migrations
- `pnpm db:migrate:down` — revert last migration
- `pnpm dev:api` / `pnpm dev:web` — start individually

## Env vars
Copy `.env.example` to `.env` in repo root:
- `PLAID_CLIENT_ID`, `PLAID_SECRET`, `PLAID_ENV=sandbox`
- `DATABASE_URL=postgres://postgres:postgres@localhost:5432/fintrace`
