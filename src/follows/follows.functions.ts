import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { toggleFollowSchema, listByUsernameSchema } from "./schemas";
import { toggleFollow as toggleFollowDb, findFollowers, findFollowing } from "./follows.server";
import { findUserByUsername } from "#/auth/users.server";
import { requireAuthMiddleware } from "#/auth/auth-middleware";

export const toggleFollow = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(toggleFollowSchema)
  .handler(async ({ data, context }) => {
    const result = await toggleFollowDb(context.user.id, data.userId);
    if (!result) throw notFound();
    return result;
  });

export const getFollowers = createServerFn({ method: "GET" })
  .validator(listByUsernameSchema)
  .handler(async ({ data }) => {
    const user = await findUserByUsername(data.username);
    if (!user) throw notFound();
    return { profileName: user.name, followers: await findFollowers(user.id) };
  });

export const getFollowing = createServerFn({ method: "GET" })
  .validator(listByUsernameSchema)
  .handler(async ({ data }) => {
    const user = await findUserByUsername(data.username);
    if (!user) throw notFound();
    return { profileName: user.name, following: await findFollowing(user.id) };
  });
