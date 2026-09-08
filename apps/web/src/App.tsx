import { useCallback, useEffect, useState } from "react";
import { PlaidLinkButton } from "./components/PlaidLink";
import { AccountList } from "./components/AccountList";
import { TransactionList } from "./components/TransactionList";
import { ProposalQueue } from "./components/ProposalQueue";
import { AuditLog } from "./components/AuditLog";
import { api } from "./lib/api";
import type { Account, Transaction } from "@fintrace/shared";

type Tab = "accounts" | "proposals" | "audit";

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [tab, setTab] = useState<Tab>("accounts");

  const loadData = useCallback(async () => {
    const accts = await api.getAccounts();
    setAccounts(accts);
    if (accts.length > 0) {
      setConnected(true);
      const txns = await api.getTransactions();
      setTransactions(txns);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAccountSelect = async (id: string) => {
    setSelectedAccount(id);
    const txns = await api.getAccountTransactions(id);
    setTransactions(txns);
  };

  const handleLinkSuccess = async () => {
    await loadData();
  };

  const filteredTxns = selectedAccount
    ? transactions.filter((t) => t.account_id === selectedAccount)
    : transactions;

  const tabs: { key: Tab; label: string }[] = [
    { key: "accounts", label: "Accounts" },
    { key: "proposals", label: "Proposals" },
    { key: "audit", label: "Audit Log" },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-3 px-6 py-4 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div>
              <h1 className="text-lg font-semibold tracking-tight">fintrace</h1>
              <p className="text-[10px] text-muted uppercase tracking-widest">
                agentic pfm copilot
              </p>
            </div>

            {connected && (
              <nav className="flex gap-1">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setTab(t.key)}
                    className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                      tab === t.key
                        ? "bg-surface-2 text-zinc-100"
                        : "text-muted hover:text-zinc-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            )}
          </div>
          <PlaidLinkButton onSuccess={handleLinkSuccess} />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8 w-full flex-1">
        {!connected ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <div className="w-12 h-12 rounded-xl bg-surface-2 border border-surface-3 flex items-center justify-center mb-2">
              <span className="text-xl text-muted">$</span>
            </div>
            <p className="text-zinc-400 text-sm max-w-sm text-center leading-relaxed">
              Connect a bank account to get started. Uses Plaid Sandbox — no
              real credentials required.
            </p>
          </div>
        ) : (
          <>
            {tab === "accounts" && (
              <div className="grid grid-cols-12 gap-8">
                <div className="col-span-4">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
                      Accounts
                    </h2>
                    {selectedAccount && (
                      <button
                        onClick={() => {
                          setSelectedAccount(null);
                          api.getTransactions().then(setTransactions);
                        }}
                        className="text-xs text-accent hover:underline"
                      >
                        Show all
                      </button>
                    )}
                  </div>
                  <AccountList
                    accounts={accounts}
                    selectedId={selectedAccount}
                    onSelect={handleAccountSelect}
                  />
                </div>

                <div className="col-span-8">
                  <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
                    Transactions
                    <span className="ml-2 text-zinc-500 font-normal normal-case">
                      ({filteredTxns.length})
                    </span>
                  </h2>
                  <div className="bg-surface-1 rounded-lg border border-surface-3 p-4 max-h-[70vh] overflow-y-auto">
                    <TransactionList transactions={filteredTxns} />
                  </div>
                </div>
              </div>
            )}

            {tab === "proposals" && <ProposalQueue />}

            {tab === "audit" && <AuditLog />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-3 px-6 py-3 shrink-0">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-[10px] text-zinc-600">
            fintrace demo · sandbox mode · no real money movement
          </span>
          <span className="text-[10px] text-zinc-700">
            append-only audit · deterministic agent
          </span>
        </div>
      </footer>
    </div>
  );
}
