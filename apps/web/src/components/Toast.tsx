import { createContext, useCallback, useContext, useState } from "react";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

let nextId = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = "info") => {
    const id = nextId++;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast-enter px-4 py-3 rounded-lg border shadow-lg text-sm flex items-start gap-3 ${typeStyles[t.type]}`}
          >
            <span className="shrink-0 mt-0.5">{typeIcons[t.type]}</span>
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 text-current opacity-40 hover:opacity-80 transition-opacity"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const typeStyles: Record<ToastType, string> = {
  success: "bg-emerald-500/10 border-emerald-500/20 text-emerald-300",
  error: "bg-rose-500/10 border-rose-500/20 text-rose-300",
  info: "bg-sky-500/10 border-sky-500/20 text-sky-300",
};

const typeIcons: Record<ToastType, string> = {
  success: "\u2713",
  error: "\u2717",
  info: "\u2139",
};
