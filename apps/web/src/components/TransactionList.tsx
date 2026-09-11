import type { Transaction } from "@fintrace/shared";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}

function formatDateHeader(date: string) {
  return new Date(date + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function groupByDate(transactions: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const txn of transactions) {
    const key = txn.date;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(txn);
  }
  // Sort keys descending (newest first)
  return [...groups.entries()].sort(([a], [b]) => b.localeCompare(a));
}

const categoryColors: Record<string, string> = {
  "Food and Drink": "bg-orange-500/10 text-orange-400",
  "Travel": "bg-sky-500/10 text-sky-400",
  "Transfer": "bg-violet-500/10 text-violet-400",
  "Shops": "bg-pink-500/10 text-pink-400",
  "Service": "bg-indigo-500/10 text-indigo-400",
  "Payment": "bg-emerald-500/10 text-emerald-400",
  "Recreation": "bg-amber-500/10 text-amber-400",
};

function getCategoryStyle(category: string) {
  return categoryColors[category] || "bg-zinc-500/10 text-zinc-400";
}

export function TransactionList({ transactions }: { transactions: Transaction[] }) {
  if (transactions.length === 0) {
    return <p className="text-muted text-sm">No transactions found.</p>;
  }

  const grouped = groupByDate(transactions);

  return (
    <div className="space-y-1">
      {grouped.map(([date, txns]) => (
        <div key={date}>
          <div className="sticky top-0 bg-surface-1 py-2 px-1 z-10">
            <span className="text-[10px] text-muted font-semibold uppercase tracking-wider">
              {formatDateHeader(date)}
            </span>
          </div>
          <div className="divide-y divide-surface-3">
            {txns.map((txn) => {
              const primaryCategory = Array.isArray(txn.category) && txn.category.length > 0
                ? txn.category[0]
                : null;

              return (
                <div key={txn.id} className="flex items-center justify-between py-3 px-1 gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">
                      {txn.merchant_name || txn.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {primaryCategory && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getCategoryStyle(primaryCategory)}`}>
                          {primaryCategory}
                        </span>
                      )}
                      {txn.pending && (
                        <span className="text-[10px] text-yellow-500 font-medium">pending</span>
                      )}
                    </div>
                  </div>
                  <span
                    className={`font-mono text-sm shrink-0 ${
                      txn.amount > 0 ? "text-zinc-300" : "text-accent"
                    }`}
                  >
                    {txn.amount > 0 ? "-" : "+"}
                    {formatCurrency(Math.abs(txn.amount))}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
