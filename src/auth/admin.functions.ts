import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { setUserAdminSchema, setUserCanTranscribeSchema, searchUsersSchema, deleteUserSchema } from "./schemas";
import {
  setUserAdminStatus,
  setUserCanTranscribeStatus,
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

export const setUserCanTranscribe = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(setUserCanTranscribeSchema)
  .handler(async ({ data }) => {
    const updated = (await setUserCanTranscribeStatus(data.userId, data.canTranscribe)).at(0);
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
