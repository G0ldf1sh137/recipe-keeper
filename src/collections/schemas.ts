import { z } from "zod";

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
});

export const collectionsForRecipeSchema = z.object({
  recipeId: z.string().min(1),
});

export const toggleRecipeInCollectionSchema = z.object({
  collectionId: z.string().min(1),
  recipeId: z.string().min(1),
});
