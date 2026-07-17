import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  createCollectionSchema,
  renameCollectionSchema,
  deleteCollectionSchema,
  getCollectionSchema,
  collectionsForRecipeSchema,
  collectionShareSchema,
  toggleRecipeInCollectionSchema,
  updateCollectionVisibilitySchema,
  listPublicCollectionsSchema,
} from "./schemas";
import {
  createShareForCollection,
  findCollectionsByOwner,
  findCollectionForViewer,
  findPublicCollections,
  findRecipesInCollection,
  findShareTokenForCollection,
  insertCollection,
  renameOwnedCollection,
  deleteOwnedCollection,
  findCollectionsWithMembership,
  revokeShareForCollection,
  toggleMembership,
  updateCollectionVisibility as updateOwnedCollectionVisibility,
} from "./collections.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { sessionMiddleware, requireAuthMiddleware } from "#/auth/auth-middleware";

export const listMyCollections = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => findCollectionsByOwner(context.user.id));

export const listPublicCollections = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(listPublicCollectionsSchema)
  .handler(async ({ data, context }) => findPublicCollections(context.user?.id, data.q));

export const getCollection = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getCollectionSchema)
  .handler(async ({ data, context }) => {
    const isAdmin = context.user?.isAdmin ?? false;
    const collection = await findCollectionForViewer(data.id, context.user?.id, data.shareToken, isAdmin);
    if (!collection) throw notFound();
    const isOwner = collection.ownerId === context.user?.id;
    const canManage = isOwner || isAdmin;
    const shareToken = isOwner ? await findShareTokenForCollection(collection.id, context.user!.id) : null;
    const items = await findRecipesInCollection(data.id);
    return {
      collection: { ...collection, isOwner, canManage, shareUrl: shareToken ? `/shared/${shareToken}` : null },
      items,
    };
  });

export const createCollectionShare = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(collectionShareSchema)
  .handler(async ({ data, context }) => {
    const token = await createShareForCollection(data.collectionId, context.user.id);
    if (token === undefined) throw notFound();
    return { shareUrl: `/shared/${token}` };
  });

export const revokeCollectionShare = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(collectionShareSchema)
  .handler(async ({ data, context }) => {
    const result = await revokeShareForCollection(data.collectionId, context.user.id);
    if (result === undefined) throw notFound();
    return { ok: true };
  });

export const updateCollectionVisibility = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateCollectionVisibilitySchema)
  .handler(async ({ data, context }) => {
    const updated = await updateOwnedCollectionVisibility(
      data.id,
      context.user.id,
      data.visibility,
      context.user.isAdmin,
    );
    if (!updated) throw notFound();
    return updated;
  });

export const createCollection = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(createCollectionSchema)
  .handler(async ({ data, context }) => insertCollection(data.name, context.user.id));

export const renameCollection = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(renameCollectionSchema)
  .handler(async ({ data, context }) => {
    const updated = await renameOwnedCollection(data.id, context.user.id, data.name, context.user.isAdmin);
    if (!updated) throw notFound();
    return updated;
  });

export const deleteCollection = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(deleteCollectionSchema)
  .handler(async ({ data, context }) => {
    const deleted = await deleteOwnedCollection(data.id, context.user.id, context.user.isAdmin);
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
    const result = await toggleMembership(
      data.collectionId,
      data.recipeId,
      context.user.id,
      context.user.isAdmin,
    );
    if (!result) throw notFound();
    return result;
  });
