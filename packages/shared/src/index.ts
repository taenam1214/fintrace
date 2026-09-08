// ── Domain types ──

export interface Account {
  id: string;
  plaid_account_id: string;
  plaid_item_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  available_balance: number | null;
  iso_currency_code: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  plaid_transaction_id: string;
  account_id: string;
  amount: number;
  iso_currency_code: string | null;
  category: string[];
  merchant_name: string | null;
  name: string;
  pending: boolean;
  date: string;
  authorized_date: string | null;
  payment_channel: string | null;
  created_at: string;
}

export type ProposalType =
  | "subscription_cancellation"
  | "savings_transfer"
  | "spending_anomaly";

export type ProposalStatus = "pending" | "approved" | "rejected" | "executed";

export interface Proposal {
  id: string;
  type: ProposalType;
  status: ProposalStatus;
  title: string;
  explanation: string;
  details: Record<string, unknown>;
  estimated_savings: number | null;
  created_at: string;
  updated_at: string;
}

export type AuditAction =
  | "proposal_created"
  | "proposal_approved"
  | "proposal_rejected"
  | "proposal_executed";

export interface AuditEntry {
  id: string;
  proposal_id: string | null;
  action: AuditAction;
  actor: "agent" | "user";
  before_state: Record<string, unknown> | null;
  after_state: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

// ── API response wrappers ──

export interface ApiResponse<T> {
  data: T;
}

export interface ApiError {
  error: string;
  message: string;
}
