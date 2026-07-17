import { useEffect } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { getSessionUser } from "#/auth/auth.functions";
import { listNotifications, markNotificationsRead } from "#/notifications/notifications.functions";
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
      return `${notification.actor.name} commented on your recipe "${notification.recipe.title}"`;
    case "fork":
      return `${notification.actor.name} forked your recipe "${notification.recipe.title}"`;
    case "rating":
      return `${notification.actor.name} rated your recipe "${notification.recipe.title}"`;
  }
}

function NotificationsPage() {
  const notifications = Route.useLoaderData();
  const router = useRouter();

  useEffect(() => {
    // Clears the header's unread badge immediately, since this page's own loader
    // just marked everything read (rather than waiting for the next navigation).
    void router.invalidate();
  }, [router]);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Notifications</h1>

      {notifications.length === 0 ? (
        <p className="mt-6 text-ink/60">No notifications yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`rounded-xl border-2 bg-surface px-4 py-3 shadow-sm ${
                notification.readAt ? "border-accent-100" : "border-accent-400"
              }`}
            >
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: notification.recipe.id }}
                className="text-ink hover:text-accent-700 dark:hover:text-accent-400"
              >
                {notificationText(notification)}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
