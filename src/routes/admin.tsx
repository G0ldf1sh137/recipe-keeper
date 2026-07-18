import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { deleteUser, searchUsers, setUserAdmin, setUserModerator, setUserIsSubscriber } from "#/auth/admin.functions";
import { startImpersonation } from "#/auth/impersonation.functions";
import { listOpenReports, resolveReport } from "#/reports/reports.functions";
import { deleteComment } from "#/comments/comments.functions";
import { deleteMessage } from "#/messages/messages.functions";
import { moderatorDeleteRecipe } from "#/recipes/recipes.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    if (!user.isAdmin && !user.isModerator) throw redirect({ to: "/" });
    return { user };
  },
  loader: async ({ context }) => {
    const reports = await listOpenReports();
    return { reports, currentUserId: context.user.id, isAdmin: context.user.isAdmin };
  },
  component: AdminPage,
});

function AdminPage() {
  const { reports, currentUserId, isAdmin } = Route.useLoaderData();
  const router = useRouter();
  const setUserAdminFn = useServerFn(setUserAdmin);
  const setUserModeratorFn = useServerFn(setUserModerator);
  const setUserIsSubscriberFn = useServerFn(setUserIsSubscriber);
  const resolveReportFn = useServerFn(resolveReport);
  const deleteCommentFn = useServerFn(deleteComment);
  const deleteMessageFn = useServerFn(deleteMessage);
  const moderatorDeleteRecipeFn = useServerFn(moderatorDeleteRecipe);
  const searchUsersFn = useServerFn(searchUsers);
  const startImpersonationFn = useServerFn(startImpersonation);
  const deleteUserFn = useServerFn(deleteUser);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchUsers>> | null>(null);
  const [searching, setSearching] = useState(false);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults(null);
      setSearching(false);
      return;
    }
    setSearching(true);
    const requestId = ++requestIdRef.current;
    const timeout = setTimeout(() => {
      void searchUsersFn({ data: { q: trimmed } }).then((matches) => {
        if (requestIdRef.current !== requestId) return;
        setResults(matches);
        setSearching(false);
      });
    }, 300);
    return () => clearTimeout(timeout);
  }, [query, searchUsersFn]);

  async function handleToggle(userId: string, targetIsAdmin: boolean) {
    await setUserAdminFn({ data: { userId, isAdmin: !targetIsAdmin } });
    await router.invalidate();
    if (query.trim()) void searchUsersFn({ data: { q: query.trim() } }).then(setResults);
  }

  async function handleToggleModerator(userId: string, isModerator: boolean) {
    await setUserModeratorFn({ data: { userId, isModerator: !isModerator } });
    await router.invalidate();
    if (query.trim()) void searchUsersFn({ data: { q: query.trim() } }).then(setResults);
  }

  async function handleToggleSubscriber(userId: string, isSubscriber: boolean) {
    await setUserIsSubscriberFn({ data: { userId, isSubscriber: !isSubscriber } });
    await router.invalidate();
    if (query.trim()) void searchUsersFn({ data: { q: query.trim() } }).then(setResults);
  }

  async function handleResolve(reportId: string) {
    await resolveReportFn({ data: { reportId } });
    await router.invalidate();
  }

  async function handleDeleteComment(commentId: string) {
    if (!window.confirm("Delete this comment? This can't be undone.")) return;
    await deleteCommentFn({ data: { commentId } });
    await router.invalidate();
  }

  async function handleDeleteMessage(messageId: string) {
    if (!window.confirm("Delete this message? This can't be undone.")) return;
    await deleteMessageFn({ data: { messageId } });
    await router.invalidate();
  }

  async function handleDeleteRecipe(recipeId: string) {
    if (!window.confirm("Delete this recipe? This can't be undone.")) return;
    await moderatorDeleteRecipeFn({ data: { id: recipeId } });
    await router.invalidate();
  }

  async function handleImpersonate(userId: string) {
    await startImpersonationFn({ data: { userId } });
    // Full reload, not router.invalidate() — every component on the page may have
    // local state seeded from the admin's identity, which only a fresh mount picks up.
    window.location.href = "/";
  }

  async function handleDeleteUser(userId: string, name: string) {
    if (!window.confirm(`Delete ${name}'s account? This removes all their recipes and other content. This can't be undone.`)) {
      return;
    }
    await deleteUserFn({ data: { userId } });
    if (query.trim()) void searchUsersFn({ data: { q: query.trim() } }).then(setResults);
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Admin</h1>

      <section className="mt-6">
        <h2 className="font-serif text-xl font-semibold text-ink">Reports</h2>
        {reports.length === 0 ? (
          <p className="mt-2 text-ink/60">No open reports.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {reports.map((report) => (
              <li
                key={report.id}
                className="rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
              >
                <p className="text-sm text-ink/60">
                  Reported by <span className="font-medium text-ink">{report.reporter.name}</span>
                </p>
                {report.recipe && (
                  <p className="mt-1">
                    <Link
                      to="/recipes/$recipeId"
                      params={{ recipeId: report.recipe.id }}
                      className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                    >
                      {report.recipe.title}
                    </Link>
                  </p>
                )}
                {report.comment && (
                  <div className="mt-1">
                    <p className="whitespace-pre-wrap text-ink/80">"{report.comment.body}"</p>
                    <Link
                      to="/recipes/$recipeId"
                      params={{ recipeId: report.comment.recipeId }}
                      className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                    >
                      View recipe
                    </Link>
                  </div>
                )}
                {report.message && (
                  <p className="mt-1 whitespace-pre-wrap text-ink/80">"{report.message.body}"</p>
                )}
                <p className="mt-2 text-sm text-ink/70">Reason: {report.reason}</p>
                <div className="mt-2 flex gap-3">
                  {report.comment ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(report.comment!.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Delete comment
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(report.id)}
                        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : report.message ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDeleteMessage(report.message!.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Delete message
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(report.id)}
                        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                      >
                        Dismiss
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleDeleteRecipe(report.recipe!.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Delete recipe
                      </button>
                      <button
                        type="button"
                        onClick={() => handleResolve(report.id)}
                        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                      >
                        Dismiss
                      </button>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {isAdmin && (
      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Users</h2>
        <p className="mt-1 text-ink/60">
          Search by name, email, or username to grant/revoke admin access and subscriber status.
        </p>

        <input
          className="mt-3 w-full rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search users..."
        />

        {!query.trim() ? (
          <p className="mt-3 text-ink/60">Start typing to search.</p>
        ) : searching && results === null ? (
          <p className="mt-3 text-ink/60">Searching...</p>
        ) : results && results.length === 0 ? (
          <p className="mt-3 text-ink/60">No matching users.</p>
        ) : (
          results && (
            <ul className="mt-3 flex flex-col gap-3">
              {results.map((user) => (
                <li
                  key={user.id}
                  className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
                >
                  <div className="flex items-center gap-3">
                    {(user.avatarOverrideUrl ?? user.avatarUrl) && (
                      <img
                        src={user.avatarOverrideUrl ?? user.avatarUrl ?? undefined}
                        alt=""
                        loading="lazy"
                        className="h-9 w-9 rounded-full ring-2 ring-accent-100"
                      />
                    )}
                    <div>
                      <p className="font-medium text-ink">{user.name}</p>
                      <p className="text-sm text-ink/60">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleSubscriber(user.id, user.isSubscriber)}
                      className={
                        user.isSubscriber
                          ? "rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
                          : "rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
                      }
                    >
                      {user.isSubscriber ? "Revoke subscriber" : "Make subscriber"}
                    </button>
                    {user.id === currentUserId ? (
                      <span className="text-sm font-medium text-ink/50">You</span>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={() => handleToggle(user.id, user.isAdmin)}
                          className={
                            user.isAdmin
                              ? "rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
                              : "rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
                          }
                        >
                          {user.isAdmin ? "Revoke admin" : "Make admin"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleModerator(user.id, user.isModerator)}
                          className={
                            user.isModerator
                              ? "rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
                              : "rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
                          }
                        >
                          {user.isModerator ? "Revoke moderator" : "Make moderator"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleImpersonate(user.id)}
                          className="rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
                        >
                          Impersonate user
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteUser(user.id, user.name)}
                          className="rounded-lg border-2 border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50"
                        >
                          Delete user
                        </button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
      )}
    </div>
  );
}
