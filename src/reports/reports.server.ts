import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "#/db/index";
import { reports, recipes, comments, messages, users } from "#/db/schema";

const recipeOwners = alias(users, "recipe_owners");
const commentAuthors = alias(users, "comment_authors");
const messageSenders = alias(users, "message_senders");

export async function insertReport(input: {
  reporterId: string;
  recipeId?: string;
  commentId?: string;
  messageId?: string;
  reason: string;
}) {
  const [report] = await db.insert(reports).values(input).returning();
  return report;
}

export type ReportRow = {
  id: string;
  reason: string;
  createdAt: Date;
  reporter: { id: string; name: string };
  recipe: { id: string; title: string; ownerId: string; ownerName: string } | null;
  comment: { id: string; body: string; recipeId: string; authorId: string; authorName: string } | null;
  message: { id: string; body: string; senderId: string; senderName: string } | null;
};

export async function findOpenReports(): Promise<ReportRow[]> {
  const rows = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      createdAt: reports.createdAt,
      reporterId: users.id,
      reporterName: users.name,
      recipeId: recipes.id,
      recipeTitle: recipes.title,
      recipeOwnerId: recipes.ownerId,
      recipeOwnerName: recipeOwners.name,
      commentId: comments.id,
      commentBody: comments.body,
      commentRecipeId: comments.recipeId,
      commentAuthorId: comments.authorId,
      commentAuthorName: commentAuthors.name,
      messageId: messages.id,
      messageBody: messages.body,
      messageSenderId: messages.senderId,
      messageSenderName: messageSenders.name,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .leftJoin(recipes, eq(reports.recipeId, recipes.id))
    .leftJoin(recipeOwners, eq(recipes.ownerId, recipeOwners.id))
    .leftJoin(comments, eq(reports.commentId, comments.id))
    .leftJoin(commentAuthors, eq(comments.authorId, commentAuthors.id))
    .leftJoin(messages, eq(reports.messageId, messages.id))
    .leftJoin(messageSenders, eq(messages.senderId, messageSenders.id))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt));

  return rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    createdAt: row.createdAt,
    reporter: { id: row.reporterId, name: row.reporterName },
    recipe: row.recipeId
      ? { id: row.recipeId, title: row.recipeTitle!, ownerId: row.recipeOwnerId!, ownerName: row.recipeOwnerName! }
      : null,
    comment: row.commentId
      ? {
          id: row.commentId,
          body: row.commentBody!,
          recipeId: row.commentRecipeId!,
          authorId: row.commentAuthorId!,
          authorName: row.commentAuthorName!,
        }
      : null,
    message: row.messageId
      ? { id: row.messageId, body: row.messageBody!, senderId: row.messageSenderId!, senderName: row.messageSenderName! }
      : null,
  }));
}

export async function resolveReportStatus(reportId: string, adminId: string) {
  const rows = await db
    .update(reports)
    .set({ status: "resolved", resolvedBy: adminId, resolvedAt: new Date() })
    .where(eq(reports.id, reportId))
    .returning();
  return rows.at(0);
}
