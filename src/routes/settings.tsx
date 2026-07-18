import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { updateUsername, updateVisibilityDefaults } from "#/auth/username.functions";
import { updateNotificationPreferences } from "#/notifications/notifications.functions";
import { visibilityValues } from "#/db/schema";
import type { Visibility } from "#/db/schema";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ context }) => ({ user: context.user }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = Route.useLoaderData();
  const updateUsernameFn = useServerFn(updateUsername);
  const updateNotificationPreferencesFn = useServerFn(updateNotificationPreferences);
  const updateVisibilityDefaultsFn = useServerFn(updateVisibilityDefaults);

  const [username, setUsername] = useState(user.username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);

  const [notifyOnComment, setNotifyOnComment] = useState(user.notifyOnComment);
  const [notifyOnRating, setNotifyOnRating] = useState(user.notifyOnRating);
  const [notifyOnFork, setNotifyOnFork] = useState(user.notifyOnFork);
  const [notificationsSaved, setNotificationsSaved] = useState(false);
  const [notificationsSubmitting, setNotificationsSubmitting] = useState(false);

  const [defaultRecipeVisibility, setDefaultRecipeVisibility] = useState<Visibility>(
    user.defaultRecipeVisibility,
  );
  const [defaultCollectionVisibility, setDefaultCollectionVisibility] = useState<Visibility>(
    user.defaultCollectionVisibility,
  );
  const [visibilityDefaultsSaved, setVisibilityDefaultsSaved] = useState(false);
  const [visibilityDefaultsSubmitting, setVisibilityDefaultsSubmitting] = useState(false);

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
        setIsEditingUsername(false);
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

  async function handleVisibilityDefaultsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setVisibilityDefaultsSubmitting(true);
    setVisibilityDefaultsSaved(false);
    try {
      await updateVisibilityDefaultsFn({ data: { defaultRecipeVisibility, defaultCollectionVisibility } });
      setVisibilityDefaultsSaved(true);
    } finally {
      setVisibilityDefaultsSubmitting(false);
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
          <div className="flex gap-2">
            <input
              className={`flex-1 rounded-lg border px-3 py-2 focus:outline-none ${
                isEditingUsername
                  ? "border-accent-100 focus:border-accent-400"
                  : "border-transparent bg-accent-50 text-ink/70"
              }`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              readOnly={!isEditingUsername}
            />
            {!isEditingUsername && (
              <button
                type="button"
                onClick={() => setIsEditingUsername(true)}
                className="rounded-lg border-2 border-accent-300 px-4 py-2 font-medium text-ink transition-colors hover:bg-accent-50"
              >
                Edit
              </button>
            )}
          </div>
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
        {isEditingUsername && (
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 self-start rounded-lg bg-accent-600 px-4 py-2 font-medium text-white hover:bg-accent-700 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save"}
          </button>
        )}
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

      <form onSubmit={handleVisibilityDefaultsSubmit} className="mt-8 flex flex-col gap-2">
        <h2 className="font-serif text-xl font-semibold text-ink">Default visibility</h2>
        <p className="text-sm text-ink/50">Applies to new recipes and cookbooks only.</p>
        <label className="flex flex-col gap-1">
          <span className="font-medium text-ink/70">New recipes default to</span>
          <select
            className="rounded-lg border border-accent-100 bg-surface px-3 py-2 text-ink focus:border-accent-400 focus:outline-none"
            value={defaultRecipeVisibility}
            onChange={(e) => setDefaultRecipeVisibility(e.target.value as Visibility)}
          >
            {visibilityValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-medium text-ink/70">New cookbooks default to</span>
          <select
            className="rounded-lg border border-accent-100 bg-surface px-3 py-2 text-ink focus:border-accent-400 focus:outline-none"
            value={defaultCollectionVisibility}
            onChange={(e) => setDefaultCollectionVisibility(e.target.value as Visibility)}
          >
            {visibilityValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        {visibilityDefaultsSaved && <p className="text-green-700">Saved.</p>}
        <button
          type="submit"
          disabled={visibilityDefaultsSubmitting}
          className="mt-2 self-start rounded-lg bg-accent-600 px-4 py-2 font-medium text-white hover:bg-accent-700 disabled:opacity-50"
        >
          {visibilityDefaultsSubmitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
