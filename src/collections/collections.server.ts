import { and, eq, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { collections, collectionRecipes, recipes } from "#/db/schema";

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

export async function findCollectionById(id: string, ownerId: string) {
  return db.query.collections.findFirst({
    where: and(eq(collections.id, id), eq(collections.ownerId, ownerId)),
  });
}

export async function findRecipesInCollection(collectionId: string, ownerId: string) {
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
    .innerJoin(collections, eq(collectionRecipes.collectionId, collections.id))
    .where(and(eq(collectionRecipes.collectionId, collectionId), eq(collections.ownerId, ownerId)))
    .orderBy(collectionRecipes.addedAt);
}

export async function insertCollection(name: string, ownerId: string) {
  const [collection] = await db.insert(collections).values({ name, ownerId }).returning();
  return collection;
}

export async function renameOwnedCollection(id: string, ownerId: string, name: string) {
  const rows = await db
    .update(collections)
    .set({ name })
    .where(and(eq(collections.id, id), eq(collections.ownerId, ownerId)))
    .returning();
  return rows.at(0);
}

export async function deleteOwnedCollection(id: string, ownerId: string) {
  const rows = await db
    .delete(collections)
    .where(and(eq(collections.id, id), eq(collections.ownerId, ownerId)))
    .returning();
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

export async function toggleMembership(collectionId: string, recipeId: string, ownerId: string) {
  const collection = await findCollectionById(collectionId, ownerId);
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

  await db.insert(collectionRecipes).values({ collectionId, recipeId });
  return { inCollection: true };
}
