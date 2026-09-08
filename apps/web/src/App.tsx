import { useCallback, useEffect, useState } from "react";
import { PlaidLinkButton } from "./components/PlaidLink";
import { AccountList } from "./components/AccountList";
import { TransactionList } from "./components/TransactionList";
import { api } from "./lib/api";
import type { Account, Transaction } from "@fintrace/shared";

export default function App() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-surface-3 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">fintrace</h1>
            <p className="text-xs text-muted">agentic pfm copilot</p>
          </div>
          <PlaidLinkButton onSuccess={handleLinkSuccess} />
        </div>
      </header>

      {/* Main */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {!connected ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <p className="text-muted text-sm max-w-md text-center">
              Connect a bank account to get started. Uses Plaid Sandbox — no real
              credentials required.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-8">
            {/* Sidebar: Accounts */}
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

            {/* Content: Transactions */}
            <div className="col-span-8">
              <h2 className="text-sm font-semibold text-muted uppercase tracking-wider mb-4">
                Transactions
                <span className="ml-2 text-zinc-500 font-normal normal-case">
                  ({filteredTxns.length})
                </span>
              </h2>
              <div className="bg-surface-1 rounded-lg border border-surface-3 p-4">
                <TransactionList transactions={filteredTxns} />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
