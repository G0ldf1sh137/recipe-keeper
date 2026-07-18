import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { setUserAdminSchema, setUserIsSubscriberSchema, searchUsersSchema, deleteUserSchema } from "./schemas";
import {
  setUserAdminStatus,
  setUserIsSubscriberStatus,
  searchUsers as searchUsersDb,
  deleteUser as deleteUserDb,
} from "./users.server";
import { requireAdminMiddleware } from "./auth-middleware";

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

export const setUserIsSubscriber = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(setUserIsSubscriberSchema)
  .handler(async ({ data }) => {
    const updated = (await setUserIsSubscriberStatus(data.userId, data.isSubscriber)).at(0);
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
