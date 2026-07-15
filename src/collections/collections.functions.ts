import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  createCollectionSchema,
  renameCollectionSchema,
  deleteCollectionSchema,
  getCollectionSchema,
  collectionsForRecipeSchema,
  toggleRecipeInCollectionSchema,
} from "./schemas";
import {
  findCollectionsByOwner,
  findCollectionById,
  findRecipesInCollection,
  insertCollection,
  renameOwnedCollection,
  deleteOwnedCollection,
  findCollectionsWithMembership,
  toggleMembership,
} from "./collections.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { requireAuthMiddleware } from "#/auth/auth-middleware";

export const listMyCollections = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => findCollectionsByOwner(context.user.id));

export const getCollection = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .validator(getCollectionSchema)
  .handler(async ({ data, context }) => {
    const collection = await findCollectionById(data.id, context.user.id);
    if (!collection) throw notFound();
    const items = await findRecipesInCollection(data.id, context.user.id);
    return { collection, items };
  });

export const createCollection = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(createCollectionSchema)
  .handler(async ({ data, context }) => insertCollection(data.name, context.user.id));

export const renameCollection = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(renameCollectionSchema)
  .handler(async ({ data, context }) => {
    const updated = await renameOwnedCollection(data.id, context.user.id, data.name);
    if (!updated) throw notFound();
    return updated;
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(deleteCollectionSchema)
  .handler(async ({ data, context }) => {
    const deleted = await deleteOwnedCollection(data.id, context.user.id);
    if (!deleted) throw notFound();
    return deleted;
  });

export const getCollectionsForRecipe = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .validator(collectionsForRecipeSchema)
  .handler(async ({ data, context }) => findCollectionsWithMembership(context.user.id, data.recipeId));

export const toggleRecipeInCollection = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(toggleRecipeInCollectionSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id);
    if (!recipe) throw notFound();
    const result = await toggleMembership(data.collectionId, data.recipeId, context.user.id);
    if (!result) throw notFound();
    return result;
  });
