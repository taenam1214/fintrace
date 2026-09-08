import { useCallback, useEffect, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { api } from "../lib/api";

export function PlaidLinkButton({ onSuccess }: { onSuccess: () => void }) {
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.createLinkToken().then((d) => setLinkToken(d.link_token));
  }, []);

  const onPlaidSuccess = useCallback(
    async (publicToken: string) => {
      setLoading(true);
      try {
        await api.exchangeToken(publicToken);
        onSuccess();
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

  return (
    <button
      onClick={() => open()}
      disabled={!ready || loading}
      className="px-5 py-2.5 bg-accent text-surface-0 font-semibold text-sm rounded-md
                 hover:bg-emerald-300 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-colors"
    >
      {loading ? "Connecting..." : "Connect Bank Account"}
    </button>
  );
}
