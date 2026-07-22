import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { hiddenRecipes, recipes } from "#/db/schema";

export async function isRecipeHidden(userId: string, recipeId: string): Promise<boolean> {
  const row = await db.query.hiddenRecipes.findFirst({
    where: and(eq(hiddenRecipes.userId, userId), eq(hiddenRecipes.recipeId, recipeId)),
  });
  return !!row;
}

export async function hideRecipe(userId: string, recipeId: string): Promise<void> {
  await db.insert(hiddenRecipes).values({ userId, recipeId }).onConflictDoNothing();
}

export async function unhideRecipe(userId: string, recipeId: string): Promise<void> {
  await db.delete(hiddenRecipes).where(and(eq(hiddenRecipes.userId, userId), eq(hiddenRecipes.recipeId, recipeId)));
}

export async function countHiddenRecipes(userId: string): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(hiddenRecipes)
    .where(eq(hiddenRecipes.userId, userId));
  return row.count;
}

export async function listHiddenRecipes(userId: string) {
  return db
    .select({
      id: recipes.id,
      title: recipes.title,
      visibility: recipes.visibility,
      coverPhotoUrl: recipes.coverPhotoUrl,
    })
    .from(hiddenRecipes)
    .innerJoin(recipes, eq(hiddenRecipes.recipeId, recipes.id))
    .where(eq(hiddenRecipes.userId, userId))
    .orderBy(desc(hiddenRecipes.createdAt));
}
