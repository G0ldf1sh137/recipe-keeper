import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { updateUsername } from "#/auth/username.functions";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ context }) => context.user,
  component: SettingsPage,
});

function SettingsPage() {
  const user = Route.useLoaderData();
  const updateUsernameFn = useServerFn(updateUsername);

  const [username, setUsername] = useState(user.username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const result = await updateUsernameFn({ data: { username } });
      if (result.error) {
        setError(result.error);
      } else {
        setUsername(result.user.username ?? username);
        setSaved(true);
      }
    } catch {
      setError("Use 3-30 lowercase letters, numbers, or hyphens.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Settings</h1>

      <div className="mt-6 flex items-center gap-4">
        {user.avatarUrl && (
          <img src={user.avatarUrl} alt={user.name} className="h-12 w-12 rounded-full" />
        )}
        <div>
          <p className="font-medium text-ink">{user.name}</p>
          <p className="text-sm text-ink/60">{user.email}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-2">
        <label className="flex flex-col gap-1">
          <span className="font-medium text-ink/70">Username</span>
          <input
            className="rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <p className="text-sm text-ink/50">
          Your public profile is at /u/{username || "..."}.{" "}
          {user.username && (
            <Link
              to="/u/$username"
              params={{ username: user.username }}
              className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
            >
              View profile
            </Link>
          )}
        </p>
        {error && <p className="text-red-600">{error}</p>}
        {saved && <p className="text-green-700">Saved.</p>}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 self-start rounded-lg bg-accent-600 px-4 py-2 font-medium text-white hover:bg-accent-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
