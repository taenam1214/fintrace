import type { Account } from "@fintrace/shared";

function formatCurrency(amount: number | null, code: string | null) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: code || "USD",
  }).format(amount);
}

export function AccountList({
  accounts,
  selectedId,
  onSelect,
}: {
  accounts: Account[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  if (accounts.length === 0) {
    return (
      <p className="text-muted text-sm">
        No accounts connected yet.
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {accounts.map((acct) => (
        <button
          key={acct.id}
          onClick={() => onSelect(acct.id)}
          className={`w-full text-left p-4 rounded-lg border transition-colors ${
            selectedId === acct.id
              ? "border-accent/50 bg-surface-2"
              : "border-surface-3 bg-surface-1 hover:border-zinc-600"
          }`}
        >
          <div className="flex justify-between items-baseline">
            <div>
              <span className="font-medium text-sm">{acct.name}</span>
              {acct.mask && (
                <span className="text-muted text-xs ml-2">••{acct.mask}</span>
              )}
            </div>
            <span className="font-mono text-sm text-accent">
              {formatCurrency(acct.current_balance, acct.iso_currency_code)}
            </span>
          </div>
          <span className="text-xs text-muted capitalize">{acct.subtype || acct.type}</span>
        </button>
      ))}
    </div>
  );
}
