import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getMutedUsers, unmuteUser } from "#/mutes/mutes.functions";

export const Route = createFileRoute("/settings/muted-users")({
  loader: async () => getMutedUsers(),
  component: MutedUsersPage,
});

function MutedUsersPage() {
  const mutedUsers = Route.useLoaderData();
  const router = useRouter();
  const unmuteUserFn = useServerFn(unmuteUser);

  async function handleUnmute(userId: string) {
    await unmuteUserFn({ data: { userId } });
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
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink">Muted users</h1>

      {mutedUsers.length === 0 ? (
        <p className="mt-6 text-ink/60">You haven't muted anyone.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {mutedUsers.map((muted) => (
            <li
              key={muted.id}
              className="flex items-center justify-between gap-4 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {muted.avatarUrl && (
                  <img src={muted.avatarUrl} alt="" loading="lazy" className="h-8 w-8 rounded-full" />
                )}
                <span className="font-medium text-ink">{muted.name}</span>
              </div>
              <button
                type="button"
                onClick={() => void handleUnmute(muted.id)}
                className="rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-accent-50"
              >
                Unmute
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
