import { useCallback, useEffect, useState } from "react";
import type { AuditEntry } from "@fintrace/shared";
import { api } from "../lib/api";

const ACTION_FILTERS = [
  "all",
  "proposal_created",
  "proposal_approved",
  "proposal_rejected",
  "proposal_executed",
] as const;

const actionLabels: Record<string, string> = {
  proposal_created: "Created",
  proposal_approved: "Approved",
  proposal_rejected: "Rejected",
  proposal_executed: "Executed",
};

const actionColors: Record<string, string> = {
  proposal_created: "text-zinc-400 bg-zinc-500/10",
  proposal_approved: "text-emerald-400 bg-emerald-500/10",
  proposal_rejected: "text-rose-400 bg-rose-500/10",
  proposal_executed: "text-blue-400 bg-blue-500/10",
};

const actorIcons: Record<string, string> = {
  agent: "A",
  user: "U",
};

function formatTimestamp(ts: string) {
  const d = new Date(ts);
  return d.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCurrency(n: number | null | undefined) {
  if (n == null) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

// Render a state object as labeled fields instead of raw JSON
function StateView({
  state,
  variant,
}: {
  state: Record<string, unknown>;
  variant: "before" | "after" | "neutral";
}) {
  const colorClass =
    variant === "before"
      ? "text-rose-400/70"
      : variant === "after"
        ? "text-emerald-400/70"
        : "text-zinc-400";

  const entries = Object.entries(state);
  if (entries.length === 0) return null;

  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 p-2 bg-surface-0 rounded border border-surface-3">
      {entries.map(([key, value]) => (
        <div key={key} className="contents">
          <span className="text-[10px] text-muted font-mono">{key}</span>
          <span className={`text-[11px] font-mono truncate ${colorClass}`}>
            {formatValue(key, value)}
          </span>
        </div>
      ))}
    </div>
  );
}

function formatValue(key: string, value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "number") {
    if (
      key.includes("amount") ||
      key.includes("savings") ||
      key.includes("income") ||
      key.includes("expense") ||
      key.includes("surplus")
    ) {
      return formatCurrency(value) ?? String(value);
    }
    if (key.includes("rate")) return `${(value * 100).toFixed(0)}%`;
    return String(value);
  }
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const data = await api.getAuditLog(
      filter === "all" ? undefined : filter
    );
    setEntries(data);
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h2 className="text-sm font-semibold text-muted uppercase tracking-wider">
          Audit Log
          <span className="ml-2 text-zinc-500 font-normal normal-case">
            ({entries.length} entries)
          </span>
        </h2>
        <div className="flex items-center gap-2">
          <a
            href={`/api/audit/export/json${filter !== "all" ? `?action=${filter}` : ""}`}
            download
            className="px-2.5 py-1 text-[11px] text-muted hover:text-zinc-300 border border-surface-3
                       rounded hover:border-zinc-500 transition-colors"
          >
            Export JSON
          </a>
          <a
            href={`/api/audit/export/csv${filter !== "all" ? `?action=${filter}` : ""}`}
            download
            className="px-2.5 py-1 text-[11px] text-muted hover:text-zinc-300 border border-surface-3
                       rounded hover:border-zinc-500 transition-colors"
          >
            Export CSV
          </a>
          <button
            onClick={load}
            className="px-2.5 py-1 text-[11px] text-muted hover:text-zinc-300 transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {ACTION_FILTERS.map((a) => (
          <button
            key={a}
            onClick={() => setFilter(a)}
            className={`px-2.5 py-1 text-[11px] rounded transition-colors ${
              filter === a
                ? "bg-surface-3 text-zinc-100"
                : "text-muted hover:text-zinc-300"
            }`}
          >
            {a === "all" ? "All" : actionLabels[a]}
          </button>
        ))}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-muted text-sm">No audit entries yet.</p>
        </div>
      ) : (
        <div className="border border-surface-3 rounded-lg overflow-hidden">
          {entries.map((entry, i) => (
            <div
              key={entry.id}
              className={`${i > 0 ? "border-t border-surface-3" : ""}`}
            >
              <button
                onClick={() =>
                  setExpandedId(expandedId === entry.id ? null : entry.id)
                }
                className="w-full text-left px-4 py-3 hover:bg-surface-2/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {/* Actor badge */}
                  <span
                    className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center shrink-0 ${
                      entry.actor === "agent"
                        ? "bg-violet-500/20 text-violet-400"
                        : "bg-sky-500/20 text-sky-400"
                    }`}
                  >
                    {actorIcons[entry.actor]}
                  </span>

                  {/* Action badge */}
                  <span
                    className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${actionColors[entry.action]}`}
                  >
                    {actionLabels[entry.action]}
                  </span>

                  {/* Timestamp */}
                  <span className="text-[11px] text-muted font-mono ml-auto shrink-0">
                    {formatTimestamp(entry.created_at)}
                  </span>
                </div>
              </button>

              {/* Expanded detail */}
              {expandedId === entry.id && (
                <div className="px-4 pb-3 space-y-2 fade-in">
                  {entry.before_state && (
                    <div>
                      <span className="text-[10px] text-muted uppercase tracking-wider">
                        Before
                      </span>
                      <StateView
                        state={entry.before_state as Record<string, unknown>}
                        variant="before"
                      />
                    </div>
                  )}
                  {entry.after_state && (
                    <div>
                      <span className="text-[10px] text-muted uppercase tracking-wider">
                        After
                      </span>
                      <StateView
                        state={entry.after_state as Record<string, unknown>}
                        variant="after"
                      />
                    </div>
                  )}
                  {entry.metadata && (
                    <div>
                      <span className="text-[10px] text-muted uppercase tracking-wider">
                        Metadata
                      </span>
                      <StateView
                        state={entry.metadata as Record<string, unknown>}
                        variant="neutral"
                      />
                    </div>
                  )}
                  <p className="text-[10px] text-zinc-600 font-mono">
                    id: {entry.id}
                    {entry.proposal_id && <> · proposal: {entry.proposal_id}</>}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
