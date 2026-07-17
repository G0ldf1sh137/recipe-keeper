import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { listUsers, setUserAdmin, setUserCanTranscribe } from "#/auth/admin.functions";
import { listOpenReports, resolveReport } from "#/reports/reports.functions";
import { deleteComment } from "#/comments/comments.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    if (!user.isAdmin) throw redirect({ to: "/" });
    return { user };
  },
  loader: async ({ context }) => {
    const [users, reports] = await Promise.all([listUsers(), listOpenReports()]);
    return { users, reports, currentUserId: context.user.id };
  },
  component: AdminPage,
});

function AdminPage() {
  const { users, reports, currentUserId } = Route.useLoaderData();
  const router = useRouter();
  const setUserAdminFn = useServerFn(setUserAdmin);
  const setUserCanTranscribeFn = useServerFn(setUserCanTranscribe);
  const resolveReportFn = useServerFn(resolveReport);
  const deleteCommentFn = useServerFn(deleteComment);

  async function handleToggle(userId: string, isAdmin: boolean) {
    await setUserAdminFn({ data: { userId, isAdmin: !isAdmin } });
    await router.invalidate();
  }

  async function handleToggleTranscribe(userId: string, canTranscribe: boolean) {
    await setUserCanTranscribeFn({ data: { userId, canTranscribe: !canTranscribe } });
    await router.invalidate();
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
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleResolve(report.id)}
                      className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Users</h2>
        <p className="mt-1 text-ink/60">Grant or revoke admin access and AI import permissions for other users.</p>

        <ul className="mt-3 flex flex-col gap-3">
          {users.map((user) => (
            <li
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-4 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {user.avatarUrl && (
                  <img src={user.avatarUrl} alt="" className="h-9 w-9 rounded-full ring-2 ring-accent-100" />
                )}
                <div>
                  <p className="font-medium text-ink">{user.name}</p>
                  <p className="text-sm text-ink/60">{user.email}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleTranscribe(user.id, user.canTranscribe)}
                  className={
                    user.canTranscribe
                      ? "rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
                      : "rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700"
                  }
                >
                  {user.canTranscribe ? "Disable AI import" : "Enable AI import"}
                </button>
                {user.id === currentUserId ? (
                  <span className="text-sm font-medium text-ink/50">You</span>
                ) : (
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
                )}
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
