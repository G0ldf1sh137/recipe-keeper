import { useState } from "react";

export function ReportButton({ onReport }: { onReport: (reason: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await onReport(reason.trim());
      setDone(true);
      setOpen(false);
    } catch {
      setError("Could not submit your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return <span className="text-sm text-ink/50">Reported</span>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm font-medium text-ink/50 hover:text-ink"
      >
        Report
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-1 flex flex-col gap-1">
      <textarea
        className="w-full rounded-lg border border-accent-100 px-2 py-1 text-sm focus:border-accent-400 focus:outline-none"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Why are you reporting this?"
        autoFocus
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={submitting || !reason.trim()}
          className="rounded-lg bg-accent-600 px-2.5 py-1 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-sm text-ink/50 hover:text-ink"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
