import { createServerFn } from "@tanstack/react-start";
import { sessionMiddleware, requireAuthMiddleware } from "#/auth/auth-middleware";
import {
  countUnreadNotifications,
  findNotificationsForUser,
  markAllNotificationsRead,
} from "./notifications.server";

export const getUnreadNotificationCount = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => {
    if (!context.user) return 0;
    return countUnreadNotifications(context.user.id);
  });

export const listNotifications = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    return findNotificationsForUser(context.user.id);
  });

export const markNotificationsRead = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    await markAllNotificationsRead(context.user.id);
  });
