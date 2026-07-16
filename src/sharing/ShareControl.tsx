import { useState } from "react";

type ShareControlProps = {
  shareUrl: string | null;
  disabled: boolean;
  onShare: () => Promise<unknown>;
  onRevoke: () => Promise<unknown>;
};

export function ShareControl({ shareUrl, disabled, onShare, onRevoke }: ShareControlProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    setPending(true);
    setError(null);
    try {
      await onShare();
    } catch {
      setError("Set the visibility to public before sharing.");
    } finally {
      setPending(false);
    }
  }

  async function handleRevoke() {
    setPending(true);
    setError(null);
    try {
      await onRevoke();
    } finally {
      setPending(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(new URL(shareUrl, window.location.origin).toString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (shareUrl) {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <input
            readOnly
            value={new URL(shareUrl, window.location.origin).toString()}
            onFocus={(e) => e.target.select()}
            className="flex-1 rounded-lg border border-accent-100 bg-surface px-3 py-1.5 text-sm text-ink/70"
          />
          <button
            type="button"
            onClick={handleCopy}
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
          <button
            type="button"
            onClick={handleRevoke}
            disabled={pending}
            className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
          >
            {pending ? "Revoking..." : "Revoke"}
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={disabled || pending}
        className="text-sm font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50 dark:hover:text-accent-400"
      >
        {pending ? "Creating link..." : "Share"}
      </button>
      {disabled && <p className="text-sm text-ink/50">Set visibility to public to share.</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
