import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getBlockedUsers, unblockUser } from "#/blocks/blocks.functions";

export const Route = createFileRoute("/settings/blocked-users")({
  loader: async () => getBlockedUsers(),
  component: BlockedUsersPage,
});

function BlockedUsersPage() {
  const blockedUsers = Route.useLoaderData();
  const router = useRouter();
  const unblockUserFn = useServerFn(unblockUser);

  async function handleUnblock(userId: string) {
    await unblockUserFn({ data: { userId } });
    await router.invalidate();
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/settings"
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Settings
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink">Blocked users</h1>

      {blockedUsers.length === 0 ? (
        <p className="mt-6 text-ink/60">You haven't blocked anyone.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {blockedUsers.map((blocked) => (
            <li
              key={blocked.id}
              className="flex items-center justify-between gap-4 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {blocked.avatarUrl && (
                  <img src={blocked.avatarUrl} alt="" loading="lazy" className="h-8 w-8 rounded-full" />
                )}
                <span className="font-medium text-ink">{blocked.name}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleUnblock(blocked.id)}
                className="rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-accent-50"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
