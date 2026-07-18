import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { startConversation } from "./messages.functions";

export function MessageButton({ targetUserId }: { targetUserId: string }) {
  const navigate = useNavigate();
  const startConversationFn = useServerFn(startConversation);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    setSubmitting(true);
    setError(null);
    try {
      const conversation = await startConversationFn({ data: { userId: targetUserId } });
      await navigate({ to: "/messages/$conversationId", params: { conversationId: conversation.id } });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start a conversation. Please try again.");
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={submitting}
        className="text-sm font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50 dark:hover:text-accent-400"
      >
        {submitting ? "Starting..." : "Message"}
      </button>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
