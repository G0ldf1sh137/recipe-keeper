import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { blockUserSchema, unblockUserSchema } from "./schemas";
import {
  blockUser as blockUserDb,
  unblockUser as unblockUserDb,
  listBlockedUsers,
  countBlockedUsers,
} from "./blocks.server";
import { findUserById } from "#/auth/users.server";
import { deleteFollowsBetween } from "#/follows/follows.server";
import { requireAuthMiddleware } from "#/auth/auth-middleware";

export const blockUser = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(blockUserSchema)
  .handler(async ({ data, context }) => {
    const target = await findUserById(data.userId);
    if (!target) throw notFound();
    await blockUserDb(context.user.id, data.userId);
    await deleteFollowsBetween(context.user.id, data.userId);
    return { ok: true };
  });

export const unblockUser = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(unblockUserSchema)
  .handler(async ({ data, context }) => {
    await unblockUserDb(context.user.id, data.userId);
    return { ok: true };
  });

export const getBlockedUsers = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => listBlockedUsers(context.user.id));

export const getBlockedUsersCount = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => countBlockedUsers(context.user.id));
