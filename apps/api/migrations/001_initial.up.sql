-- Plaid connection items
CREATE TABLE plaid_items (
  id TEXT PRIMARY KEY,
  access_token TEXT NOT NULL,
  item_id TEXT NOT NULL UNIQUE,
  cursor TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bank accounts synced from Plaid
CREATE TABLE accounts (
  id TEXT PRIMARY KEY,
  plaid_account_id TEXT NOT NULL UNIQUE,
  plaid_item_id TEXT NOT NULL REFERENCES plaid_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  official_name TEXT,
  type TEXT NOT NULL,
  subtype TEXT,
  mask TEXT,
  current_balance NUMERIC,
  available_balance NUMERIC,
  iso_currency_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Transactions synced from Plaid
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  plaid_transaction_id TEXT NOT NULL UNIQUE,
  account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  iso_currency_code TEXT,
  category JSONB NOT NULL DEFAULT '[]',
  merchant_name TEXT,
  name TEXT NOT NULL,
  pending BOOLEAN NOT NULL DEFAULT false,
  date DATE NOT NULL,
  authorized_date DATE,
  payment_channel TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_account ON transactions(account_id);
CREATE INDEX idx_transactions_date ON transactions(date DESC);
CREATE INDEX idx_transactions_merchant ON transactions(merchant_name);

-- Agent proposals
CREATE TABLE proposals (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('subscription_cancellation', 'savings_transfer', 'spending_anomaly')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'executed')),
  title TEXT NOT NULL,
  explanation TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  estimated_savings NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Append-only audit log — NO updates, NO deletes
CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  proposal_id TEXT REFERENCES proposals(id),
  action TEXT NOT NULL CHECK (action IN ('proposal_created', 'proposal_approved', 'proposal_rejected', 'proposal_executed')),
  actor TEXT NOT NULL CHECK (actor IN ('agent', 'user')),
  before_state JSONB,
  after_state JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enforce append-only on audit_log: block UPDATE and DELETE
CREATE OR REPLACE FUNCTION prevent_audit_mutation() RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_log is append-only: % not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_no_update
  BEFORE UPDATE ON audit_log FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_mutation();

CREATE TRIGGER audit_no_delete
  BEFORE DELETE ON audit_log FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_mutation();

CREATE INDEX idx_audit_log_proposal ON audit_log(proposal_id);
CREATE INDEX idx_audit_log_action ON audit_log(action);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);
