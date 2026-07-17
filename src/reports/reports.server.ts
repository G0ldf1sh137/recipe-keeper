import { desc, eq } from "drizzle-orm";
import { db } from "#/db/index";
import { reports, recipes, comments, users } from "#/db/schema";

export async function insertReport(input: {
  reporterId: string;
  recipeId?: string;
  commentId?: string;
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
  recipe: { id: string; title: string } | null;
  comment: { id: string; body: string; recipeId: string } | null;
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
      commentId: comments.id,
      commentBody: comments.body,
      commentRecipeId: comments.recipeId,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .leftJoin(recipes, eq(reports.recipeId, recipes.id))
    .leftJoin(comments, eq(reports.commentId, comments.id))
    .where(eq(reports.status, "open"))
    .orderBy(desc(reports.createdAt));

  return rows.map((row) => ({
    id: row.id,
    reason: row.reason,
    createdAt: row.createdAt,
    reporter: { id: row.reporterId, name: row.reporterName },
    recipe: row.recipeId ? { id: row.recipeId, title: row.recipeTitle! } : null,
    comment: row.commentId
      ? { id: row.commentId, body: row.commentBody!, recipeId: row.commentRecipeId! }
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
