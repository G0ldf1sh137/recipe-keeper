import { and, desc, eq, ilike, ne, or, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { collections, collectionRecipes, recipes, shares, users } from "#/db/schema";
import type { Visibility } from "#/db/schema";

export async function findCollectionsByOwner(ownerId: string) {
  return db
    .select({
      id: collections.id,
      name: collections.name,
      createdAt: collections.createdAt,
      recipeCount: sql<number>`count(${collectionRecipes.recipeId})::int`,
    })
    .from(collections)
    .leftJoin(collectionRecipes, eq(collectionRecipes.collectionId, collections.id))
    .where(eq(collections.ownerId, ownerId))
    .groupBy(collections.id)
    .orderBy(collections.createdAt);
}

export async function findPublicCollectionsByOwner(ownerId: string) {
  return db
    .select({
      id: collections.id,
      name: collections.name,
      createdAt: collections.createdAt,
      recipeCount: sql<number>`count(${collectionRecipes.recipeId})::int`,
    })
    .from(collections)
    .leftJoin(collectionRecipes, eq(collectionRecipes.collectionId, collections.id))
    .where(and(eq(collections.ownerId, ownerId), eq(collections.visibility, "public")))
    .groupBy(collections.id)
    .orderBy(collections.createdAt);
}

// Global browse: every public collection, plus the viewer's own regardless
// of visibility — same "public or own" rule used everywhere else in the app.
export async function findPublicCollections(viewerId: string | undefined, q?: string) {
  const visible = viewerId
    ? or(eq(collections.visibility, "public"), eq(collections.ownerId, viewerId))
    : eq(collections.visibility, "public");
  const conditions = [visible];
  if (q) conditions.push(ilike(collections.name, `%${q}%`));

  return db
    .select({
      id: collections.id,
      name: collections.name,
      visibility: collections.visibility,
      createdAt: collections.createdAt,
      recipeCount: sql<number>`count(${collectionRecipes.recipeId})::int`,
      ownerName: users.name,
      ownerUsername: users.username,
    })
    .from(collections)
    .innerJoin(users, eq(collections.ownerId, users.id))
    .leftJoin(collectionRecipes, eq(collectionRecipes.collectionId, collections.id))
    .where(and(...conditions))
    .groupBy(collections.id, users.name, users.username)
    .orderBy(desc(collections.createdAt));
}

export async function findCollectionById(id: string, ownerId: string, isAdmin = false) {
  return db.query.collections.findFirst({
    where: isAdmin ? eq(collections.id, id) : and(eq(collections.id, id), eq(collections.ownerId, ownerId)),
  });
}

// A collection is visible to a viewer if it's public, or the viewer owns it.
export async function findCollectionForViewer(
  id: string,
  viewerId: string | undefined,
  shareToken?: string,
  isAdmin = false,
) {
  const visible = viewerId
    ? or(eq(collections.visibility, "public"), eq(collections.ownerId, viewerId))
    : eq(collections.visibility, "public");
  const collection = await db.query.collections.findFirst({
    where: isAdmin ? eq(collections.id, id) : and(eq(collections.id, id), visible),
  });
  if (collection) return collection;
  if (!shareToken) return undefined;

  const share = await db.query.shares.findFirst({
    where: and(eq(shares.token, shareToken), eq(shares.collectionId, id)),
  });
  if (!share) return undefined;
  return db.query.collections.findFirst({
    where: and(eq(collections.id, id), ne(collections.visibility, "private")),
  });
}

export async function findCollectionOwnerName(ownerId: string) {
  const owner = await db.query.users.findFirst({ where: eq(users.id, ownerId) });
  return owner?.name ?? "";
}

export async function findRecipesInCollection(collectionId: string) {
  return db
    .select({
      id: recipes.id,
      title: recipes.title,
      photoUrls: recipes.photoUrls,
      visibility: recipes.visibility,
      addedAt: collectionRecipes.addedAt,
    })
    .from(collectionRecipes)
    .innerJoin(recipes, eq(collectionRecipes.recipeId, recipes.id))
    .where(eq(collectionRecipes.collectionId, collectionId))
    .orderBy(collectionRecipes.position);
}

export async function insertCollection(name: string, ownerId: string) {
  const [collection] = await db.insert(collections).values({ name, ownerId }).returning();
  return collection;
}

export async function renameOwnedCollection(id: string, ownerId: string, name: string, isAdmin = false) {
  const scoped = isAdmin
    ? eq(collections.id, id)
    : and(eq(collections.id, id), eq(collections.ownerId, ownerId));
  const rows = await db.update(collections).set({ name }).where(scoped).returning();
  return rows.at(0);
}

export async function deleteOwnedCollection(id: string, ownerId: string, isAdmin = false) {
  const scoped = isAdmin
    ? eq(collections.id, id)
    : and(eq(collections.id, id), eq(collections.ownerId, ownerId));
  const rows = await db.delete(collections).where(scoped).returning();
  return rows.at(0);
}

export async function findCollectionsWithMembership(ownerId: string, recipeId: string) {
  const rows = await db
    .select({
      id: collections.id,
      name: collections.name,
      inCollection: sql<number>`case when ${collectionRecipes.recipeId} is not null then 1 else 0 end`,
    })
    .from(collections)
    .leftJoin(
      collectionRecipes,
      and(eq(collectionRecipes.collectionId, collections.id), eq(collectionRecipes.recipeId, recipeId)),
    )
    .where(eq(collections.ownerId, ownerId))
    .orderBy(collections.createdAt);
  return rows.map((row) => ({ id: row.id, name: row.name, inCollection: row.inCollection === 1 }));
}

export async function toggleMembership(
  collectionId: string,
  recipeId: string,
  ownerId: string,
  isAdmin = false,
) {
  const collection = await findCollectionById(collectionId, ownerId, isAdmin);
  if (!collection) return null;

  const existing = await db.query.collectionRecipes.findFirst({
    where: and(eq(collectionRecipes.collectionId, collectionId), eq(collectionRecipes.recipeId, recipeId)),
  });

  if (existing) {
    await db
      .delete(collectionRecipes)
      .where(and(eq(collectionRecipes.collectionId, collectionId), eq(collectionRecipes.recipeId, recipeId)));
    return { inCollection: false };
  }

  const [{ maxPosition }] = await db
    .select({ maxPosition: sql<number>`coalesce(max(${collectionRecipes.position}), -1)` })
    .from(collectionRecipes)
    .where(eq(collectionRecipes.collectionId, collectionId));
  await db.insert(collectionRecipes).values({ collectionId, recipeId, position: maxPosition + 1 });
  return { inCollection: true };
}

export async function reorderRecipesInCollection(
  collectionId: string,
  ownerId: string,
  recipeIds: string[],
  isAdmin = false,
) {
  const collection = await findCollectionById(collectionId, ownerId, isAdmin);
  if (!collection) return undefined;

  await db.transaction(async (tx) => {
    await Promise.all(
      recipeIds.map((recipeId, position) =>
        tx
          .update(collectionRecipes)
          .set({ position })
          .where(and(eq(collectionRecipes.collectionId, collectionId), eq(collectionRecipes.recipeId, recipeId))),
      ),
    );
  });
  return { ok: true };
}

export async function updateCollectionVisibility(
  id: string,
  ownerId: string,
  visibility: Visibility,
  isAdmin = false,
) {
  const scoped = isAdmin
    ? eq(collections.id, id)
    : and(eq(collections.id, id), eq(collections.ownerId, ownerId));
  const rows = await db.update(collections).set({ visibility }).where(scoped).returning();
  return rows.at(0);
}

export async function findShareTokenForCollection(collectionId: string, ownerId: string) {
  const collection = await findCollectionById(collectionId, ownerId);
  if (!collection) return undefined;
  const share = await db.query.shares.findFirst({ where: eq(shares.collectionId, collectionId) });
  return share?.token ?? null;
}

export async function createShareForCollection(collectionId: string, ownerId: string) {
  const collection = await findCollectionById(collectionId, ownerId);
  if (!collection) return undefined;
  if (collection.visibility === "private") {
    throw new Error("Set the list to public before sharing it.");
  }

  const existing = await db.query.shares.findFirst({ where: eq(shares.collectionId, collectionId) });
  if (existing) return existing.token;

  const [share] = await db.insert(shares).values({ collectionId, createdBy: ownerId }).returning();
  return share.token;
}

export async function revokeShareForCollection(collectionId: string, ownerId: string) {
  const collection = await findCollectionById(collectionId, ownerId);
  if (!collection) return undefined;
  await db.delete(shares).where(eq(shares.collectionId, collectionId));
  return true;
}
