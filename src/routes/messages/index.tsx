import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { getSessionUser } from "#/auth/auth.functions";
import { listConversations } from "#/messages/messages.functions";

export const Route = createFileRoute("/messages/")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  loader: () => listConversations(),
  component: MessagesPage,
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

function MessagesPage() {
  const conversations = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Messages</h1>

      {conversations.length === 0 ? (
        <p className="mt-6 text-ink/60">No conversations yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {conversations.map((conversation) => (
            <li key={conversation.conversationId}>
              <Link
                to="/messages/$conversationId"
                params={{ conversationId: conversation.conversationId }}
                className={`flex items-center gap-3 rounded-xl border-2 bg-surface px-4 py-3 shadow-sm ${
                  conversation.unreadCount > 0 ? "border-accent-400" : "border-accent-200"
                }`}
              >
                {conversation.otherUser.avatarUrl && (
                  <img
                    src={conversation.otherUser.avatarUrl}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 rounded-full"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-serif text-lg font-medium text-ink">
                      {conversation.otherUser.name}
                    </span>
                    {conversation.lastMessage && (
                      <span className="text-xs text-ink/40">
                        {formatRelativeTime(conversation.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>
                  {conversation.lastMessage && (
                    <p className="truncate text-sm text-ink/60">{conversation.lastMessage.body}</p>
                  )}
                </div>
                {conversation.unreadCount > 0 && (
                  <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                    {conversation.unreadCount}
                  </span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
