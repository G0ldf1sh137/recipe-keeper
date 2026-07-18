import { useState } from "react";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import {
  updateAvatarOverride,
  updateName,
  updateUsername,
  updateVisibilityDefaults,
  updateWeekStartDay,
} from "#/auth/username.functions";
import { updateNotificationPreferences } from "#/notifications/notifications.functions";
import { updateMessagingPreferences } from "#/messages/messages.functions";
import { AvatarUpload } from "#/uploads/AvatarUpload";
import { getColorThemePreference } from "#/theme/theme.functions";
import { ColorThemeSwitcher } from "#/theme/ColorThemeSwitcher";
import { visibilityValues, weekStartDayValues } from "#/db/schema";
import type { Visibility, WeekStartDay } from "#/db/schema";

const weekStartDayLabels: Record<WeekStartDay, string> = {
  sun: "Sunday",
  mon: "Monday",
};

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ context }) => ({ user: context.user, colorTheme: await getColorThemePreference() }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, colorTheme } = Route.useLoaderData();
  const updateUsernameFn = useServerFn(updateUsername);
  const updateNameFn = useServerFn(updateName);
  const updateAvatarOverrideFn = useServerFn(updateAvatarOverride);
  const updateNotificationPreferencesFn = useServerFn(updateNotificationPreferences);
  const updateVisibilityDefaultsFn = useServerFn(updateVisibilityDefaults);
  const updateMessagingPreferencesFn = useServerFn(updateMessagingPreferences);
  const updateWeekStartDayFn = useServerFn(updateWeekStartDay);

  const [avatarOverrideUrl, setAvatarOverrideUrl] = useState(user.avatarOverrideUrl);

  const [name, setName] = useState(user.name);
  const [username, setUsername] = useState(user.username ?? "");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  const [notifyOnComment, setNotifyOnComment] = useState(user.notifyOnComment);
  const [notifyOnRating, setNotifyOnRating] = useState(user.notifyOnRating);
  const [notifyOnFork, setNotifyOnFork] = useState(user.notifyOnFork);
  const [notifyOnFollow, setNotifyOnFollow] = useState(user.notifyOnFollow);
  const [restrictMessagesToFollowing, setRestrictMessagesToFollowing] = useState(
    user.restrictMessagesToFollowing,
  );

  const [defaultRecipeVisibility, setDefaultRecipeVisibility] = useState<Visibility>(
    user.defaultRecipeVisibility,
  );
  const [defaultCollectionVisibility, setDefaultCollectionVisibility] = useState<Visibility>(
    user.defaultCollectionVisibility,
  );

  const [weekStartDay, setWeekStartDay] = useState<WeekStartDay>(user.weekStartDay);

  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAvatarChange(url: string | null) {
    setAvatarOverrideUrl(url);
    await updateAvatarOverrideFn({ data: { avatarOverrideUrl: url } });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setSaved(false);
    setNameError(null);
    setUsernameError(null);

    let hasError = false;

    try {
      await updateNameFn({ data: { name } });
    } catch {
      setNameError("Could not save your name. Please try again.");
      hasError = true;
    }

    try {
      const result = await updateUsernameFn({ data: { username } });
      if (result.error) {
        setUsernameError(result.error);
        hasError = true;
      } else {
        setUsername(result.user.username ?? username);
      }
    } catch {
      setUsernameError("Use 3-30 lowercase letters, numbers, or hyphens.");
      hasError = true;
    }

    await updateNotificationPreferencesFn({
      data: { notifyOnComment, notifyOnRating, notifyOnFork, notifyOnFollow },
    });
    await updateVisibilityDefaultsFn({ data: { defaultRecipeVisibility, defaultCollectionVisibility } });
    await updateMessagingPreferencesFn({ data: { restrictMessagesToFollowing } });
    await updateWeekStartDayFn({ data: { weekStartDay } });

    if (!hasError) {
      setSaved(true);
      setIsEditingProfile(false);
    }
    setSubmitting(false);
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Settings</h1>

      <div className="mt-6 flex items-center justify-between gap-4">
        <AvatarUpload
          overrideUrl={avatarOverrideUrl}
          fallbackUrl={user.avatarUrl}
          name={name}
          onChange={handleAvatarChange}
        />
        <p className="text-sm text-ink/60">{user.email}</p>
      </div>

      <div className="mt-6 flex flex-col gap-2">
        <h2 className="font-serif text-xl font-semibold text-ink">Appearance</h2>
        <p className="text-sm text-ink/50">Pick a color theme. Applies instantly on this device.</p>
        <ColorThemeSwitcher initialColorTheme={colorTheme} />
      </div>

      <form onSubmit={handleSave} className="mt-6 flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-ink">Profile</h2>
            {!isEditingProfile && (
              <button
                type="button"
                onClick={() => setIsEditingProfile(true)}
                className="rounded-lg border-2 border-accent-300 px-4 py-2 font-medium text-ink transition-colors hover:bg-accent-50"
              >
                Edit
              </button>
            )}
          </div>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-ink/70">Name</span>
            <input
              className={`rounded-lg border px-3 py-2 focus:outline-none ${
                isEditingProfile
                  ? "border-accent-100 focus:border-accent-400"
                  : "border-transparent bg-accent-50 text-ink/70"
              }`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              readOnly={!isEditingProfile}
            />
          </label>
          {nameError && <p className="text-red-600">{nameError}</p>}
          <label className="flex flex-col gap-1">
            <span className="font-medium text-ink/70">Username</span>
            <input
              className={`rounded-lg border px-3 py-2 focus:outline-none ${
                isEditingProfile
                  ? "border-accent-100 focus:border-accent-400"
                  : "border-transparent bg-accent-50 text-ink/70"
              }`}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              readOnly={!isEditingProfile}
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
          {usernameError && <p className="text-red-600">{usernameError}</p>}
        </div>

        <div className="flex flex-col gap-2">
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
          <label className="flex items-center gap-2 text-ink/70">
            <input
              type="checkbox"
              className="accent-accent-600"
              checked={notifyOnFollow}
              onChange={(e) => setNotifyOnFollow(e.target.checked)}
            />
            follows me
          </label>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-xl font-semibold text-ink">Messaging</h2>
          <label className="flex items-center gap-2 text-ink/70">
            <input
              type="checkbox"
              className="accent-accent-600"
              checked={restrictMessagesToFollowing}
              onChange={(e) => setRestrictMessagesToFollowing(e.target.checked)}
            />
            Only allow messages from people I follow
          </label>
        </div>

        <div className="flex flex-col gap-2">
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
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-xl font-semibold text-ink">Meal Week</h2>
          <label className="flex flex-col gap-1">
            <span className="font-medium text-ink/70">Week starts on</span>
            <select
              className="rounded-lg border border-accent-100 bg-surface px-3 py-2 text-ink focus:border-accent-400 focus:outline-none"
              value={weekStartDay}
              onChange={(e) => setWeekStartDay(e.target.value as WeekStartDay)}
            >
              {weekStartDayValues.map((day) => (
                <option key={day} value={day}>
                  {weekStartDayLabels[day]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {saved && <p className="text-green-700">Saved.</p>}
        <button
          type="submit"
          disabled={submitting || !name.trim()}
          className="self-start rounded-lg bg-accent-600 px-4 py-2 font-medium text-white hover:bg-accent-700 disabled:opacity-50"
        >
          {submitting ? "Saving..." : "Save"}
        </button>
      </form>
    </div>
  );
}
