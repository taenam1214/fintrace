import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../lib/api";

export function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .createLinkToken()
      .then((d) => setLinkToken(d.link_token))
      .catch(() => setError("Failed to init Plaid"));
  }, []);

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
