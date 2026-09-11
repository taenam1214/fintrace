import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../lib/api";

export function PlaidLinkButton({ onSuccess, connected }: { onSuccess: () => void; connected?: boolean }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .createLinkToken()
      .then((d) => setLinkToken(d.link_token))
      .catch(() => setError("Failed to init Plaid"));
  }, []);

  // Auto-clear error after 5 seconds
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(() => setError(null), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true);
      setError(null);
      try {
        await api.exchangeToken(publicToken);
        onSuccess();
      } catch {
        setError("Connection failed");
      } finally {
        setLoading(false);
      }
    },
    [onSuccess]
  );

  const { open, ready } = usePlaidLink({
    token: linkToken,
    onSuccess: onPlaidSuccess,
  });

  if (error) {
    return (
      <span className="text-[11px] text-rose-400/80">{error}</span>
    );
  }

  if (connected) {
    return (
      <button
        disabled
        className="px-4 py-2 bg-surface-2 text-zinc-500 font-semibold text-[11px] rounded-md
                   cursor-not-allowed flex items-center gap-2"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        Connected
      </button>
    );
  }

  return (
    <button
      onClick={() => open()}
      disabled={!ready || loading}
      className="px-4 py-2 bg-accent text-surface-0 font-semibold text-[11px] rounded-md
                 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-colors flex items-center gap-2"
    >
      {loading && <div className="spinner text-surface-0" />}
      {loading ? "Connecting..." : "Connect Account"}
    </button>
  );
}
