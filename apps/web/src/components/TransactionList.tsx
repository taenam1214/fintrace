import type { Transaction } from "@fintrace/shared";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDate(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="text-muted text-sm">No transactions found.</p>;
  }

  return (
    <div className="divide-y divide-surface-3">
      {transactions.map((txn) => (
        <div key={txn.id} className="flex items-center justify-between py-3 px-1">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">
              {txn.merchant_name || txn.name}
            </p>
            <p className="text-xs text-muted">
              {formatDate(txn.date)}
              {txn.pending && (
                <span className="ml-2 text-yellow-500 font-medium">pending</span>
              )}
            </p>
          </div>
          <span
            className={`font-mono text-sm ml-4 ${
              txn.amount > 0 ? "text-zinc-300" : "text-accent"
            }`}
          >
            {txn.amount > 0 ? "-" : "+"}
            {formatCurrency(Math.abs(txn.amount))}
          </span>
        </div>
      ))}
    </div>
  );
}
