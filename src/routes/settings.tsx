import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { updateUsername } from "#/auth/username.functions";
import { updateNotificationPreferences } from "#/notifications/notifications.functions";

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
  const updateNotificationPreferencesFn = useServerFn(updateNotificationPreferences);

  const [username, setUsername] = useState(user.username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [notifyOnComment, setNotifyOnComment] = useState(user.notifyOnComment);
  const [notifyOnRating, setNotifyOnRating] = useState(user.notifyOnRating);
  const [notifyOnFork, setNotifyOnFork] = useState(user.notifyOnFork);
  const [notificationsSaved, setNotificationsSaved] = useState(false);
  const [notificationsSubmitting, setNotificationsSubmitting] = useState(false);

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

  async function handleNotificationsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setNotificationsSubmitting(true);
    setNotificationsSaved(false);
    try {
      await updateNotificationPreferencesFn({ data: { notifyOnComment, notifyOnRating, notifyOnFork } });
      setNotificationsSaved(true);
    } finally {
      setNotificationsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
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

      <form onSubmit={handleNotificationsSubmit} className="mt-8 flex flex-col gap-2">
        <h2 className="font-serif text-xl font-semibold text-ink">Notifications</h2>
        <p className="text-sm text-ink/50">Notify me when someone...</p>
        <label className="flex items-center gap-2 text-ink/70">
          <input
            type="checkbox"
            className="accent-accent-600"
            checked={notifyOnComment}
            onChange={(e) => setNotifyOnComment(e.target.checked)}
          />
          comments on one of my recipes
        </label>
        <label className="flex items-center gap-2 text-ink/70">
          <input
            type="checkbox"
            className="accent-accent-600"
            checked={notifyOnRating}
            onChange={(e) => setNotifyOnRating(e.target.checked)}
          />
          rates one of my recipes
        </label>
        <label className="flex items-center gap-2 text-ink/70">
          <input
            type="checkbox"
            className="accent-accent-600"
            checked={notifyOnFork}
            onChange={(e) => setNotifyOnFork(e.target.checked)}
          />
          forks one of my recipes
        </label>
        {notificationsSaved && <p className="text-green-700">Saved.</p>}
        <button
          type="submit"
          disabled={notificationsSubmitting}
          className="mt-2 self-start rounded-lg bg-accent-600 px-4 py-2 font-medium text-white hover:bg-accent-700 disabled:opacity-50"
        >
          {notificationsSubmitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
