import { and, desc, eq, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { conversations, messages, users, blocks } from "#/db/schema";
import { findUserById } from "#/auth/users.server";
import { findFollow } from "#/follows/follows.server";

function canonicalPair(userAId: string, userBId: string): [string, string] {
  return userAId < userBId ? [userAId, userBId] : [userBId, userAId];
}

export async function findConversation(userAId: string, userBId: string) {
  const [user1Id, user2Id] = canonicalPair(userAId, userBId);
  return db.query.conversations.findFirst({
    where: and(eq(conversations.user1Id, user1Id), eq(conversations.user2Id, user2Id)),
  });
}

export async function findOrCreateConversation(senderId: string, targetId: string) {
  if (senderId === targetId) throw new Error("You can't message yourself.");

  const existing = await findConversation(senderId, targetId);
  if (existing) return existing;

  const target = await findUserById(targetId);
  if (!target) return undefined;

  if (target.restrictMessagesToFollowing) {
    const targetFollowsSender = await findFollow(targetId, senderId);
    if (!targetFollowsSender) {
      throw new Error("This user only accepts messages from people they follow.");
    }
  }

  const [user1Id, user2Id] = canonicalPair(senderId, targetId);
  const [row] = await db.insert(conversations).values({ user1Id, user2Id }).returning();
  return row;
}

export async function findConversationForParticipant(conversationId: string, userId: string) {
  return db.query.conversations.findFirst({
    where: and(
      eq(conversations.id, conversationId),
      or(eq(conversations.user1Id, userId), eq(conversations.user2Id, userId)),
    ),
  });
}

const messageParticipantColumns = {
  id: users.id,
  name: users.name,
  username: users.username,
  avatarUrl: sql<string | null>`coalesce(${users.avatarOverrideUrl}, ${users.avatarUrl})`,
};

// Uses the plain query builder rather than db.query.conversations.findMany
// (the relational query builder) because RQB mis-qualifies raw-sql column
// references to other tables (e.g. blocks.blockerId) as belonging to
// "conversations" instead of "blocks" — the same bug class that broke
// findRecipes' default sort branch earlier; see notHiddenByViewer's comment
// in recipes.server.ts.
export async function findConversationsForUser(userId: string) {
  const rows = await db
    .select({
      id: conversations.id,
      user1Id: conversations.user1Id,
      user2Id: conversations.user2Id,
      createdAt: conversations.createdAt,
    })
    .from(conversations)
    .where(
      and(
        or(eq(conversations.user1Id, userId), eq(conversations.user2Id, userId)),
        sql`not exists (
          select 1 from ${blocks}
          where (${blocks.blockerId} = ${userId} and (${blocks.blockedId} = ${conversations.user1Id} or ${blocks.blockedId} = ${conversations.user2Id}))
             or (${blocks.blockedId} = ${userId} and (${blocks.blockerId} = ${conversations.user1Id} or ${blocks.blockerId} = ${conversations.user2Id}))
        )`,
      ),
    );
  if (rows.length === 0) return [];

  const conversationIds = rows.map((row) => row.id);
  const otherUserIds = rows.map((row) => (row.user1Id === userId ? row.user2Id : row.user1Id));

  const [otherUsers, lastMessages, unreadRows] = await Promise.all([
    db
      .select(messageParticipantColumns)
      .from(users)
      .where(inArray(users.id, otherUserIds)),
    db
      .selectDistinctOn([messages.conversationId], {
        conversationId: messages.conversationId,
        body: messages.body,
        senderId: messages.senderId,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(inArray(messages.conversationId, conversationIds))
      .orderBy(messages.conversationId, desc(messages.createdAt)),
    db
      .select({ conversationId: messages.conversationId, count: sql<number>`count(*)::int` })
      .from(messages)
      .where(
        and(
          inArray(messages.conversationId, conversationIds),
          ne(messages.senderId, userId),
          isNull(messages.readAt),
        ),
      )
      .groupBy(messages.conversationId),
  ]);

  const otherUserById = new Map(otherUsers.map((u) => [u.id, u]));
  const lastMessageByConversation = new Map(lastMessages.map((m) => [m.conversationId, m]));
  const unreadByConversation = new Map(unreadRows.map((r) => [r.conversationId, r.count]));

  return rows.map((row) => {
    const otherUserId = row.user1Id === userId ? row.user2Id : row.user1Id;
    return {
      conversationId: row.id,
      otherUser: otherUserById.get(otherUserId)!,
      lastMessage: lastMessageByConversation.get(row.id) ?? null,
      unreadCount: unreadByConversation.get(row.id) ?? 0,
    };
  });
}

export async function findMessagesForConversation(conversationId: string) {
  return db.query.messages.findMany({
    where: eq(messages.conversationId, conversationId),
    orderBy: (m, { asc }) => [asc(m.createdAt)],
  });
}

export async function findMessageById(id: string) {
  return db.query.messages.findFirst({ where: eq(messages.id, id) });
}

export async function sendMessage(conversationId: string, senderId: string, body: string) {
  const [message] = await db.insert(messages).values({ conversationId, senderId, body }).returning();
  return message;
}

export async function markConversationRead(conversationId: string, viewerId: string) {
  await db
    .update(messages)
    .set({ readAt: new Date() })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        ne(messages.senderId, viewerId),
        isNull(messages.readAt),
      ),
    );
}

export async function countUnreadMessages(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(messages)
    .innerJoin(conversations, eq(messages.conversationId, conversations.id))
    .where(
      and(
        or(eq(conversations.user1Id, userId), eq(conversations.user2Id, userId)),
        ne(messages.senderId, userId),
        isNull(messages.readAt),
      ),
    );
  return row.count;
}

export async function deleteMessageById(id: string) {
  const rows = await db.delete(messages).where(eq(messages.id, id)).returning();
  return rows.at(0);
}
