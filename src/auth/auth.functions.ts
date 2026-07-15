import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { sessionMiddleware } from "./auth-middleware";
import { readSessionToken, buildClearedSessionCookie } from "./cookies.server";
import { invalidateSessionToken } from "./session.server";

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
