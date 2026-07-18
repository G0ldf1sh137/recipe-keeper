import { z } from "zod";
import { visibilityValues } from "#/db/schema";

export const createCollectionSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const renameCollectionSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
});

export const deleteCollectionSchema = z.object({
  id: z.string().min(1),
});

export const getCollectionSchema = z.object({
  id: z.string().min(1),
  shareToken: z.string().min(1).optional(),
});

export const collectionShareSchema = z.object({
  collectionId: z.string().min(1),
});

export const updateCollectionVisibilitySchema = z.object({
  id: z.string().min(1),
  visibility: z.enum(visibilityValues),
});

export const collectionsForRecipeSchema = z.object({
  recipeId: z.string().min(1),
});

export const toggleRecipeInCollectionSchema = z.object({
  collectionId: z.string().min(1),
  recipeId: z.string().min(1),
});

export const reorderRecipesInCollectionSchema = z.object({
  collectionId: z.string().min(1),
  recipeIds: z.array(z.string().min(1)),
});

export const listPublicCollectionsSchema = z.object({
  q: z.string().min(1).optional(),
});

export const toggleCollectionBookmarkSchema = z.object({
  collectionId: z.string().min(1),
});
