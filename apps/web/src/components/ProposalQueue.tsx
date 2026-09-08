import { useCallback, useEffect, useState } from "react";
import type { Proposal } from "@fintrace/shared";
import { api } from "../lib/api";
import { ProposalCard } from "./ProposalCard";

const STATUS_FILTERS = [
  "all",
  "pending",
  "approved",
  "rejected",
  "executed",
] as const;

export function ProposalQueue() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [lastResult, setLastResult] = useState<{
    total: number;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getProposals(
        filter === "all" ? undefined : filter
      );
      setProposals(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    setLastResult(null);
    try {
      const result = await api.runAnalysis();
      setLastResult({ total: result.total });
      await load();
    } finally {
      setAnalyzing(false);
    }
  };

  const pendingCount = proposals.filter((p) => p.status === "pending").length;
  const totalSavings = proposals
    .filter((p) => p.status === "pending" && p.estimated_savings)
    .reduce((s, p) => s + (p.estimated_savings || 0), 0);

  return (
    <div>
      {/* Header row */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-1">
            Agent Proposals
          </h2>
          {pendingCount > 0 && (
            <p className="text-xs text-zinc-500">
              <span className="text-accent font-medium">{pendingCount}</span>{" "}
              pending review
              {totalSavings > 0 && (
                <>
                  {" · "}
                  <span className="text-accent font-medium">
                    ${totalSavings.toFixed(2)}
                  </span>{" "}
                  potential monthly savings
                </>
              )}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3">
          {lastResult && !analyzing && (
            <span className="text-[11px] text-zinc-500 fade-in">
              {lastResult.total === 0
                ? "No new proposals"
                : `${lastResult.total} new proposal${lastResult.total > 1 ? "s" : ""}`}
            </span>
          )}
          <button
            onClick={runAnalysis}
            disabled={analyzing}
            className="px-4 py-2 text-xs font-medium bg-surface-1 border border-surface-3
                       hover:border-accent/30 hover:text-accent rounded-md transition-all
                       disabled:opacity-40 flex items-center gap-2"
          >
            {analyzing && <div className="spinner" />}
            {analyzing ? "Analyzing..." : "Run Analysis"}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1 mb-5 pb-4 border-b border-surface-3">
        {STATUS_FILTERS.map((s) => {
          const count = s === "all"
            ? proposals.length
            : proposals.filter((p) => p.status === s).length;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-2.5 py-1 text-[11px] rounded transition-colors capitalize flex items-center gap-1.5 ${
                filter === s
                  ? "bg-surface-3 text-zinc-100"
                  : "text-zinc-600 hover:text-zinc-300"
              }`}
            >
              {s}
              {count > 0 && (
                <span className={`text-[10px] ${filter === s ? "text-zinc-400" : "text-zinc-700"}`}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="spinner text-muted" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="text-center py-16 fade-in">
          <div className="w-12 h-12 rounded-xl bg-surface-1 border border-surface-3 flex items-center justify-center mx-auto mb-4">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-zinc-600">
              <path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </div>
          <p className="text-zinc-500 text-sm">No proposals found</p>
          <p className="text-zinc-700 text-xs mt-1">
            {filter !== "all"
              ? "Try a different filter."
              : "Connect an account and run the agent analysis."}
          </p>
        </div>
      ) : (
        <div className="space-y-3 fade-in">
          {proposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}
