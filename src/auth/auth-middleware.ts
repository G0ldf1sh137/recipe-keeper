import { createMiddleware } from "@tanstack/react-start";
import { readSessionToken } from "./cookies.server";
import { validateSessionToken } from "./session.server";
import { isUserBanned } from "./users.server";

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

// Gates public content creation/editing (recipes, comments, messages, ratings, follows, forks,
// cookbooks, "I made this" posts) for users currently serving a moderator/admin-issued timeout.
// Browsing and account/settings actions are untouched — only this middleware's call sites are blocked.
export const requireNotBannedMiddleware = createMiddleware({ type: "function" })
  .middleware([requireAuthMiddleware])
  .server(async ({ next, context }) => {
    if (isUserBanned(context.user.bannedUntil)) {
      throw new Error("Your account is temporarily suspended. You can still browse, but can't post new content.");
    }
    return next({
      context: { user: context.user, realUser: context.realUser, isImpersonating: context.isImpersonating },
    });
  });

// Gates the reports/moderation actions in the admin panel to admins and moderators alike.
// Moderators can't reach anything else gated by requireAdminMiddleware (user search, admin/
// subscriber toggles, impersonation, account deletion).
export const requireModeratorMiddleware = createMiddleware({ type: "function" })
  .middleware([requireAuthMiddleware])
  .server(async ({ next, context }) => {
    if (!context.user.isAdmin && !context.user.isModerator) throw new Error("Forbidden");
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
