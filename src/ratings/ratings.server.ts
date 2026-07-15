import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { ratings } from "#/db/schema";

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
