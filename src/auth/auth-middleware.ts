import { createMiddleware } from "@tanstack/react-start";
import { readSessionToken } from "./cookies.server";
import { validateSessionToken } from "./session.server";

export const sessionMiddleware = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const token = readSessionToken();
  const user = token ? await validateSessionToken(token) : null;
  return next({ context: { user } });
});

export const requireAuthMiddleware = createMiddleware({ type: "function" })
  .middleware([sessionMiddleware])
  .server(async ({ next, context }) => {
    if (!context.user) throw new Error("Unauthorized");
    return next({ context: { user: context.user } });
  });
