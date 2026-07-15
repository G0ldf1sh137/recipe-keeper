import { and, eq, or, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { recipes } from "#/db/schema";
import type {
  createRecipeSchema,
  deleteRecipeSchema,
  listRecipesSchema,
  updateRecipeSchema,
} from "./schemas";
import type { z } from "zod";

// A recipe is visible to a viewer if it's public/unlisted, or the viewer owns it.
function visibleToViewer(viewerId: string | undefined) {
  return viewerId
    ? or(eq(recipes.visibility, "public"), eq(recipes.visibility, "unlisted"), eq(recipes.ownerId, viewerId))
    : or(eq(recipes.visibility, "public"), eq(recipes.visibility, "unlisted"));
}

export async function findRecipeById(id: string, viewerId: string | undefined) {
  return db.query.recipes.findFirst({
    where: and(eq(recipes.id, id), visibleToViewer(viewerId)),
  });
}

export async function findRecipes(filters: z.infer<typeof listRecipesSchema>, viewerId: string | undefined) {
  const conditions = [visibleToViewer(viewerId)];
  if (filters.ownerId) conditions.push(eq(recipes.ownerId, filters.ownerId));
  if (filters.visibility) conditions.push(eq(recipes.visibility, filters.visibility));
  // Tags are stored as a JSON array string; match the quoted value as a substring.
  if (filters.tag) conditions.push(sql`${recipes.tags} LIKE ${`%"${filters.tag}"%`}`);
  return db.query.recipes.findMany({
    where: and(...conditions),
    orderBy: (r, { desc }) => [desc(r.createdAt)],
  });
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
