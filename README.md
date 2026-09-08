# Fintrace

An AI agent that analyzes real bank transaction data, proposes concrete financial actions, and **never executes anything without explicit human approval** — with every decision logged to an append-only audit trail.

Built to demonstrate that the interesting problem in "AI agents that touch money" is the trust and governance layer, not the reasoning layer.

## What it does

1. **Ingest** — Pulls transaction data from the Plaid Sandbox API
2. **Propose** — Agent analyzes transactions and drafts specific actions
3. **Approve** — Every proposal sits in a queue with detail view; user approves or rejects
4. **Audit** — Every state change is written to an append-only log (triggers block UPDATE/DELETE)

### Three agent actions

- **Subscription detection** — Recurring charge heuristics (merchant + amount + interval), proposes cancellation with estimated savings
- **Savings auto-transfer** — Detects income deposits, computes surplus after recurring expenses, proposes a transfer amount
- **Spending anomaly alert** — Z-score outlier detection per category/merchant, flags for review only (agent knows when *not* to act)

All detection is deterministic/rule-based. No LLM in the decision loop — behavior is auditable and explainable.

## Architecture

```
apps/
  web/     → Vite + React + TypeScript + Tailwind
  api/     → Fastify + TypeScript
packages/
  shared/  → Domain types (Account, Transaction, Proposal, AuditEntry)
```

## Setup

### Prerequisites

- Node.js >= 18
- pnpm
- PostgreSQL
- [Plaid Sandbox credentials](https://dashboard.plaid.com/signup)

### Install

```bash
git clone https://github.com/taenam1214/fintrace.git
cd fintrace
pnpm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env`:
```
PLAID_CLIENT_ID=<your plaid client id>
PLAID_SECRET=<your plaid sandbox secret>
PLAID_ENV=sandbox
DATABASE_URL=postgres://postgres:postgres@localhost:5432/fintrace
```

### Database

```bash
createdb fintrace
pnpm db:migrate
```

### Run

```bash
pnpm dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### Demo walkthrough

1. Click **Connect Account** → Plaid Link opens
2. Use Plaid Sandbox test credentials (user: `user_good`, pass: `pass_good`)
3. Select any bank → transactions sync into Postgres
4. Go to **Proposals** tab → click **Run Analysis**
5. Agent creates proposals based on transaction patterns
6. **Approve** or **Reject** each proposal
7. **Execute** approved proposals (simulated — no real money movement)
8. Check **Audit Log** tab — every action is recorded with before/after state
9. Export audit log as JSON or CSV

## Non-goals

- No real money movement — everything past "approved" is simulated
- No user auth — single hardcoded demo user
- No LLM decision-making — deterministic rules only
- No production deployment — local/demo use
