import { useState } from "react";
import type { Proposal } from "@fintrace/shared";
import { api } from "../lib/api";

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

function formatCurrency(n: number | null) {
  if (n == null) return null;
  return `$${n.toFixed(2)}`;
}

export function ProposalCard({
  proposal,
  onUpdate,
}: {
  proposal: Proposal;
  onUpdate: () => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const act = async (action: "approve" | "reject" | "execute") => {
    setLoading(action);
    try {
      if (action === "approve") await api.approveProposal(proposal.id);
      else if (action === "reject") await api.rejectProposal(proposal.id);
      else await api.executeProposal(proposal.id);
      onUpdate();
    } finally {
      setLoading(null);
    }
  };

  const details = proposal.details as Record<string, any>;

  return (
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
                {formatCurrency(proposal.estimated_savings)}/mo
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
          <div className="mt-2 p-3 bg-surface-0 rounded border border-surface-3">
            <pre className="text-[11px] text-zinc-500 font-mono whitespace-pre-wrap overflow-x-auto">
              {JSON.stringify(details, null, 2)}
            </pre>
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
            onClick={() => act("reject")}
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
  );
}
