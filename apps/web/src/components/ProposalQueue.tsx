import { useCallback, useEffect, useState } from "react";
import type { Proposal } from "@fintrace/shared";
import { api } from "../lib/api";
import { ProposalCard } from "./ProposalCard";

const STATUS_FILTERS = ["all", "pending", "approved", "rejected", "executed"] as const;

export function ProposalQueue() {
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [analyzing, setAnalyzing] = useState(false);

  const load = useCallback(async () => {
    const data = await api.getProposals(
      filter === "all" ? undefined : filter
    );
    setProposals(data);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const runAnalysis = async () => {
    setAnalyzing(true);
    try {
      await api.runAnalysis();
      await load();
    } finally {
      setAnalyzing(false);
    }
  };

  const pendingCount = proposals.filter((p) => p.status === "pending").length;

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
            Proposals
            {pendingCount > 0 && (
              <span className="ml-2 px-1.5 py-0.5 text-[10px] bg-accent/10 text-accent rounded">
                {pendingCount} pending
              </span>
            )}
          </h2>
        </div>
        <button
          onClick={runAnalysis}
          disabled={analyzing}
          className="px-4 py-1.5 text-xs font-semibold bg-surface-2 border border-surface-3
                     hover:border-zinc-500 rounded transition-colors disabled:opacity-40"
        >
          {analyzing ? "Analyzing..." : "Run Agent Analysis"}
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-4">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-2.5 py-1 text-[11px] rounded transition-colors capitalize ${
              filter === s
                ? "bg-surface-3 text-zinc-100"
                : "text-muted hover:text-zinc-300"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* List */}
      {proposals.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">No proposals yet.</p>
          <p className="text-muted text-xs mt-1">
            Connect a bank account and run the agent analysis.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {proposals.map((p) => (
            <ProposalCard key={p.id} proposal={p} onUpdate={load} />
          ))}
        </div>
      )}
    </div>
  );
}
