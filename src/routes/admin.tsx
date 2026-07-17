import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { listUsers, setUserAdmin } from "#/auth/admin.functions";

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    if (!user.isAdmin) throw redirect({ to: "/" });
    return { user };
  },
  loader: async ({ context }) => {
    const users = await listUsers();
    return { users, currentUserId: context.user.id };
  },
  component: AdminPage,
});

function AdminPage() {
  const { users, currentUserId } = Route.useLoaderData();
  const router = useRouter();
  const setUserAdminFn = useServerFn(setUserAdmin);

  async function handleToggle(userId: string, isAdmin: boolean) {
    await setUserAdminFn({ data: { userId, isAdmin: !isAdmin } });
    await router.invalidate();
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Admin</h1>
      <p className="mt-2 text-ink/60">Grant or revoke admin access for other users.</p>

      <ul className="mt-6 flex flex-col gap-3">
        {users.map((user) => (
          <li
            key={user.id}
            className="flex items-center justify-between gap-4 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
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
          </li>
        ))}
      </ul>
    </div>
  );
}
