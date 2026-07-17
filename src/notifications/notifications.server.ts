import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { notifications, recipes, users } from "#/db/schema";
import type { NotificationType } from "#/db/schema";

export type NotificationRow = {
  id: string;
  type: NotificationType;
  readAt: Date | null;
  createdAt: Date;
  actor: { id: string; name: string; avatarUrl: string | null };
  recipe: { id: string; title: string };
};

export async function insertNotification(input: {
  recipientId: string;
  actorId: string;
  recipeId: string;
  type: NotificationType;
}) {
  if (input.recipientId === input.actorId) return;
  await db.insert(notifications).values(input);
}

export async function findNotificationsForUser(userId: string): Promise<NotificationRow[]> {
  return db
    .select({
      id: notifications.id,
      type: notifications.type,
      readAt: notifications.readAt,
      createdAt: notifications.createdAt,
      actor: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
      recipe: { id: recipes.id, title: recipes.title },
    })
    .from(notifications)
    .innerJoin(users, eq(notifications.actorId, users.id))
    .innerJoin(recipes, eq(notifications.recipeId, recipes.id))
    .where(eq(notifications.recipientId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(100);
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
