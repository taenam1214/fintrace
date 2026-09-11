import { useState } from "react";
import type { Proposal } from "@fintrace/shared";
import { api } from "../lib/api";
import { useToast } from "./Toast";
import { ConfirmDialog } from "./ConfirmDialog";

const typeLabels: Record<string, string> = {
  subscription_cancellation: "Subscription",
  savings_transfer: "Savings",
  spending_anomaly: "Anomaly",
};

const typeColors: Record<string, string> = {
  subscription_cancellation: "bg-rose-500/10 text-rose-400 border-rose-500/20",
  savings_transfer: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  spending_anomaly: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

const statusColors: Record<string, string> = {
  pending: "text-zinc-400",
  approved: "text-blue-400",
  rejected: "text-zinc-500",
  executed: "text-emerald-400",
};

function fmt(n: number | null | undefined) {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

function fmtPct(n: number) {
  return `${(n * 100).toFixed(0)}%`;
}

function fmtDate(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// ── Structured detail renderers ──

function SubscriptionDetails({ d }: { d: Record<string, any> }) {
  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
      <DetailRow label="Merchant" value={d.merchant_name} />
      <DetailRow label="Charge" value={fmt(d.charge_amount)} />
      <DetailRow label="Frequency" value={d.interval} className="capitalize" />
      <DetailRow label="Occurrences" value={`${d.occurrences} charges`} />
      {d.dates?.length > 0 && (
        <DetailRow
          label="Date range"
          value={`${fmtDate(d.dates[0])} — ${fmtDate(d.dates[d.dates.length - 1])}`}
          full
        />
      )}
    </div>
  );
}

function SavingsDetails({ d }: { d: Record<string, any> }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 gap-2">
        <div className="p-2 bg-surface-0 rounded border border-surface-3 text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider block">Income</span>
          <span className="text-sm font-mono font-medium text-emerald-400">{fmt(d.avg_monthly_income)}</span>
          <span className="text-[10px] text-zinc-600 block">/month</span>
        </div>
        <div className="p-2 bg-surface-0 rounded border border-surface-3 text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider block">Expenses</span>
          <span className="text-sm font-mono font-medium text-rose-400">{fmt(d.avg_monthly_expenses)}</span>
          <span className="text-[10px] text-zinc-600 block">/month</span>
        </div>
        <div className="p-2 bg-surface-0 rounded border border-surface-3 text-center">
          <span className="text-[10px] text-muted uppercase tracking-wider block">Surplus</span>
          <span className="text-sm font-mono font-medium text-accent">{fmt(d.surplus)}</span>
          <span className="text-[10px] text-zinc-600 block">/month</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <DetailRow label="Transfer amount" value={fmt(d.transfer_amount)} />
        <DetailRow label="Savings rate" value={d.savings_rate != null ? fmtPct(d.savings_rate) : undefined} />
      </div>
    </div>
  );
}

function AnomalyDetails({ d }: { d: Record<string, any> }) {
  const mean = d.category_mean ?? d.merchant_mean;
  const zScore = d.z_score ?? 0;
  const barWidth = Math.min(100, Math.max(0, (zScore / 6) * 100));

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2">
        <DetailRow label="Merchant" value={d.merchant_name} />
        <DetailRow label="Amount" value={fmt(d.amount)} />
        <DetailRow label="Category" value={d.category} className="capitalize" />
        <DetailRow label="Date" value={d.date ? fmtDate(d.date) : undefined} />
        <DetailRow label="Category avg" value={fmt(mean)} />
        <DetailRow label="Z-score" value={zScore.toFixed(1)} />
      </div>
      {/* Z-score visual bar */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted">Normal</span>
          <span className="text-[10px] text-muted">Outlier</span>
        </div>
        <div className="h-1.5 bg-surface-3 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500"
            style={{ width: `${barWidth}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  full,
  className,
}: {
  label: string;
  value: any;
  full?: boolean;
  className?: string;
}) {
  if (value == null) return null;
  return (
    <div className={full ? "col-span-2" : ""}>
      <span className="text-[10px] text-muted uppercase tracking-wider">{label}</span>
      <p className={`text-xs font-medium mt-0.5 ${className ?? ""}`}>{value}</p>
    </div>
  );
}

// ── Main component ──

export function ProposalCard({
  proposal,
  onUpdate,
}: {
  proposal: Proposal;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [confirmReject, setConfirmReject] = useState(false);
  const { toast } = useToast();

  const act = async (action: "approve" | "reject" | "execute") => {
    setLoading(action);
    try {
      if (action === "approve") {
        await api.approveProposal(proposal.id);
        toast("Proposal approved", "success");
      } else if (action === "reject") {
        await api.rejectProposal(proposal.id);
        toast("Proposal rejected", "info");
      } else {
        await api.executeProposal(proposal.id);
        toast("Proposal executed (simulated)", "success");
      }
      onUpdate();
    } catch (err: any) {
      toast(err.message || "Action failed", "error");
    } finally {
      setLoading(null);
    }
  };

  const details = proposal.details as Record<string, any>;

  const DetailComponent =
    proposal.type === "subscription_cancellation"
      ? SubscriptionDetails
      : proposal.type === "savings_transfer"
        ? SavingsDetails
        : AnomalyDetails;

  return (
    <>
      <div className="border border-surface-3 rounded-lg bg-surface-1 overflow-hidden">
        {/* Header */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${typeColors[proposal.type]}`}
                >
                  {typeLabels[proposal.type]}
                </span>
                <span
                  className={`text-[10px] font-medium uppercase tracking-wider ${statusColors[proposal.status]}`}
                >
                  {proposal.status}
                </span>
              </div>
              <h3 className="text-sm font-semibold leading-snug">
                {proposal.title}
              </h3>
            </div>
            {proposal.estimated_savings != null && (
              <div className="text-right shrink-0">
                <span className="text-xs text-muted">saves</span>
                <p className="text-sm font-mono font-semibold text-accent">
                  {fmt(proposal.estimated_savings)}/mo
                </p>
              </div>
            )}
          </div>

          <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
            {proposal.explanation}
          </p>

          {/* Expandable details */}
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-[10px] text-muted hover:text-zinc-300 mt-2 uppercase tracking-wider"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>

          {expanded && (
            <div className="mt-3 p-3 bg-surface-0 rounded border border-surface-3 space-y-3">
              <DetailComponent d={details} />

              {/* Raw JSON toggle */}
              <button
                onClick={() => setShowRaw(!showRaw)}
                className="text-[10px] text-zinc-600 hover:text-zinc-400 uppercase tracking-wider"
              >
                {showRaw ? "Hide raw JSON" : "Raw JSON"}
              </button>
              {showRaw && (
                <pre className="text-[11px] text-zinc-600 font-mono whitespace-pre-wrap overflow-x-auto p-2 bg-surface-1 rounded border border-surface-3">
                  {JSON.stringify(details, null, 2)}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        {proposal.status === "pending" && (
          <div className="flex border-t border-surface-3">
            <button
              onClick={() => act("approve")}
              disabled={loading !== null}
              className="flex-1 py-2.5 text-xs font-semibold text-emerald-400
                         hover:bg-emerald-500/10 transition-colors
                         disabled:opacity-40 border-r border-surface-3"
            >
              {loading === "approve" ? "..." : "Approve"}
            </button>
            <button
              onClick={() => setConfirmReject(true)}
              disabled={loading !== null}
              className="flex-1 py-2.5 text-xs font-semibold text-zinc-500
                         hover:bg-zinc-500/10 transition-colors
                         disabled:opacity-40"
            >
              {loading === "reject" ? "..." : "Reject"}
            </button>
          </div>
        )}

        {proposal.status === "approved" && (
          <div className="flex border-t border-surface-3">
            <button
              onClick={() => act("execute")}
              disabled={loading !== null}
              className="flex-1 py-2.5 text-xs font-semibold text-blue-400
                         hover:bg-blue-500/10 transition-colors
                         disabled:opacity-40"
            >
              {loading === "execute" ? "Executing..." : "Execute (simulated)"}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmReject}
        title="Reject proposal?"
        message={`This will reject "${proposal.title}". The action will be recorded in the audit log.`}
        confirmLabel="Reject"
        confirmVariant="danger"
        onConfirm={() => {
          setConfirmReject(false);
          act("reject");
        }}
        onCancel={() => setConfirmReject(false)}
      />
    </>
  );
}
