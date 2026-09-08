const BASE = "/api";

async function request<T>(path: string, opts?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || res.statusText);
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
};
