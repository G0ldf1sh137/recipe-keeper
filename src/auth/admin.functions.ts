import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  setUserAdminSchema,
  setUserModeratorSchema,
  setUserIsSubscriberSchema,
  searchUsersSchema,
  deleteUserSchema,
  banUserSchema,
} from "./schemas";
import {
  setUserAdminStatus,
  setUserModeratorStatus,
  setUserIsSubscriberStatus,
  setUserBannedUntil,
  searchUsers as searchUsersDb,
  deleteUser as deleteUserDb,
} from "./users.server";
import { requireAdminMiddleware, requireModeratorMiddleware } from "./auth-middleware";

export const searchUsers = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .validator(searchUsersSchema)
  .handler(async ({ data }) => searchUsersDb(data.q));

export const setUserAdmin = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(setUserAdminSchema)
  .handler(async ({ data, context }) => {
    if (data.userId === context.user.id) {
      throw new Error("You can't change your own admin status.");
    }
    const updated = (await setUserAdminStatus(data.userId, data.isAdmin)).at(0);
    if (!updated) throw notFound();
    return updated;
  });

export const setUserModerator = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(setUserModeratorSchema)
  .handler(async ({ data, context }) => {
    if (data.userId === context.user.id) {
      throw new Error("You can't change your own moderator status.");
    }
    const updated = (await setUserModeratorStatus(data.userId, data.isModerator)).at(0);
    if (!updated) throw notFound();
    return updated;
  });

export const setUserIsSubscriber = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(setUserIsSubscriberSchema)
  .handler(async ({ data }) => {
    const updated = (await setUserIsSubscriberStatus(data.userId, data.isSubscriber)).at(0);
    if (!updated) throw notFound();
    return updated;
  });

// Moderators and admins alike can timeout a user while working a report — a temporary
// posting suspension, distinct from the admin-only isAdmin/isModerator/isSubscriber toggles
// and account deletion above. Setting minutes far enough out (e.g. years) is how a
// permanent ban is expressed — there's no separate boolean, just how far bannedUntil is set.
export const banUser = createServerFn({ method: "POST" })
  .middleware([requireModeratorMiddleware])
  .validator(banUserSchema)
  .handler(async ({ data, context }) => {
    if (data.userId === context.user.id) {
      throw new Error("You can't ban yourself.");
    }
    const bannedUntil = new Date(Date.now() + data.minutes * 60_000);
    const updated = (await setUserBannedUntil(data.userId, bannedUntil)).at(0);
    if (!updated) throw notFound();
    return updated;
  });

export const deleteUser = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(deleteUserSchema)
  .handler(async ({ data, context }) => {
    if (data.userId === context.user.id) {
      throw new Error("You can't delete your own account.");
    }
    const deleted = (await deleteUserDb(data.userId)).at(0);
    if (!deleted) throw notFound();
    return { ok: true };
  });
