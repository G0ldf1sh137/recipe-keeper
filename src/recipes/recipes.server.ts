import { and, arrayContains, eq, inArray, ne, or } from "drizzle-orm";
import { db } from "#/db/index";
import { recipes, shares } from "#/db/schema";
import type {
  createRecipeSchema,
  deleteRecipeSchema,
  listRecipesSchema,
  updateRecipeSchema,
} from "./schemas";
import type { z } from "zod";

// A recipe is visible to a viewer if it's public, or the viewer owns it.
// "unlisted" recipes are intentionally excluded here — they're only reachable
// via a valid share token (see findRecipeById's shareToken param).
function visibleToViewer(viewerId: string | undefined) {
  return viewerId
    ? or(eq(recipes.visibility, "public"), eq(recipes.ownerId, viewerId))
    : eq(recipes.visibility, "public");
}

export async function findRecipeById(id: string, viewerId: string | undefined, shareToken?: string) {
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, id), visibleToViewer(viewerId)),
  });
  if (recipe) return recipe;
  if (!shareToken) return undefined;

  const share = await db.query.shares.findFirst({
    where: and(eq(shares.token, shareToken), eq(shares.recipeId, id)),
  });
  if (!share) return undefined;
  return db.query.recipes.findFirst({
    where: and(eq(recipes.id, id), ne(recipes.visibility, "private")),
  });
}

export async function findRecipes(filters: z.infer<typeof listRecipesSchema>, viewerId: string | undefined) {
  const conditions = [visibleToViewer(viewerId)];
  if (filters.ownerId) conditions.push(eq(recipes.ownerId, filters.ownerId));
  if (filters.visibility) conditions.push(eq(recipes.visibility, filters.visibility));
  if (filters.tag) conditions.push(arrayContains(recipes.tags, [filters.tag]));
  return db.query.recipes.findMany({
    where: and(...conditions),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
}

export async function filterVisibleRecipeIds(recipeIds: string[], viewerId: string | undefined) {
  if (recipeIds.length === 0) return [];
  const rows = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(inArray(recipes.id, recipeIds), visibleToViewer(viewerId)));
  return rows.map((row) => row.id);
}

export async function insertRecipe(input: z.infer<typeof createRecipeSchema>, ownerId: string) {
  const [recipe] = await db
    .insert(recipes)
    .values({ ...input, ownerId })
    .returning();
  return recipe;
}

export async function updateOwnedRecipe(input: z.infer<typeof updateRecipeSchema>, ownerId: string) {
  const { id, ...changes } = input;
  const rows = await db
    .update(recipes)
    .set(changes)
    .where(and(eq(recipes.id, id), eq(recipes.ownerId, ownerId)))
    .returning();
  return rows.at(0);
}

export async function deleteOwnedRecipe(input: z.infer<typeof deleteRecipeSchema>, ownerId: string) {
  const rows = await db
    .delete(recipes)
    .where(and(eq(recipes.id, input.id), eq(recipes.ownerId, ownerId)))
    .returning();
  return rows.at(0);
}

export async function findShareTokenForRecipe(recipeId: string, ownerId: string) {
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, recipeId), eq(recipes.ownerId, ownerId)),
  });
  if (!recipe) return undefined;
  const share = await db.query.shares.findFirst({ where: eq(shares.recipeId, recipeId) });
  return share?.token ?? null;
}

export async function createShareForRecipe(recipeId: string, ownerId: string) {
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, recipeId), eq(recipes.ownerId, ownerId)),
  });
  if (!recipe) return undefined;
  if (recipe.visibility === "private") {
    throw new Error("Set the recipe to unlisted or public before sharing it.");
  }

  const existing = await db.query.shares.findFirst({ where: eq(shares.recipeId, recipeId) });
  if (existing) return existing.token;

  const [share] = await db.insert(shares).values({ recipeId, createdBy: ownerId }).returning();
  return share.token;
}

export async function revokeShareForRecipe(recipeId: string, ownerId: string) {
  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.id, recipeId), eq(recipes.ownerId, ownerId)),
  });
  if (!recipe) return undefined;
  await db.delete(shares).where(eq(shares.recipeId, recipeId));
  return true;
}
