import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { ratings } from "#/db/schema";

export type RatingSummary = { average: number; count: number };

export async function upsertRating(recipeId: string, userId: string, value: number) {
  await db
    .insert(ratings)
    .values({ recipeId, userId, value })
    .onConflictDoUpdate({
      target: [ratings.recipeId, ratings.userId],
      set: { value, updatedAt: new Date() },
    });
}

export async function findRatingSummary(recipeId: string, viewerId: string | undefined) {
  const [aggregate] = await db
    .select({
      average: sql<number | null>`avg(${ratings.value})`,
      count: sql<number>`count(*)`,
    })
    .from(ratings)
    .where(eq(ratings.recipeId, recipeId));

  const myRating = viewerId
    ? await db.query.ratings.findFirst({
        where: and(eq(ratings.recipeId, recipeId), eq(ratings.userId, viewerId)),
      })
    : undefined;

  return {
    average: aggregate.average ?? 0,
    count: aggregate.count,
    myRating: myRating?.value ?? null,
  };
}

export async function findRatingSummariesForRecipes(
  recipeIds: string[],
): Promise<Record<string, RatingSummary>> {
  if (recipeIds.length === 0) return {};

  const rows = await db
    .select({
      recipeId: ratings.recipeId,
      average: sql<number>`avg(${ratings.value})`,
      count: sql<number>`count(*)`,
    })
    .from(ratings)
    .where(inArray(ratings.recipeId, recipeIds))
    .groupBy(ratings.recipeId);

  return Object.fromEntries(rows.map((row) => [row.recipeId, { average: row.average, count: row.count }]));
}
