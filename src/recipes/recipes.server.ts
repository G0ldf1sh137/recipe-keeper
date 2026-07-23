import { and, asc as ascOrder, desc as descOrder, eq, getTableColumns, ilike, inArray, ne, or, sql } from "drizzle-orm";
import { db } from "#/db/index";
import {
  recipes,
  shares,
  users,
  ingredientNames,
  unitNames,
  tagNames,
  ratings,
  comments,
  hiddenRecipes,
  blocks,
  mutes,
} from "#/db/schema";
import { deleteImageUrls } from "#/uploads/uploads.server";
import type { createRecipeSchema, deleteRecipeSchema, updateRecipeSchema } from "./schemas";
import type { z } from "zod";
import type { Visibility } from "#/db/schema";

type RecipeFilters = {
  ownerId?: string;
  visibility?: Visibility;
  q?: string;
  sortBy?: "recent" | "topRated" | "mostComments";
  limit?: number;
  offset?: number;
};

// A recipe is visible to a viewer if it's public, or the viewer owns it.
function visibleToViewer(viewerId: string | undefined) {
  return viewerId
    ? or(eq(recipes.visibility, "public"), eq(recipes.ownerId, viewerId))
    : eq(recipes.visibility, "public");
}

// Hiding is per-viewer and applies to algorithmic surfaces only (browse,
// tag counts, similar recipes, random recipe) — direct links, profile pages,
// and cookbooks/Meal Weeks/polls a recipe was already added to are unaffected.
function notHiddenByViewer(viewerId: string | undefined) {
  if (!viewerId) return sql`true`;
  return sql`not exists (
    select 1 from ${hiddenRecipes}
    where ${hiddenRecipes.recipeId} = ${recipes.id} and ${hiddenRecipes.userId} = ${viewerId}
  )`;
}

// A mutual wall: a recipe is invisible to a viewer if either party has
// blocked the other. Applied both to algorithmic surfaces (browse, tags,
// similar, random) and to direct-link access (findRecipeById), unlike
// notHiddenByViewer/notMutedOwner which only apply to the former.
function noWallWithOwner(viewerId: string | undefined) {
  if (!viewerId) return sql`true`;
  return sql`not exists (
    select 1 from ${blocks}
    where (${blocks.blockerId} = ${viewerId} and ${blocks.blockedId} = ${recipes.ownerId})
       or (${blocks.blockerId} = ${recipes.ownerId} and ${blocks.blockedId} = ${viewerId})
  )`;
}

// One-directional and soft, like notHiddenByViewer: only filters algorithmic
// surfaces, never blocks a direct link to the recipe.
function notMutedOwner(viewerId: string | undefined) {
  if (!viewerId) return sql`true`;
  return sql`not exists (
    select 1 from ${mutes}
    where ${mutes.muterId} = ${viewerId} and ${mutes.mutedId} = ${recipes.ownerId}
  )`;
}

/**
 * 
 * @param term 
 * @returns 
 */
function ingredientMatches(term: string) {
  return sql`exists (
    select 1 from jsonb_array_elements(${recipes.ingredients}) as ing
    where ing->>'name' ilike ${`%${term}%`}
  )`;
}

/**
 * 
 * @param term 
 * @returns 
 */
function tagMatches(term: string) {
  return sql`exists (
    select 1 from unnest(${recipes.tags}) as t
    where t ilike ${`%${term}%`}
  )`;
}

const recipeWithOwnerColumns = {
  id: recipes.id,
  ownerId: recipes.ownerId,
  parentRecipeId: recipes.parentRecipeId,
  title: recipes.title,
  description: recipes.description,
  ingredients: recipes.ingredients,
  steps: recipes.steps,
  photoUrls: recipes.photoUrls,
  coverPhotoUrl: recipes.coverPhotoUrl,
  sourceUrl: recipes.sourceUrl,
  sourcePdfUrl: recipes.sourcePdfUrl,
  tags: recipes.tags,
  yield: recipes.yield,
  calories: recipes.calories,
  protein: recipes.protein,
  carbs: recipes.carbs,
  fat: recipes.fat,
  visibility: recipes.visibility,
  createdAt: recipes.createdAt,
  updatedAt: recipes.updatedAt,
  owner: {
    name: users.name,
    avatarUrl: sql<string | null>`coalesce(${users.avatarOverrideUrl}, ${users.avatarUrl})`,
    username: users.username,
  },
};

/**
 * 
 * @param id 
 * @param viewerId 
 * @param shareToken 
 * @param isAdmin 
 * @returns 
 */
export async function findRecipeById(
  id: string,
  viewerId: string | undefined,
  shareToken?: string,
  isAdmin = false,
) {
  const rows = await db
    .select(recipeWithOwnerColumns)
    .from(recipes)
    .innerJoin(users, eq(recipes.ownerId, users.id))
    .where(
      isAdmin
        ? eq(recipes.id, id)
        : and(eq(recipes.id, id), visibleToViewer(viewerId), noWallWithOwner(viewerId)),
    );
  const recipe = rows.at(0);
  if (recipe) return recipe;
  if (!shareToken) return undefined;

  const share = await db.query.shares.findFirst({
    where: and(eq(shares.token, shareToken), eq(shares.recipeId, id)),
  });
  if (!share) return undefined;
  const sharedRows = await db
    .select(recipeWithOwnerColumns)
    .from(recipes)
    .innerJoin(users, eq(recipes.ownerId, users.id))
    .where(and(eq(recipes.id, id), ne(recipes.visibility, "private")));
  return sharedRows.at(0);
}

/**
 * 
 * @param filters 
 * @param viewerId 
 * @returns 
 */
function buildRecipeFilterConditions(filters: RecipeFilters, viewerId: string | undefined) {
  const conditions = [
    visibleToViewer(viewerId),
    notHiddenByViewer(viewerId),
    noWallWithOwner(viewerId),
    notMutedOwner(viewerId),
  ];
  if (filters.ownerId) conditions.push(eq(recipes.ownerId, filters.ownerId));
  if (filters.visibility) conditions.push(eq(recipes.visibility, filters.visibility));
  if (filters.q) {
    conditions.push(
      or(
        ilike(recipes.title, `%${filters.q}%`),
        ilike(recipes.description, `%${filters.q}%`),
        tagMatches(filters.q),
        ingredientMatches(filters.q),
      ),
    );
  }
  return conditions;
}

// A recipe needs at least this many ratings before it's ranked by its average —
// otherwise a single 5-star vote could outrank a recipe with dozens of solid reviews.
const MIN_RATINGS_FOR_TOP_RATED = 3;

function paginateRows<T>(rows: T[], limit: number | undefined) {
  if (!limit) return { recipes: rows, hasMore: false };
  return { recipes: rows.slice(0, limit), hasMore: rows.length > limit };
}

const MAX_ROOT_RESOLUTION_HOPS = 5;

// Backfills the ancestor recipe for any fork in a page whose parent isn't
// itself present in that page (e.g. paginated onto a later page, or filtered
// out) — walked iteratively since a fork can itself be forked, bounded to a
// small number of hops rather than a single recursive query, matching this
// file's plain-query-builder style. Ancestors go through the same
// visibility/wall/mute/hidden filters as normal listing: an ancestor the
// viewer shouldn't see simply fails to resolve, leaving that fork to render
// standalone, the same safe fallback as before this existed.
async function resolveMissingRoots(
  pageRows: (typeof recipes.$inferSelect)[],
  viewerId: string | undefined,
): Promise<Record<string, typeof recipes.$inferSelect>> {
  const idsInPage = new Set(pageRows.map((r) => r.id));
  const resolved = new Map<string, typeof recipes.$inferSelect>();
  const visited = new Set<string>();
  let frontier = new Set(
    pageRows.map((r) => r.parentRecipeId).filter((id): id is string => !!id && !idsInPage.has(id)),
  );

  for (let hop = 0; hop < MAX_ROOT_RESOLUTION_HOPS && frontier.size > 0; hop++) {
    const ids = Array.from(frontier).filter((id) => !visited.has(id));
    if (ids.length === 0) break;
    ids.forEach((id) => visited.add(id));

    const rows = await db
      .select(getTableColumns(recipes))
      .from(recipes)
      .where(
        and(
          inArray(recipes.id, ids),
          visibleToViewer(viewerId),
          noWallWithOwner(viewerId),
          notMutedOwner(viewerId),
          notHiddenByViewer(viewerId),
        ),
      );
    for (const row of rows) resolved.set(row.id, row);

    frontier = new Set(
      rows
        .map((r) => r.parentRecipeId)
        .filter((id): id is string => !!id && !idsInPage.has(id) && !visited.has(id)),
    );
  }

  return Object.fromEntries(resolved);
}

export async function findRecipes(
  filters: RecipeFilters,
  viewerId: string | undefined,
): Promise<{
  recipes: (typeof recipes.$inferSelect)[];
  hasMore: boolean;
  extraRoots: Record<string, typeof recipes.$inferSelect>;
}> {
  const conditions = buildRecipeFilterConditions(filters, viewerId);
  const offset: number = filters.offset ?? 0;
  const limit: number | undefined = filters.limit;
  const sortBy = filters.sortBy ?? "recent";

  if (sortBy === "topRated") {
    const query = db
      .select(getTableColumns(recipes))
      .from(recipes)
      .leftJoin(ratings, eq(ratings.recipeId, recipes.id))
      .where(and(...conditions))
      .groupBy(recipes.id)
      .orderBy(
        descOrder(sql`(count(${ratings.value}) >= ${MIN_RATINGS_FOR_TOP_RATED})`),
        descOrder(sql`avg(${ratings.value})`),
        descOrder(sql`count(${ratings.value})`),
        descOrder(recipes.createdAt),
        ascOrder(recipes.id),
      )
      .$dynamic();
    const rows = limit ? await query.limit(limit + 1).offset(offset) : await query;
    const page = paginateRows(rows, limit);
    return { ...page, extraRoots: await resolveMissingRoots(page.recipes, viewerId) };
  }

  if (sortBy === "mostComments") {
    const query = db
      .select(getTableColumns(recipes))
      .from(recipes)
      .leftJoin(comments, eq(comments.recipeId, recipes.id))
      .where(and(...conditions))
      .groupBy(recipes.id)
      .orderBy(descOrder(sql`count(${comments.id})`), descOrder(recipes.createdAt), ascOrder(recipes.id))
      .$dynamic();
    const rows = limit ? await query.limit(limit + 1).offset(offset) : await query;
    const page = paginateRows(rows, limit);
    return { ...page, extraRoots: await resolveMissingRoots(page.recipes, viewerId) };
  }

  // Uses the plain query builder rather than db.query.recipes.findMany (the
  // relational query builder) because RQB mis-qualifies raw-sql column
  // references to other tables (e.g. hiddenRecipes.recipeId) as belonging to
  // "recipes" instead of "hidden_recipes", breaking the not-hidden filter.
  const query = db
    .select(getTableColumns(recipes))
    .from(recipes)
    .where(and(...conditions))
    .orderBy(descOrder(recipes.createdAt), ascOrder(recipes.id))
    .$dynamic();
  const rows = limit ? await query.limit(limit + 1).offset(offset) : await query;
  const page = paginateRows(rows, limit);
  return { ...page, extraRoots: await resolveMissingRoots(page.recipes, viewerId) };
}

export async function findRandomRecipeId(filters: RecipeFilters, viewerId: string | undefined) {
  const conditions = buildRecipeFilterConditions(filters, viewerId);
  const rows = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(...conditions))
    .orderBy(sql`random()`)
    .limit(1);
  return rows.length > 0 ? rows[0].id : null;
}

/**
 * 
 * @param recipeId 
 * @param viewerId 
 * @returns 
 */
export async function findForksOfRecipe(recipeId: string, viewerId: string | undefined) {
  return db
    .select(recipeWithOwnerColumns)
    .from(recipes)
    .innerJoin(users, eq(recipes.ownerId, users.id))
    .where(
      and(
        eq(recipes.parentRecipeId, recipeId),
        visibleToViewer(viewerId),
        noWallWithOwner(viewerId),
        notMutedOwner(viewerId),
      ),
    )
    .orderBy(recipes.createdAt);
}

export async function filterVisibleRecipeIds(recipeIds: string[], viewerId: string | undefined) {
  if (recipeIds.length === 0) return [];
  const rows = await db
    .select({ id: recipes.id })
    .from(recipes)
    .where(and(inArray(recipes.id, recipeIds), visibleToViewer(viewerId)));
  return rows.map((row) => row.id);
}

export async function upsertIngredientNames(names: string[]) {
  const unique = Array.from(new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)));
  if (unique.length === 0) return;
  await db
    .insert(ingredientNames)
    .values(unique.map((name) => ({ name })))
    .onConflictDoNothing({ target: ingredientNames.name });
}

export async function listIngredientNames() {
  const rows = await db.query.ingredientNames.findMany({ orderBy: (i, { asc }) => [asc(i.name)] });
  return rows.map((row) => row.name);
}

export async function upsertUnitNames(names: string[]) {
  const unique = Array.from(new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)));
  if (unique.length === 0) return;
  await db
    .insert(unitNames)
    .values(unique.map((name) => ({ name })))
    .onConflictDoNothing({ target: unitNames.name });
}

export async function listUnitNames() {
  const rows = await db.query.unitNames.findMany({ orderBy: (u, { asc }) => [asc(u.name)] });
  return rows.map((row) => row.name);
}

export async function upsertTagNames(names: string[]) {
  const unique = Array.from(new Set(names.map((n) => n.trim().toLowerCase()).filter(Boolean)));
  if (unique.length === 0) return;
  await db
    .insert(tagNames)
    .values(unique.map((name) => ({ name })))
    .onConflictDoNothing({ target: tagNames.name });
}

export async function listTagNames() {
  const rows = await db.query.tagNames.findMany({ orderBy: (t, { asc }) => [asc(t.name)] });
  return rows.map((row) => row.name);
}

export async function findTagCounts(viewerId: string | undefined): Promise<{ tag: string; count: number }[]> {
  const visibility = viewerId
    ? sql`(${recipes.visibility} = 'public' or ${recipes.ownerId} = ${viewerId})`
    : sql`${recipes.visibility} = 'public'`;
  const notHidden = notHiddenByViewer(viewerId);
  const noWall = noWallWithOwner(viewerId);
  const notMuted = notMutedOwner(viewerId);
  const rows = await db.execute<{ tag: string; count: number }>(sql`
    select tag, count(*)::int as count
    from ${recipes}, unnest(${recipes.tags}) as tag
    where ${visibility} and ${notHidden} and ${noWall} and ${notMuted}
    group by tag
    order by count desc, tag asc
  `);
  return [...rows];
}

export type SimilarRecipe = {
  id: string;
  title: string;
  visibility: "private" | "public";
  tags: string[];
  photoUrls: string[];
  coverPhotoUrl: string | null;
};

export async function findSimilarRecipes(
  tags: string[],
  ingredientNamesToMatch: string[],
  excludeRecipeId: string,
  viewerId: string | undefined,
  limit = 6,
): Promise<SimilarRecipe[]> {
  if (tags.length === 0 && ingredientNamesToMatch.length === 0) return [];

  const visibility = viewerId
    ? sql`(${recipes.visibility} = 'public' or ${recipes.ownerId} = ${viewerId})`
    : sql`${recipes.visibility} = 'public'`;
  const lowerIngredientNames = ingredientNamesToMatch.map((n) => n.toLowerCase());

  // drizzle expands an interpolated JS array into a parenthesized param list
  // (for `in (...)`), not a single array-typed param, so `= any(...)` isn't
  // usable here — and `in ()` on an empty array is invalid SQL, hence the guards.
  const tagOverlap =
    tags.length > 0
      ? sql`(select count(*) from unnest(${recipes.tags}) as t where t in ${tags})`
      : sql`0`;
  const ingredientOverlap =
    lowerIngredientNames.length > 0
      ? sql`(select count(*) from jsonb_array_elements(${recipes.ingredients}) as ing
          where lower(ing->>'name') in ${lowerIngredientNames})`
      : sql`0`;

  const rows = await db.execute<SimilarRecipe>(sql`
    select id, title, visibility, tags, "photoUrls", "coverPhotoUrl" from (
      select
        ${recipes.id} as id,
        ${recipes.title} as title,
        ${recipes.visibility} as visibility,
        ${recipes.tags} as tags,
        ${recipes.photoUrls} as "photoUrls",
        ${recipes.coverPhotoUrl} as "coverPhotoUrl",
        ${recipes.createdAt} as "createdAt",
        ${tagOverlap} as tag_overlap,
        ${ingredientOverlap} as ingredient_overlap
      from ${recipes}
      where ${recipes.id} != ${excludeRecipeId} and ${visibility}
        and ${notHiddenByViewer(viewerId)} and ${noWallWithOwner(viewerId)} and ${notMutedOwner(viewerId)}
    ) as scored
    where tag_overlap + ingredient_overlap > 0
    order by tag_overlap + ingredient_overlap desc, "createdAt" desc
    limit ${limit}
  `);
  return [...rows];
}

export async function insertRecipe(input: z.infer<typeof createRecipeSchema>, ownerId: string) {
  const [recipe] = await db
    .insert(recipes)
    .values({ ...input, ownerId })
    .returning();
  await upsertIngredientNames(input.ingredients.map((i) => i.name));
  await upsertUnitNames(input.ingredients.map((i) => i.unit));
  await upsertTagNames(input.tags);
  return recipe;
}

// A recipe's images can appear in photoUrls, coverPhotoUrl, or nested inside
// step.imageUrls — this collects the full set from one recipe row.
function collectImageUrls(recipe: {
  photoUrls: string[];
  coverPhotoUrl: string | null;
  sourcePdfUrl: string | null;
  steps: { imageUrls: string[] }[];
}): string[] {
  const urls = new Set<string>(recipe.photoUrls);
  if (recipe.coverPhotoUrl) urls.add(recipe.coverPhotoUrl);
  if (recipe.sourcePdfUrl) urls.add(recipe.sourcePdfUrl);
  for (const step of recipe.steps) {
    for (const url of step.imageUrls) urls.add(url);
  }
  return Array.from(urls);
}

// Forking copies a recipe's image URLs verbatim rather than duplicating the
// underlying files, so multiple recipe rows can point at the same S3 object.
// Before deleting anything from S3, we need every URL still in use across
// the whole table, not just the recipe being deleted/edited.
async function findAllReferencedImageUrls(): Promise<Set<string>> {
  const rows = await db
    .select({
      photoUrls: recipes.photoUrls,
      coverPhotoUrl: recipes.coverPhotoUrl,
      sourcePdfUrl: recipes.sourcePdfUrl,
      steps: recipes.steps,
    })
    .from(recipes);
  const urls = new Set<string>();
  for (const row of rows) {
    for (const url of collectImageUrls(row)) urls.add(url);
  }
  return urls;
}

export async function updateOwnedRecipe(
  input: z.infer<typeof updateRecipeSchema>,
  ownerId: string,
  isAdmin = false,
) {
  const { id, ...changes } = input;
  const scoped = isAdmin ? eq(recipes.id, id) : and(eq(recipes.id, id), eq(recipes.ownerId, ownerId));
  const before = await db.query.recipes.findFirst({ where: scoped });
  const rows = await db.update(recipes).set(changes).where(scoped).returning();
  const updated = rows.at(0);
  if (before && updated) {
    const afterUrls = new Set(collectImageUrls(updated));
    const removedUrls = collectImageUrls(before).filter((url) => !afterUrls.has(url));
    if (removedUrls.length > 0) {
      const stillReferenced = await findAllReferencedImageUrls();
      const orphaned = removedUrls.filter((url) => !stillReferenced.has(url));
      if (orphaned.length > 0) await deleteImageUrls(orphaned);
    }
  }
  if (changes.ingredients) {
    await upsertIngredientNames(changes.ingredients.map((i) => i.name));
    await upsertUnitNames(changes.ingredients.map((i) => i.unit));
  }
  if (changes.tags) await upsertTagNames(changes.tags);
  return updated;
}

export async function deleteOwnedRecipe(
  input: z.infer<typeof deleteRecipeSchema>,
  ownerId: string,
  isAdmin = false,
) {
  const scoped = isAdmin
    ? eq(recipes.id, input.id)
    : and(eq(recipes.id, input.id), eq(recipes.ownerId, ownerId));
  const rows = await db.delete(recipes).where(scoped).returning();
  const deleted = rows.at(0);
  if (deleted) {
    const candidateUrls = collectImageUrls(deleted);
    if (candidateUrls.length > 0) {
      const stillReferenced = await findAllReferencedImageUrls();
      const orphaned = candidateUrls.filter((url) => !stillReferenced.has(url));
      if (orphaned.length > 0) await deleteImageUrls(orphaned);
    }
  }
  return deleted;
}

export async function forkRecipe(recipeId: string, ownerId: string, shareToken?: string, isAdmin = false) {
  const original = await findRecipeById(recipeId, ownerId, shareToken, isAdmin);
  if (!original) return undefined;

  const [forked] = await db
    .insert(recipes)
    .values({
      ownerId,
      parentRecipeId: original.id,
      title: original.title,
      description: original.description,
      ingredients: original.ingredients,
      steps: original.steps,
      photoUrls: original.photoUrls,
      coverPhotoUrl: original.coverPhotoUrl,
      sourceUrl: original.sourceUrl,
      sourcePdfUrl: original.sourcePdfUrl,
      tags: original.tags,
      yield: original.yield,
      calories: original.calories,
      protein: original.protein,
      carbs: original.carbs,
      fat: original.fat,
      visibility: "private",
    })
    .returning();
  return { forked, originalOwnerId: original.ownerId };
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
    throw new Error("Set the recipe to public before sharing it.");
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
