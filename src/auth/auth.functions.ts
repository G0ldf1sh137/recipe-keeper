import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { sessionMiddleware } from "./auth-middleware";
import { readSessionToken, buildClearedSessionCookie, buildSessionCookie } from "./cookies.server";
import { invalidateSessionToken, invalidateAllSessionsForUser, createSession } from "./session.server";
import { devLoginSchema } from "./schemas";
import { findUserByUsername } from "./users.server";
import { notFound } from "@tanstack/react-router";

export const getSessionUser = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .handler(async ({ context }) => context.user);

export const logout = createServerFn({ method: "POST" })
  .middleware([sessionMiddleware])
  .handler(async () => {
    const token = readSessionToken();
    if (token) await invalidateSessionToken(token);
    setResponseHeader("Set-Cookie", buildClearedSessionCookie());
    return { ok: true };
  });

// Dev-only: signs in as any user by username, bypassing Google OAuth entirely.
// Lets a real browser session be established for accounts with no real Google
// credentials (e.g. test-admin), for local testing of admin-only UI like
// impersonation. Hard-blocked outside NODE_ENV=development.
export const devLogin = createServerFn({ method: "POST" })
  .validator(devLoginSchema)
  .handler(async ({ data }) => {
    if (process.env.NODE_ENV !== "development") throw notFound();
    const user = await findUserByUsername(data.username);
    if (!user) throw new Error(`No user with username "${data.username}"`);
    await invalidateAllSessionsForUser(user.id);
    const { token, expiresAt } = await createSession(user.id);
    setResponseHeader("Set-Cookie", buildSessionCookie(token, expiresAt));
    return { ok: true };
  });
