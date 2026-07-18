export function Toast({
  message,
  actionLabel,
  onAction,
}: {
  message: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="fixed bottom-6 left-1/2 z-20 flex -translate-x-1/2 items-center gap-3 rounded-lg border-2 border-accent-200 bg-paper px-4 py-3 shadow-lg">
      <span className="text-sm text-ink">{message}</span>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-sm font-semibold text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
