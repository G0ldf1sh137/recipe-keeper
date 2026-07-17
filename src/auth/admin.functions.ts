import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { setUserAdminSchema, setUserCanTranscribeSchema } from "./schemas";
import { listAllUsers, setUserAdminStatus, setUserCanTranscribeStatus } from "./users.server";
import { requireAdminMiddleware } from "./auth-middleware";

export const listUsers = createServerFn({ method: "GET" })
  .middleware([requireAdminMiddleware])
  .handler(async () => listAllUsers());

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
