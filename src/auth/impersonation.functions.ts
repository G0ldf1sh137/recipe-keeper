import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { startImpersonationSchema } from "./schemas";
import { findUserById } from "./users.server";
import { requireAdminMiddleware, requireAuthMiddleware, sessionMiddleware } from "./auth-middleware";
import { readSessionToken } from "./cookies.server";
import { setImpersonatedUser } from "./session.server";

export const startImpersonation = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(startImpersonationSchema)
  .handler(async ({ data, context }) => {
    if (context.isImpersonating) throw new Error("End your current impersonation first.");
    if (data.userId === context.user.id) throw new Error("You can't impersonate yourself.");
    const target = await findUserById(data.userId);
    if (!target) throw notFound();
    const token = readSessionToken();
    if (!token) throw new Error("Unauthorized");
    await setImpersonatedUser(token, target.id);
    return { ok: true };
  });

export const endImpersonation = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    if (!context.isImpersonating || !context.realUser?.isAdmin) {
      throw new Error("Not currently impersonating.");
    }
    const token = readSessionToken();
    if (!token) throw new Error("Unauthorized");
    await setImpersonatedUser(token, null);
    return { ok: true };
  });

export const getImpersonationStatus = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => ({
    isImpersonating: context.isImpersonating,
    realUserName: context.isImpersonating ? (context.realUser?.name ?? null) : null,
  }));
