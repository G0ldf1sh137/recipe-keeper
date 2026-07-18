import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { pantryItems, recipes } from "#/db/schema";
import type { Ingredient } from "#/db/schema";
import { getMyHousehold } from "#/households/households.server";

export async function listPantryItems(ownerId: string): Promise<string[]> {
  const rows = await db.query.pantryItems.findMany({
    where: eq(pantryItems.ownerId, ownerId),
    orderBy: (p, { asc }) => [asc(p.name)],
  });
  return rows.map((row) => row.name);
}

async function pantryItemsForMembers(memberIds: string[]) {
  return db.query.pantryItems.findMany({
    where: inArray(pantryItems.ownerId, memberIds),
    orderBy: (p, { asc }) => [asc(p.name)],
  });
}

// Unions every household member's pantry (deduped by name) so "what can we
// make" reflects the whole household's stock; falls back to a solo pantry
// for users not in a household. Adding/removing items still only ever
// touches the caller's own rows (see addPantryItem/removePantryItem below).
export async function listCombinedPantryNames(userId: string): Promise<string[]> {
  const household = await getMyHousehold(userId);
  if (!household) return listPantryItems(userId);

  const rows = await pantryItemsForMembers(household.members.map((m) => m.id));
  return [...new Set(rows.map((row) => row.name))];
}

export type PantryGroup = { ownerId: string; ownerName: string; items: string[] };

// Per-member breakdown of the household pantry, so the UI can show whose
// items are whose (grouped/color-coded) rather than one anonymous merged
// list. Returns null for users not in a household — the page falls back to
// its plain solo chip list in that case.
export async function listPantryGroups(userId: string): Promise<PantryGroup[] | null> {
  const household = await getMyHousehold(userId);
  if (!household) return null;

  const rows = await pantryItemsForMembers(household.members.map((m) => m.id));
  const byOwner = new Map<string, string[]>();
  for (const row of rows) {
    const list = byOwner.get(row.ownerId) ?? [];
    list.push(row.name);
    byOwner.set(row.ownerId, list);
  }
  return household.members.map((m) => ({ ownerId: m.id, ownerName: m.name, items: byOwner.get(m.id) ?? [] }));
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

// Lets the household owner remove any member's item, not just their own —
// still requires the target to actually be a fellow household member.
export async function removePantryItemAsOwner(requesterId: string, targetOwnerId: string, name: string) {
  const household = await getMyHousehold(requesterId);
  if (!household || household.ownerId !== requesterId) {
    throw new Error("Only the household owner can remove another member's items.");
  }
  if (!household.members.some((m) => m.id === targetOwnerId)) {
    throw new Error("That user isn't in your household.");
  }
  await removePantryItem(targetOwnerId, name);
}

// Wipes every item from every member's pantry at once.
export async function clearHouseholdPantry(requesterId: string) {
  const household = await getMyHousehold(requesterId);
  if (!household || household.ownerId !== requesterId) {
    throw new Error("Only the household owner can clear the pantry.");
  }
  await db.delete(pantryItems).where(
    inArray(
      pantryItems.ownerId,
      household.members.map((m) => m.id),
    ),
  );
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
