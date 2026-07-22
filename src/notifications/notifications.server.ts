import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { notifications, recipes, polls, users } from "#/db/schema";
import type { NotificationType } from "#/db/schema";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  readAt: Date | null;
  createdAt: Date;
  actor: { id: string; name: string; avatarUrl: string | null; username: string | null };
  recipe: { id: string; title: string } | null;
  poll: { id: string; title: string } | null;
};

type PreferenceColumn = "notifyOnComment" | "notifyOnRating" | "notifyOnFork" | "notifyOnFollow";

// Only recipe-based notification types have an opt-out preference; types
// absent here (e.g. householdInvite) always notify — they're actionable
// system notifications, not a "someone interacted with your content" ping.
const notificationPreferenceColumns: Partial<Record<NotificationType, PreferenceColumn>> = {
  comment: "notifyOnComment",
  rating: "notifyOnRating",
  fork: "notifyOnFork",
  follow: "notifyOnFollow",
};

export async function insertNotification(input: {
  recipientId: string;
  actorId: string;
  recipeId: string | null;
  pollId?: string | null;
  type: NotificationType;
}) {
  if (input.recipientId === input.actorId) return;
  const preferenceColumn = notificationPreferenceColumns[input.type];
  if (preferenceColumn) {
    const recipient = await db.query.users.findFirst({
      where: eq(users.id, input.recipientId),
      columns: {
        notifyOnComment: true,
        notifyOnRating: true,
        notifyOnFork: true,
        notifyOnFollow: true,
      },
    });
    if (!recipient?.[preferenceColumn]) return;
  }
  await db.insert(notifications).values(input);
}

export async function updateNotificationPreferences(
  userId: string,
  prefs: {
    notifyOnComment: boolean;
    notifyOnRating: boolean;
    notifyOnFork: boolean;
    notifyOnFollow: boolean;
  },
) {
  return db.update(users).set(prefs).where(eq(users.id, userId)).returning();
}

export async function findNotificationsForUser(userId: string): Promise<NotificationRow[]> {
  const rows = await db
    .select({
      id: notifications.id,
      type: notifications.type,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      actor: { id: users.id, name: users.name, avatarUrl: users.avatarUrl, username: users.username },
      recipe: { id: recipes.id, title: recipes.title },
      poll: { id: polls.id, title: polls.title },
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.actorId, users.id))
    .leftJoin(recipes, eq(notifications.recipeId, recipes.id))
    .leftJoin(polls, eq(notifications.pollId, polls.id))
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);

  // A left join with no match fills every selected recipe/poll column with
  // null rather than nulling out the whole nested object — collapse that here.
  return rows.map((row) => ({
    ...row,
    recipe: row.recipe?.id ? row.recipe : null,
    poll: row.poll?.id ? row.poll : null,
  }));
}

export async function countUnreadNotifications(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notifications)
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
  return row.count;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  await db
    .update(notifications)
    .set({ readAt: new Date() })
    .where(and(eq(notifications.recipientId, userId), isNull(notifications.readAt)));
}

export async function deleteNotification(userId: string, notificationId: string) {
  const rows = await db
    .delete(notifications)
    .where(and(eq(notifications.id, notificationId), eq(notifications.recipientId, userId)))
    .returning();
  return rows.at(0);
}

export async function deleteAllNotifications(userId: string): Promise<void> {
  await db.delete(notifications).where(eq(notifications.recipientId, userId));
}
