interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "default";
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  confirmVariant = "default",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="dialog-backdrop" onClick={onCancel}>
      <div
        className="bg-surface-1 border border-surface-3 rounded-lg shadow-2xl p-5 w-full max-w-sm fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-semibold mb-2">{title}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed mb-5">{message}</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 border border-surface-3
                       rounded-md hover:border-zinc-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              confirmVariant === "danger"
                ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/30"
                : "bg-accent/20 text-accent hover:bg-accent/30 border border-accent/30"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
