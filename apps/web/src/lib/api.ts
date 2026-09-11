const BASE = "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "Content-Type": "application/json" },
      ...opts,
    });
  } catch {
    throw new Error("Network error — is the API server running?");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `Request failed (${res.status})`);
  }
  const json = await res.json();
  return json.data;
}

export const api = {
  createLinkToken: () =>
    request<{ link_token: string }>("/plaid/link-token", { method: "POST" }),

  exchangeToken: (public_token: string) =>
    request<{ item_id: string; accounts_synced: number }>("/plaid/exchange", {
      method: "POST",
      body: JSON.stringify({ public_token }),
    }),

  syncTransactions: () =>
    request<{ transactions_synced: number }>("/plaid/sync", { method: "POST" }),

  getAccounts: () => request<any[]>("/accounts"),

  getTransactions: () => request<any[]>("/transactions"),

  getAccountTransactions: (accountId: string) =>
    request<any[]>(`/accounts/${accountId}/transactions`),

  // Agent
  runAnalysis: () =>
    request<{ proposals_created: Record<string, any[]>; total: number }>(
      "/agent/analyze",
      { method: "POST" }
    ),

  // Proposals
  getProposals: (status?: string) =>
    request<any[]>(status ? `/proposals?status=${status}` : "/proposals"),

  approveProposal: (id: string) =>
    request<{ id: string; status: string }>(`/proposals/${id}/approve`, {
      method: "POST",
    }),

  rejectProposal: (id: string) =>
    request<{ id: string; status: string }>(`/proposals/${id}/reject`, {
      method: "POST",
    }),

  executeProposal: (id: string) =>
    request<{ id: string; status: string }>(`/proposals/${id}/execute`, {
      method: "POST",
    }),

  // Audit
  getAuditLog: (action?: string) =>
    request<any[]>(action ? `/audit?action=${action}` : "/audit"),

  // Dev
  seedData: () =>
    request<{ inserted: number; message: string; expected_proposals: string[] }>(
      "/dev/seed",
      { method: "POST" }
    ),

  resetData: () =>
    request<{ message: string }>("/dev/reset", { method: "POST" }),
};
