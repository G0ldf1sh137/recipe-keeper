import { and, eq } from "drizzle-orm";
import { db } from "#/db/index";
import { hiddenRecipes } from "#/db/schema";

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
