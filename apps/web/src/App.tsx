import { useCallback, useEffect, useRef, useState } from "react";
import { PlaidLinkButton } from "./components/PlaidLink";
import { AccountList } from "./components/AccountList";
import { TransactionList } from "./components/TransactionList";
import { ProposalQueue } from "./components/ProposalQueue";
import { AuditLog } from "./components/AuditLog";
import { ToastProvider, useToast } from "./components/Toast";
import { ConfirmDialog } from "./components/ConfirmDialog";
import { Onboarding, useOnboardingComplete } from "./components/Onboarding";
import { api } from "./lib/api";
import type { Account, Transaction } from "@fintrace/shared";

type Tab = "accounts" | "proposals" | "audit";

function AppContent() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("accounts");
  const [seeding, setSeeding] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [onboarded, setOnboarded] = useState(useOnboardingComplete);
  const { toast } = useToast();

  // Track tab key to force re-mount child components on tab switch
  const tabKeyRef = useRef(0);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const accts = await api.getAccounts();
      setAccounts(accts);
      if (accts.length > 0) {
        setConnected(true);
        const txns = await api.getTransactions();
        setTransactions(txns);
      }
    } catch (err: any) {
      toast(err.message || "Failed to load data", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = (newTab: Tab) => {
    tabKeyRef.current++;
    setTab(newTab);
  };

  const handleAccountSelect = async (id: string) => {
    setSelectedAccount(id);
    try {
      const txns = await api.getAccountTransactions(id);
      setTransactions(txns);
    } catch (err: any) {
      toast(err.message || "Failed to load transactions", "error");
    }
  };

  const handleLinkSuccess = async () => {
    await loadData();
  };

  const handleSeed = async () => {
    setSeeding(true);
    try {
      await api.seedData();
      toast("Demo data seeded with proposals and audit log", "success");
      await loadData();
    } catch (err: any) {
      toast(err.message || "Seed failed", "error");
    } finally {
      setSeeding(false);
    }
  };

  const handleReset = async () => {
    setResetting(true);
    try {
      await api.resetData();
      toast("Demo data cleared", "info");
      await loadData();
    } catch (err: any) {
      toast(err.message || "Reset failed", "error");
    } finally {
      setResetting(false);
    }
  };

  const filteredTxns = selectedAccount
    ? transactions.filter((t) => t.account_id === selectedAccount)
    : transactions;

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: "accounts", label: "Accounts", count: accounts.length },
    { key: "proposals", label: "Proposals" },
    { key: "audit", label: "Audit Log" },
  ];

  if (!onboarded) {
    return (
      <Onboarding
        onComplete={() => setOnboarded(true)}
        onLinkSuccess={handleLinkSuccess}
      />
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-surface-3 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6 sm:gap-10">
            <div className="flex items-center gap-3">
              <div className="w-7 h-7 rounded bg-accent/10 border border-accent/20 flex items-center justify-center">
                <span className="text-accent text-xs font-bold">F</span>
              </div>
              <div>
                <h1 className="text-sm font-semibold tracking-tight leading-none">
                  fintrace
                </h1>
                <p className="text-[9px] text-muted uppercase tracking-[0.2em] mt-0.5 hidden sm:block">
                  agentic copilot
                </p>
              </div>
            </div>

            {connected && (
              <nav className="flex gap-0.5">
                {tabs.map((t) => (
                  <button
                    key={t.key}
                    onClick={() => handleTabChange(t.key)}
                    className={`px-3 py-1.5 text-xs rounded transition-all ${
                      tab === t.key
                        ? "bg-surface-2 text-zinc-100 font-medium"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </nav>
            )}
          </div>

          <div className="flex items-center gap-4">
            {connected && (
              <div className="flex items-center gap-1.5">
                <div className="pulse-dot bg-accent" />
                <span className="text-[10px] text-muted hidden sm:inline">sandbox</span>
              </div>
            )}
            <PlaidLinkButton onSuccess={handleLinkSuccess} connected={connected} />
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-32">
              <div className="spinner text-muted" />
            </div>
          ) : !connected ? (
            <div className="flex flex-col items-center justify-center py-32 fade-in">
              <div className="w-16 h-16 rounded-2xl bg-surface-1 border border-surface-3 flex items-center justify-center mb-6">
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-zinc-600"
                >
                  <path
                    d="M19 5H5a2 2 0 00-2 2v10a2 2 0 002 2h14a2 2 0 002-2V7a2 2 0 00-2-2z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3 10h18"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <p className="text-zinc-400 text-sm font-medium mb-2">
                No accounts connected
              </p>
              <p className="text-zinc-600 text-xs max-w-xs text-center leading-relaxed">
                Connect a Plaid Sandbox bank account to load transactions and
                start the agent analysis pipeline.
              </p>
            </div>
          ) : (
            <div className="fade-in">
              {tab === "accounts" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                  <div className="lg:col-span-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <h2 className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                        Accounts
                      </h2>
                      {selectedAccount && (
                        <button
                          onClick={() => {
                            setSelectedAccount(null);
                            api.getTransactions().then(setTransactions);
                          }}
                          className="text-[11px] text-accent hover:underline"
                        >
                          Clear filter
                        </button>
                      )}
                    </div>
                    <AccountList
                      accounts={accounts}
                      selectedId={selectedAccount}
                      onSelect={handleAccountSelect}
                    />

                    {/* Summary card */}
                    {accounts.length > 0 && (
                      <div className="p-3 bg-surface-1 border border-surface-3 rounded-lg">
                        <span className="text-[10px] text-muted uppercase tracking-wider">
                          Total balance
                        </span>
                        <p className="text-lg font-mono font-semibold text-zinc-100 mt-0.5">
                          {new Intl.NumberFormat("en-US", {
                            style: "currency",
                            currency: "USD",
                          }).format(
                            accounts.reduce(
                              (s, a) => s + (a.current_balance || 0),
                              0
                            )
                          )}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="lg:col-span-8">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-[11px] font-semibold text-muted uppercase tracking-wider">
                        Transactions
                        <span className="ml-2 text-zinc-600 font-normal normal-case">
                          {filteredTxns.length}
                        </span>
                      </h2>
                    </div>
                    <div className="bg-surface-1 rounded-lg border border-surface-3 max-h-[72vh] overflow-y-auto">
                      <div className="p-4">
                        <TransactionList transactions={filteredTxns} />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === "proposals" && (
                <ProposalQueue key={`proposals-${tabKeyRef.current}`} />
              )}

              {tab === "audit" && (
                <AuditLog key={`audit-${tabKeyRef.current}`} />
              )}
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-surface-3 shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-4">
            <span className="text-[10px] text-zinc-700">
              sandbox mode — no real money movement
            </span>
          </div>
          <div className="flex items-center gap-3">
            {connected && (
              <>
                <button
                  onClick={handleSeed}
                  disabled={seeding || resetting}
                  className="text-[10px] text-zinc-600 hover:text-zinc-400 transition-colors
                             disabled:opacity-40 flex items-center gap-1"
                >
                  {seeding && <div className="spinner" />}
                  {seeding ? "Seeding..." : "Seed demo data"}
                </button>
                <span className="text-zinc-800">|</span>
                <button
                  onClick={() => setConfirmReset(true)}
                  disabled={seeding || resetting}
                  className="text-[10px] text-zinc-600 hover:text-rose-400 transition-colors
                             disabled:opacity-40 flex items-center gap-1"
                >
                  {resetting && <div className="spinner" />}
                  {resetting ? "Resetting..." : "Reset"}
                </button>
                <span className="text-zinc-800">|</span>
              </>
            )}
            <span className="text-[10px] text-zinc-700">
              append-only audit · deterministic agent
            </span>
          </div>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmReset}
        title="Reset demo data?"
        message="This will delete all seed transactions, proposals, and audit log entries. This cannot be undone."
        confirmLabel="Reset everything"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmReset(false);
          handleReset();
        }}
        onCancel={() => setConfirmReset(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}
