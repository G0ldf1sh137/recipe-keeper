import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { sessionMiddleware, requireAuthMiddleware } from "#/auth/auth-middleware";
import {
  countUnreadNotifications,
  findNotificationsForUser,
  markAllNotificationsRead,
  updateNotificationPreferences as updateNotificationPreferencesInDb,
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

export const updateNotificationPreferences = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      notifyOnComment: z.boolean(),
      notifyOnRating: z.boolean(),
      notifyOnFork: z.boolean(),
    }),
  )
  .handler(async ({ data, context }) => {
    const [updated] = await updateNotificationPreferencesInDb(context.user.id, data);
    return updated;
  });
