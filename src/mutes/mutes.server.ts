import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { mutes, users } from "#/db/schema";

export async function isMuted(muterId: string, mutedId: string): Promise<boolean> {
  const row = await db.query.mutes.findFirst({
    where: and(eq(mutes.muterId, muterId), eq(mutes.mutedId, mutedId)),
  });
  return !!row;
}

export async function muteUser(muterId: string, mutedId: string): Promise<void> {
  if (muterId === mutedId) throw new Error("You can't mute yourself.");
  await db.insert(mutes).values({ muterId, mutedId }).onConflictDoNothing();
}

export async function unmuteUser(muterId: string, mutedId: string): Promise<void> {
  await db.delete(mutes).where(and(eq(mutes.muterId, muterId), eq(mutes.mutedId, mutedId)));
}

export async function countMutedUsers(muterId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mutes)
    .where(eq(mutes.muterId, muterId));
  return row.count;
}

const mutedUserColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  avatarUrl: sql<string | null>`coalesce(${users.avatarOverrideUrl}, ${users.avatarUrl})`,
};

export async function listMutedUsers(muterId: string) {
  return db
    .select({ ...mutedUserColumns, mutedAt: mutes.createdAt })
    .from(mutes)
    .innerJoin(users, eq(mutes.mutedId, users.id))
    .where(eq(mutes.muterId, muterId))
    .orderBy(desc(mutes.createdAt));
}
