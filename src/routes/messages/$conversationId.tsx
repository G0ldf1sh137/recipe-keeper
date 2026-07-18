import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { getConversation, sendMessage } from "#/messages/messages.functions";
import { reportMessage } from "#/reports/reports.functions";
import { ReportButton } from "#/reports/ReportButton";

export const Route = createFileRoute("/messages/$conversationId")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ params, context }) => {
    const conversation = await getConversation({ data: { id: params.conversationId } });
    return { ...conversation, viewerId: context.user.id };
  },
  component: ConversationPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">Conversation not found</h1>
      <p className="mt-2 text-ink/60">
        <Link
          to="/messages"
          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Back to messages
        </Link>
      </p>
    </div>
  ),
});

function formatRelativeTime(date: Date) {
  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function ConversationPage() {
  const { conversationId, otherUser, messages: loaderMessages, viewerId } = Route.useLoaderData();
  const router = useRouter();
  const sendMessageFn = useServerFn(sendMessage);
  const reportMessageFn = useServerFn(reportMessage);

  const [messages, setMessages] = useState(loaderMessages);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMessages(loaderMessages);
  }, [loaderMessages]);

  useEffect(() => {
    // Clears the header's unread badge immediately, since this page's own loader
    // just marked this conversation's messages read.
    void router.invalidate();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      await sendMessageFn({ data: { conversationId, body: body.trim() } });
      setBody("");
      await router.invalidate();
    } catch {
      setError("Could not send your message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReport(messageId: string, reason: string) {
    await reportMessageFn({ data: { messageId, reason } });
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/messages"
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Messages
      </Link>
      <div className="mt-4 flex items-center gap-3">
        {otherUser.avatarUrl && (
          <img src={otherUser.avatarUrl} alt="" loading="lazy" className="h-10 w-10 rounded-full" />
        )}
        <h1 className="font-serif text-2xl font-semibold text-ink">{otherUser.name}</h1>
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {messages.map((message) => {
          const isMine = message.senderId === viewerId;
          return (
            <li key={message.id} className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}>
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2 shadow-sm ${
                  isMine ? "bg-accent-600 text-white" : "border-2 border-accent-200 bg-surface text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.body}</p>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-xs text-ink/40">{formatRelativeTime(message.createdAt)}</span>
                {!isMine && (
                  <ReportButton onReport={(reason) => handleReport(message.id, reason)} />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <form onSubmit={handleSubmit} className="mt-6">
        <textarea
          className="w-full rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          rows={2}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message..."
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={submitting || !body.trim()}
          className="mt-2 rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {submitting ? "Sending..." : "Send"}
        </button>
      </form>
    </div>
  );
}
