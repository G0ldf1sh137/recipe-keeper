import { createServerFn } from "@tanstack/react-start";
import { startImpersonationSchema } from "./schemas";
import { findUserByUsername } from "./users.server";
import { requireAdminMiddleware, requireAuthMiddleware, sessionMiddleware } from "./auth-middleware";
import { readSessionToken } from "./cookies.server";
import { setImpersonatedUser } from "./session.server";

export const startImpersonation = createServerFn({ method: "POST" })
  .middleware([requireAdminMiddleware])
  .validator(startImpersonationSchema)
  .handler(async ({ data, context }) => {
    if (context.isImpersonating) throw new Error("End your current impersonation first.");
    const target = await findUserByUsername(data.username);
    if (!target) throw new Error("No user with that username.");
    if (target.id === context.user.id) throw new Error("You can't impersonate yourself.");
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
