import { and, desc, eq, or, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { blocks, users } from "#/db/schema";

export async function isBlocked(blockerId: string, blockedId: string): Promise<boolean> {
  const row = await db.query.blocks.findFirst({
    where: and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)),
  });
  return !!row;
}

// Symmetric: true if either party has blocked the other. Used everywhere a
// "wall" needs enforcing (follow/message guards, profile visibility).
export async function hasWallBetween(userAId: string, userBId: string): Promise<boolean> {
  const row = await db.query.blocks.findFirst({
    where: or(
      and(eq(blocks.blockerId, userAId), eq(blocks.blockedId, userBId)),
      and(eq(blocks.blockerId, userBId), eq(blocks.blockedId, userAId)),
    ),
  });
  return !!row;
}

// Retroactive follow cleanup is deliberately not done here — it lives in
// blocks.functions.ts's blockUser handler instead, since follows.server.ts
// imports insertNotification (from notifications.server.ts), and
// notifications.server.ts needs to import hasWallBetween from this file;
// having this file import follows.server.ts too would create a cycle.
export async function blockUser(blockerId: string, blockedId: string): Promise<void> {
  if (blockerId === blockedId) throw new Error("You can't block yourself.");
  await db.insert(blocks).values({ blockerId, blockedId }).onConflictDoNothing();
}

// Only the blocker can remove their own block — the blocked party has no
// way to undo someone else's block of them.
export async function unblockUser(blockerId: string, blockedId: string): Promise<void> {
  await db.delete(blocks).where(and(eq(blocks.blockerId, blockerId), eq(blocks.blockedId, blockedId)));
}

export async function countBlockedUsers(blockerId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(blocks)
    .where(eq(blocks.blockerId, blockerId));
  return row.count;
}

const blockedUserColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  avatarUrl: sql<string | null>`coalesce(${users.avatarOverrideUrl}, ${users.avatarUrl})`,
};

export async function listBlockedUsers(blockerId: string) {
  return db
    .select({ ...blockedUserColumns, blockedAt: blocks.createdAt })
    .from(blocks)
    .innerJoin(users, eq(blocks.blockedId, users.id))
    .where(eq(blocks.blockerId, blockerId))
    .orderBy(desc(blocks.createdAt));
}
