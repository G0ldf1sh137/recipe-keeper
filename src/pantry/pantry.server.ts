import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { pantryItems, recipes } from "#/db/schema";
import type { Ingredient } from "#/db/schema";

export async function listPantryItems(ownerId: string): Promise<string[]> {
  const rows = await db.query.pantryItems.findMany({
    where: eq(pantryItems.ownerId, ownerId),
    orderBy: (p, { asc }) => [asc(p.name)],
  });
  return rows.map((row) => row.name);
}

export async function addPantryItem(ownerId: string, name: string): Promise<void> {
  const normalized = name.trim().toLowerCase();
  if (!normalized) return;
  await db.insert(pantryItems).values({ ownerId, name: normalized }).onConflictDoNothing();
}

export async function removePantryItem(ownerId: string, name: string): Promise<void> {
  const normalized = name.trim().toLowerCase();
  await db.delete(pantryItems).where(and(eq(pantryItems.ownerId, ownerId), eq(pantryItems.name, normalized)));
}

export type PantryMatch = {
  id: string;
  title: string;
  visibility: "private" | "public";
  tags: string[];
  photoUrls: string[];
  coverPhotoUrl: string | null;
  ingredients: Ingredient[];
  totalIngredients: number;
  matchedIngredients: number;
};

export async function findRecipesByPantry(
  pantryNames: string[],
  viewerId: string | undefined,
  limit = 30,
): Promise<PantryMatch[]> {
  if (pantryNames.length === 0) return [];

  const lowerNames = pantryNames.map((n) => n.toLowerCase());
  const visibility = viewerId
    ? sql`(${recipes.visibility} = 'public' or ${recipes.ownerId} = ${viewerId})`
    : sql`${recipes.visibility} = 'public'`;

  const rows = await db.execute<{
    id: string;
    title: string;
    visibility: "private" | "public";
    tags: string[];
    photoUrls: string[];
    coverPhotoUrl: string | null;
    ingredients: Ingredient[];
    total: number;
    matched: number;
  }>(sql`
    select id, title, visibility, tags, "photoUrls", "coverPhotoUrl", ingredients, total, matched from (
      select
        ${recipes.id} as id,
        ${recipes.title} as title,
        ${recipes.visibility} as visibility,
        ${recipes.tags} as tags,
        ${recipes.photoUrls} as "photoUrls",
        ${recipes.coverPhotoUrl} as "coverPhotoUrl",
        ${recipes.ingredients} as ingredients,
        ${recipes.createdAt} as "createdAt",
        (select count(*) from jsonb_array_elements(${recipes.ingredients}) as ing) as total,
        (select count(*) from jsonb_array_elements(${recipes.ingredients}) as ing
          where lower(ing->>'name') in ${lowerNames}) as matched
      from ${recipes}
      where ${visibility}
    ) as scored
    where total > 0 and matched > 0
    order by (total - matched) asc, matched desc, "createdAt" desc
    limit ${limit}
  `);

  return [...rows].map((row) => ({
    id: row.id,
    title: row.title,
    visibility: row.visibility,
    tags: row.tags,
    photoUrls: row.photoUrls,
    coverPhotoUrl: row.coverPhotoUrl,
    ingredients: row.ingredients,
    totalIngredients: row.total,
    matchedIngredients: row.matched,
  }));
}
