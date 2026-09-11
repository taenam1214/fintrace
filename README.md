# Fintrace

Agentic personal finance copilot with a human-in-the-loop approval layer and append-only audit trail.

An AI agent ingests real bank transaction data via Plaid, runs deterministic heuristics to detect actionable patterns, and proposes concrete financial actions — but **never executes anything without explicit human approval**. Every state transition is logged to a tamper-resistant audit trail.

Built to demonstrate that the hard problem in "AI agents that touch money" is the trust and governance layer, not the reasoning.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (React + TypeScript + Tailwind)                        │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────┐   │
│  │ PlaidLink│  │ ProposalQueue│  │ AuditLog │  │ Transaction│   │
│  │          │  │  approve /   │  │  append  │  │    List    │   │
│  │  OAuth   │  │  reject /    │  │  -only   │  │  date-group│   │
│  │  flow    │  │  execute     │  │  viewer  │  │  + filter  │   │
│  └────┬─────┘  └──────┬───────┘  └────┬─────┘  └─────┬──────┘   │
│       │               │               │              │          │
└───────┼───────────────┼───────────────┼──────────────┼──────────┘
        │  Vite proxy   │  /api/*       │              │
        ▼               ▼               ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│  Fastify API (TypeScript)                                       │
│                                                                 │
│  ┌──────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │  Plaid   │  │   Agent      │  │  Proposals   │               │
│  │  Routes  │  │  Analyzer    │  │  + Audit     │               │
│  │          │  │              │  │  Routes      │               │
│  │ link     │  │ subscriptions│  │              │               │
│  │ exchange │  │ savings      │  │ approve →    │               │
│  │ sync     │  │ anomalies    │  │ audit_log    │               │
│  └────┬─────┘  └──────────────┘  └───────┬──────┘               │
│       │                                  │                      │
└───────┼──────────────────────────────────┼──────────────────────┘
        │                                  │
        ▼                                  ▼
┌──────────────┐                ┌─────────────────────┐
│  Plaid API   │                │  PostgreSQL         │
│  (Sandbox)   │                │                     │
│              │                │  accounts           │
│  link_token  │                │  transactions       │
│  exchange    │                │  proposals          │
│  sync        │                │  audit_log (append) │
│              │                │  plaid_items        │
└──────────────┘                └─────────────────────┘
```

## Data Flow

```
1. INGEST     Plaid Sandbox → /api/plaid/sync → transactions table
2. ANALYZE    /api/agent/analyze → deterministic heuristics → proposals table
3. PROPOSE    Agent creates proposals with status=pending → audit_log entry
4. APPROVE    User approves/rejects → status change → audit_log entry
5. EXECUTE    User executes approved proposal → simulated → audit_log entry
```

Every proposal state transition (created → approved/rejected → executed) writes to `audit_log`. The audit table has database-level triggers that block UPDATE and DELETE — it is physically append-only.

## Database Schema

```sql
plaid_items     — Plaid access tokens and sync cursors
accounts        — Bank accounts (synced from Plaid)
transactions    — Transaction history (synced from Plaid, plus seed data)
proposals       — Agent-generated proposals with status lifecycle
audit_log       — Append-only log of every state change (triggers block mutation)
```

Key constraints:
- `proposals.type` restricted to: `subscription_cancellation`, `savings_transfer`, `spending_anomaly`
- `proposals.status` lifecycle: `pending` → `approved`/`rejected` → `executed`
- `audit_log` has `BEFORE UPDATE` and `BEFORE DELETE` triggers that raise exceptions
- All primary keys are nanoid strings (not UUIDs)

## Agent Detection Algorithms

All detection is deterministic and rule-based. No LLM in the decision loop.

### Subscription Detection
Groups transactions by merchant name, then clusters by amount similarity (within 5%). Computes average interval between charges and classifies as recurring if the interval matches weekly (5-9 days), biweekly (12-18), monthly (25-35), or quarterly (80-100). Proposes cancellation with estimated monthly savings.

### Savings Auto-Transfer
Identifies income deposits (Plaid negative amounts > $500 in last 60 days). Computes average monthly income vs. average monthly expenses to find surplus. Proposes transferring 20% of surplus to savings. Minimum threshold: $10.

### Spending Anomaly Detection
Calculates per-category mean and standard deviation of transaction amounts (requires 5+ data points). Flags transactions exceeding mean + 2 standard deviations (z-score > 2.0). Falls back to per-merchant analysis when category data is sparse. Proposes "flag for review" only — the agent knows when *not* to act.

## Security Model

- **Append-only audit trail**: PostgreSQL triggers physically prevent UPDATE/DELETE on `audit_log`. The dev reset endpoint temporarily drops the trigger inside a transaction to allow cleanup.
- **Human-in-the-loop**: No proposal executes without explicit user approval. The agent proposes; humans decide.
- **Deterministic decisions**: Rule-based heuristics mean behavior is fully auditable and explainable. No black-box reasoning.
- **No stored credentials in code**: Plaid credentials and database URL are environment variables.

## Tech Stack

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | React + TypeScript + Tailwind | Type safety, utility CSS, fast iteration |
| Backend | Fastify + TypeScript | Lightweight, async-first, schema validation |
| Database | PostgreSQL | JSONB for flexible proposal details, trigger support for audit enforcement |
| Banking | Plaid Sandbox API | Industry-standard banking data API, sandbox for safe demo |
| Monorepo | pnpm workspaces | Shared types between frontend and backend |

## What This Is and Isn't

**Is:**
- A working demo of human-in-the-loop agent governance
- Real Plaid integration pulling real sandbox transaction data
- Deterministic, auditable agent behavior
- Append-only audit trail enforced at the database level

**Isn't:**
- Production software (no auth, no HTTPS, no rate limiting)
- Real money movement (everything past "approved" is simulated)
- LLM-powered (intentionally — deterministic rules are the point)
- Multi-tenant (single hardcoded demo user)

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

### Demo Walkthrough

1. Click **Connect Account** — Plaid Link opens in sandbox mode
2. Use Plaid test credentials: username `user_good`, password `pass_good`
3. Select any bank — transactions sync into Postgres
4. Click **Seed demo data** in the footer — injects synthetic transactions that trigger all three proposal types
5. Go to **Proposals** tab, click **Run Analysis**
6. Agent creates proposals: subscription cancellations, savings transfer, spending anomaly flag
7. **Approve** or **Reject** each proposal (reject asks for confirmation)
8. **Execute** approved proposals (simulated — no real money movement)
9. Check **Audit Log** tab — every action recorded with before/after state
10. Export audit log as JSON or CSV
11. Click **Reset** in the footer to clear seed data and start over
