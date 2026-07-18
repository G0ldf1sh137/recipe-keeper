import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { follows, users } from "#/db/schema";
import { findUserById } from "#/auth/users.server";
import { insertNotification } from "#/notifications/notifications.server";

export async function findFollow(followerId: string, followingId: string) {
  return db.query.follows.findFirst({
    where: and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)),
  });
}

export async function toggleFollow(followerId: string, followingId: string) {
  if (followerId === followingId) throw new Error("You can't follow yourself.");

  const target = await findUserById(followingId);
  if (!target) return undefined;

  const existing = await findFollow(followerId, followingId);
  if (existing) {
    await db
      .delete(follows)
      .where(and(eq(follows.followerId, followerId), eq(follows.followingId, followingId)));
    return { isFollowing: false };
  }

  await db.insert(follows).values({ followerId, followingId });
  await insertNotification({
    recipientId: followingId,
    actorId: followerId,
    recipeId: null,
    type: "follow",
  });
  return { isFollowing: true };
}

export async function countFollowers(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followingId, userId));
  return row.count;
}

export async function countFollowing(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(follows)
    .where(eq(follows.followerId, userId));
  return row.count;
}

const followedUserColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  avatarUrl: sql<string | null>`coalesce(${users.avatarOverrideUrl}, ${users.avatarUrl})`,
};

export async function findFollowers(userId: string) {
  return db
    .select({ ...followedUserColumns, followedAt: follows.createdAt })
    .from(follows)
    .innerJoin(users, eq(follows.followerId, users.id))
    .where(eq(follows.followingId, userId))
    .orderBy(desc(follows.createdAt));
}

export async function findFollowing(userId: string) {
  return db
    .select({ ...followedUserColumns, followedAt: follows.createdAt })
    .from(follows)
    .innerJoin(users, eq(follows.followingId, users.id))
    .where(eq(follows.followerId, userId))
    .orderBy(desc(follows.createdAt));
}
