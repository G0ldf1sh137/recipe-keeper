import { z } from "zod";
import { visibilityValues } from "#/db/schema";

export const ingredientSchema = z.object({
  qty: z.string(),
  unit: z.string(),
  name: z.string().min(1),
});

export const imageUrlSchema = z.string().url();

export const stepSchema = z.object({
  text: z.string().min(1),
  imageUrls: z.array(imageUrlSchema).default([]),
});

export const visibilitySchema = z.enum(visibilityValues);

export const createRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ingredients: z.array(ingredientSchema).default([]),
  steps: z.array(stepSchema).default([]),
  photoUrls: z.array(imageUrlSchema).default([]),
  coverPhotoUrl: imageUrlSchema.nullable().default(null),
  sourceUrl: z.string().trim().nullable().default(null),
  sourcePdfUrl: z.string().trim().nullable().default(null),
  tags: z.array(z.string()).default([]),
  yield: z.string().trim().min(1).nullable().default(null),
  calories: z.number().int().nonnegative().nullable().default(null),
  protein: z.number().int().nonnegative().nullable().default(null),
  carbs: z.number().int().nonnegative().nullable().default(null),
  fat: z.number().int().nonnegative().nullable().default(null),
  visibility: visibilitySchema.default("public"),
});

export const updateRecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  ingredients: z.array(ingredientSchema).optional(),
  steps: z.array(stepSchema).optional(),
  photoUrls: z.array(imageUrlSchema).optional(),
  coverPhotoUrl: imageUrlSchema.nullable().optional(),
  sourceUrl: z.string().trim().nullable().optional(),
  sourcePdfUrl: z.string().trim().nullable().optional(),
  tags: z.array(z.string()).optional(),
  yield: z.string().trim().min(1).nullable().optional(),
  calories: z.number().int().nonnegative().nullable().optional(),
  protein: z.number().int().nonnegative().nullable().optional(),
  carbs: z.number().int().nonnegative().nullable().optional(),
  fat: z.number().int().nonnegative().nullable().optional(),
  visibility: visibilitySchema.optional(),
});

export const deleteRecipeSchema = z.object({
  id: z.string().min(1),
});

export const getRecipeSchema = z.object({
  id: z.string().min(1),
  shareToken: z.string().min(1).optional(),
});

export const recipeShareSchema = z.object({
  recipeId: z.string().min(1),
});

export const forkRecipeSchema = z.object({
  recipeId: z.string().min(1),
  shareToken: z.string().min(1).optional(),
});

export const listRecipesSchema = z.object({
  ownerId: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  visibility: visibilitySchema.optional(),
  q: z.string().min(1).optional(),
});
