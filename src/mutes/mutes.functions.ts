import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { muteUserSchema, unmuteUserSchema } from "./schemas";
import {
  muteUser as muteUserDb,
  unmuteUser as unmuteUserDb,
  listMutedUsers,
  countMutedUsers,
} from "./mutes.server";
import { findUserById } from "#/auth/users.server";
import { requireAuthMiddleware } from "#/auth/auth-middleware";

export const muteUser = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(muteUserSchema)
  .handler(async ({ data, context }) => {
    const target = await findUserById(data.userId);
    if (!target) throw notFound();
    await muteUserDb(context.user.id, data.userId);
    return { ok: true };
  });

export const unmuteUser = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(unmuteUserSchema)
  .handler(async ({ data, context }) => {
    await unmuteUserDb(context.user.id, data.userId);
    return { ok: true };
  });

export const getMutedUsers = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => listMutedUsers(context.user.id));

export const getMutedUsersCount = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => countMutedUsers(context.user.id));
