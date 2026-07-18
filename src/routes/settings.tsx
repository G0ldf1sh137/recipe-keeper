import { useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { updateUsername } from "#/auth/username.functions";
import { startImpersonation, getImpersonationStatus } from "#/auth/impersonation.functions";
import { updateNotificationPreferences } from "#/notifications/notifications.functions";
import {
  getMyHouseholdInfo,
  getMyInvites,
  createHousehold,
  inviteToHousehold,
  respondToInvite,
  removeMember,
  leaveHousehold,
  transferOwnership,
  getKnownUsernames,
  getPendingInviteUsernames,
} from "#/households/households.functions";

export const Route = createFileRoute("/settings")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ context }) => {
    const [household, invites, knownUsernames, impersonationStatus] = await Promise.all([
      getMyHouseholdInfo(),
      getMyInvites(),
      getKnownUsernames(),
      getImpersonationStatus(),
    ]);
    const pendingInviteUsernames =
      household && household.ownerId === context.user.id
        ? await getPendingInviteUsernames({ data: { householdId: household.id } })
        : [];
    return { user: context.user, household, invites, knownUsernames, impersonationStatus, pendingInviteUsernames };
  },
  component: SettingsPage,
});

function SettingsPage() {
  const { user, household, invites, knownUsernames, impersonationStatus, pendingInviteUsernames } =
    Route.useLoaderData();
  const router = useRouter();
  const updateUsernameFn = useServerFn(updateUsername);
  const updateNotificationPreferencesFn = useServerFn(updateNotificationPreferences);
  const createHouseholdFn = useServerFn(createHousehold);
  const inviteToHouseholdFn = useServerFn(inviteToHousehold);
  const respondToInviteFn = useServerFn(respondToInvite);
  const removeMemberFn = useServerFn(removeMember);
  const leaveHouseholdFn = useServerFn(leaveHousehold);
  const transferOwnershipFn = useServerFn(transferOwnership);
  const startImpersonationFn = useServerFn(startImpersonation);

  const [impersonateUsername, setImpersonateUsername] = useState("");
  const [impersonateError, setImpersonateError] = useState<string | null>(null);
  const [impersonateSubmitting, setImpersonateSubmitting] = useState(false);

  const [householdName, setHouseholdName] = useState("");
  const [householdError, setHouseholdError] = useState<string | null>(null);
  const [householdSubmitting, setHouseholdSubmitting] = useState(false);
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [inviteSubmitting, setInviteSubmitting] = useState(false);

  const [username, setUsername] = useState(user.username ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [notifyOnComment, setNotifyOnComment] = useState(user.notifyOnComment);
  const [notifyOnRating, setNotifyOnRating] = useState(user.notifyOnRating);
  const [notifyOnFork, setNotifyOnFork] = useState(user.notifyOnFork);
  const [notificationsSaved, setNotificationsSaved] = useState(false);
  const [notificationsSubmitting, setNotificationsSubmitting] = useState(false);

  // Excludes yourself and anyone already a member or already-invited, since inviting either fails server-side.
  const householdInviteUsernames = knownUsernames.filter(
    (name) =>
      name !== user.username &&
      !household?.members.some((member) => member.username === name) &&
      !pendingInviteUsernames.includes(name),
  );
  // Excludes yourself, since impersonating your own account isn't a meaningful action.
  const impersonateUsernames = knownUsernames.filter((name) => name !== user.username);

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

  async function handleCreateHousehold(e: React.FormEvent) {
    e.preventDefault();
    if (!householdName.trim()) return;
    setHouseholdSubmitting(true);
    setHouseholdError(null);
    try {
      await createHouseholdFn({ data: { name: householdName.trim() } });
      setHouseholdName("");
      await router.invalidate();
    } catch (err) {
      setHouseholdError(err instanceof Error ? err.message : "Failed to create household.");
    } finally {
      setHouseholdSubmitting(false);
    }
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!household || !inviteUsername.trim()) return;
    setInviteSubmitting(true);
    setInviteError(null);
    setInviteSent(false);
    try {
      await inviteToHouseholdFn({ data: { householdId: household.id, username: inviteUsername.trim() } });
      setInviteUsername("");
      setInviteSent(true);
      await router.invalidate();
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : "Failed to send invite.");
    } finally {
      setInviteSubmitting(false);
    }
  }

  async function handleRespondToInvite(inviteId: string, accept: boolean) {
    await respondToInviteFn({ data: { inviteId, accept } });
    await router.invalidate();
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!household) return;
    await removeMemberFn({ data: { householdId: household.id, memberUserId } });
    await router.invalidate();
  }

  async function handleTransferOwnership(memberUserId: string, memberName: string) {
    if (!household) return;
    if (!window.confirm(`Make ${memberName} the owner of "${household.name}"? You'll become a regular member.`)) {
      return;
    }
    await transferOwnershipFn({ data: { householdId: household.id, newOwnerId: memberUserId } });
    await router.invalidate();
  }

  async function handleImpersonate(e: React.FormEvent) {
    e.preventDefault();
    if (!impersonateUsername.trim()) return;
    setImpersonateSubmitting(true);
    setImpersonateError(null);
    try {
      await startImpersonationFn({ data: { username: impersonateUsername.trim() } });
      // Full reload, not router.invalidate() — every other component on the page (and app)
      // may have local state seeded from the pre-impersonation user (e.g. this file's own
      // `username`/`notifyOnX` state), which only a fresh mount will pick up correctly.
      window.location.reload();
      return;
    } catch (err) {
      setImpersonateError(err instanceof Error ? err.message : "Failed to impersonate user.");
    } finally {
      setImpersonateSubmitting(false);
    }
  }

  async function handleLeaveOrDelete() {
    if (!household) return;
    const isOwner = household.ownerId === user.id;
    const message = isOwner
      ? `Delete "${household.name}"? This removes all members. This can't be undone.`
      : `Leave "${household.name}"?`;
    if (!window.confirm(message)) return;
    await leaveHouseholdFn({ data: { householdId: household.id } });
    await router.invalidate();
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

      <div className="mt-8 flex flex-col gap-2">
        <h2 className="font-serif text-xl font-semibold text-ink">Household</h2>
        {household ? (
          <>
            <p className="text-ink/70">{household.name}</p>
            <ul className="flex flex-col gap-1">
              {household.members.map((member) => (
                <li key={member.id} className="flex items-center justify-between text-ink/70">
                  <span>
                    {member.username ? (
                      <Link
                        to="/u/$username"
                        params={{ username: member.username }}
                        className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                      >
                        {member.name}
                      </Link>
                    ) : (
                      member.name
                    )}
                    {member.username && ` (@${member.username})`}
                    {member.id === user.id && " — you"}
                    {member.id === household.ownerId && " — owner"}
                  </span>
                  {household.ownerId === user.id && member.id !== household.ownerId && (
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => void handleTransferOwnership(member.id, member.name)}
                        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                      >
                        Make owner
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRemoveMember(member.id)}
                        className="text-sm font-medium text-red-600 hover:text-red-700"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
            {household.ownerId === user.id && (
              <form onSubmit={(e) => void handleInvite(e)} className="mt-2 flex gap-2">
                <input
                  className="min-w-[10rem] flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
                  list="household-invite-usernames"
                  value={inviteUsername}
                  onChange={(e) => setInviteUsername(e.target.value)}
                  placeholder="Invite by username"
                />
                <button
                  type="submit"
                  disabled={inviteSubmitting || !inviteUsername.trim()}
                  className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
                >
                  {inviteSubmitting ? "Inviting..." : "Invite"}
                </button>
              </form>
            )}
            {inviteError && <p className="text-red-600">{inviteError}</p>}
            {inviteSent && <p className="text-green-700">Invite sent.</p>}
            <button
              type="button"
              onClick={() => void handleLeaveOrDelete()}
              className="mt-2 self-start text-sm font-medium text-red-600 hover:text-red-700"
            >
              {household.ownerId === user.id ? "Delete household" : "Leave household"}
            </button>
          </>
        ) : (
          <>
            <p className="text-sm text-ink/50">
              Pool your pantry with people you live with — everyone's items count toward "what can we make."
            </p>
            <form onSubmit={(e) => void handleCreateHousehold(e)} className="flex gap-2">
              <input
                className="min-w-[10rem] flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                placeholder="Household name"
              />
              <button
                type="submit"
                disabled={householdSubmitting || !householdName.trim()}
                className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
              >
                {householdSubmitting ? "Creating..." : "Create"}
              </button>
            </form>
            {householdError && <p className="text-red-600">{householdError}</p>}

            {invites.length > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <h3 className="font-medium text-ink/70">Pending invites</h3>
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="flex items-center justify-between rounded-lg border border-accent-100 px-3 py-2"
                  >
                    <span className="text-ink/70">
                      {invite.householdName} — invited by {invite.inviterName}
                    </span>
                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => void handleRespondToInvite(invite.id, true)}
                        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleRespondToInvite(invite.id, false)}
                        className="text-sm text-ink/50 hover:text-ink"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <datalist id="household-invite-usernames">
        {householdInviteUsernames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>
      <datalist id="impersonate-usernames">
        {impersonateUsernames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {user.isAdmin && !impersonationStatus.isImpersonating && (
        <div className="mt-8 flex flex-col gap-2">
          <h2 className="font-serif text-xl font-semibold text-ink">Impersonate a user</h2>
          <p className="text-sm text-ink/50">
            View the app exactly as another user would. Use "End impersonation" in the header to return to your
            own account.
          </p>
          <form onSubmit={(e) => void handleImpersonate(e)} className="flex gap-2">
            <input
              className="min-w-[10rem] flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
              list="impersonate-usernames"
              value={impersonateUsername}
              onChange={(e) => setImpersonateUsername(e.target.value)}
              placeholder="Username to impersonate"
            />
            <button
              type="submit"
              disabled={impersonateSubmitting || !impersonateUsername.trim()}
              className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
            >
              {impersonateSubmitting ? "Starting..." : "Impersonate"}
            </button>
          </form>
          {impersonateError && <p className="text-red-600">{impersonateError}</p>}
        </div>
      )}
    </div>
  );
}
