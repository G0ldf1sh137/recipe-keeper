import { z } from "zod";
import { visibilityValues } from "#/db/schema";

export const ingredientSchema = z.object({
  qty: z.string(),
  unit: z.string(),
  name: z.string().min(1),
});

// Either an absolute URL or a path produced by our own upload endpoint.
export const imageUrlSchema = z.union([
  z.string().url(),
  z.string().regex(/^\/uploads\/[0-9a-f]{32}\.(jpg|png|webp|gif)$/),
]);

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
  tags: z.array(z.string()).default([]),
  visibility: visibilitySchema.default("private"),
});

export const updateRecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  ingredients: z.array(ingredientSchema).optional(),
  steps: z.array(stepSchema).optional(),
  photoUrls: z.array(imageUrlSchema).optional(),
  tags: z.array(z.string()).optional(),
  visibility: visibilitySchema.optional(),
});

export const deleteRecipeSchema = z.object({
  id: z.string().min(1),
});

export const getRecipeSchema = z.object({
  id: z.string().min(1),
});

export const listRecipesSchema = z.object({
  ownerId: z.string().min(1).optional(),
  tag: z.string().min(1).optional(),
  visibility: visibilitySchema.optional(),
});
