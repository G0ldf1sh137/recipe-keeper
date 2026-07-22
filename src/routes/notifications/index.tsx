import { useEffect, useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import {
  listNotifications,
  markNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "#/notifications/notifications.functions";
import type { NotificationRow } from "#/notifications/notifications.server";

export const Route = createFileRoute("/notifications/")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  loader: async () => {
    const notifications = await listNotifications();
    await markNotificationsRead();
    return notifications;
  },
  component: NotificationsPage,
});

function notificationText(notification: NotificationRow) {
  switch (notification.type) {
    case "comment":
      return `${notification.actor.name} commented on your recipe "${notification.recipe?.title}"`;
    case "fork":
      return `${notification.actor.name} forked your recipe "${notification.recipe?.title}"`;
    case "rating":
      return `${notification.actor.name} rated your recipe "${notification.recipe?.title}"`;
    case "householdInvite":
      return `${notification.actor.name} invited you to join their household`;
    case "follow":
      return `${notification.actor.name} started following you`;
    case "pollCreated":
      return `${notification.actor.name} started a Dinner Poll: "${notification.poll?.title}"`;
    case "pollClosed":
      return `The Dinner Poll "${notification.poll?.title}" has a winner`;
  }
}

function NotificationsPage() {
  const loaderNotifications = Route.useLoaderData();
  const router = useRouter();
  const deleteFn = useServerFn(deleteNotification);
  const clearAllFn = useServerFn(clearAllNotifications);

  const [notifications, setNotifications] = useState(loaderNotifications);

  useEffect(() => {
    setNotifications(loaderNotifications);
  }, [loaderNotifications]);

  useEffect(() => {
    // Clears the header's unread badge immediately, since this page's own loader
    // just marked everything read (rather than waiting for the next navigation).
    void router.invalidate();
  }, [router]);

  async function handleDelete(id: string) {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await deleteFn({ data: { id } });
  }

  async function handleClearAll() {
    if (!window.confirm("Clear all notifications? This can't be undone.")) return;
    setNotifications([]);
    await clearAllFn();
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Notifications</h1>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="text-sm font-medium text-red-600 hover:text-red-700"
          >
            Clear all
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="mt-6 text-ink/60">No notifications yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`flex items-center justify-between gap-3 rounded-xl border-2 bg-surface px-4 py-3 shadow-sm ${
                notification.readAt ? "border-accent-100" : "border-accent-400"
              }`}
            >
              {notification.recipe ? (
                <Link
                  to="/recipes/$recipeId"
                  params={{ recipeId: notification.recipe.id }}
                  className="text-ink hover:text-accent-700 dark:hover:text-accent-400"
                >
                  {notificationText(notification)}
                </Link>
              ) : notification.type === "follow" && notification.actor.username ? (
                <Link
                  to="/u/$username"
                  params={{ username: notification.actor.username }}
                  className="text-ink hover:text-accent-700 dark:hover:text-accent-400"
                >
                  {notificationText(notification)}
                </Link>
              ) : notification.poll ? (
                <Link
                  to="/polls/$pollId"
                  params={{ pollId: notification.poll.id }}
                  className="text-ink hover:text-accent-700 dark:hover:text-accent-400"
                >
                  {notificationText(notification)}
                </Link>
              ) : (
                <Link
                  to={notification.type === "householdInvite" ? "/pantry" : "/settings"}
                  className="text-ink hover:text-accent-700 dark:hover:text-accent-400"
                >
                  {notificationText(notification)}
                </Link>
              )}
              <button
                type="button"
                onClick={() => handleDelete(notification.id)}
                aria-label="Delete notification"
                className="text-sm text-ink/50 hover:text-red-600"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
