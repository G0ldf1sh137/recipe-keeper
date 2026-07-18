import { createMiddleware } from "@tanstack/react-start";
import { readSessionToken } from "./cookies.server";
import { validateSessionToken } from "./session.server";

export const sessionMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const token = readSessionToken();
  const resolved = token ? await validateSessionToken(token) : null;
  return next({
    context: {
      user: resolved?.user ?? null,
      realUser: resolved?.realUser ?? null,
      isImpersonating: resolved?.isImpersonating ?? false,
    },
  });
});

export const requireAuthMiddleware = createMiddleware({ type: "function" })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    if (!context.user) throw new Error("Unauthorized");
    return next({
      context: { user: context.user, realUser: context.realUser, isImpersonating: context.isImpersonating },
    });
  });

export const requireAdminMiddleware = createMiddleware({ type: "function" })
  .middleware([requireAuthMiddleware])
  .server(async ({ next, context }) => {
    if (!context.user.isAdmin) throw new Error("Forbidden");
    return next({
      context: { user: context.user, realUser: context.realUser, isImpersonating: context.isImpersonating },
    });
  });

// Gates any feature reserved for paying subscribers (AI import, grocery lists, pantry, calendars).
// Backed by the same `users.isSubscriber` flag admins toggle via "Make subscriber" in the admin panel.
export const requireSubscriberMiddleware = createMiddleware({ type: "function" })
  .middleware([requireAuthMiddleware])
  .server(async ({ next, context }) => {
    if (!context.user.isAdmin && !context.user.isSubscriber) throw new Error("Forbidden");
    return next({
      context: { user: context.user, realUser: context.realUser, isImpersonating: context.isImpersonating },
    });
  });
