import { z } from "zod";
import { visibilityValues } from "#/db/schema";

export const ingredientSchema = z.object({
  qty: z.string(),
  unit: z.string(),
  name: z.string().min(1),
});

export const visibilitySchema = z.enum(visibilityValues);

export const createRecipeSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  ingredients: z.array(ingredientSchema).default([]),
  steps: z.array(z.string().min(1)).default([]),
  photoUrl: z.string().url().optional(),
  tags: z.array(z.string()).default([]),
  visibility: visibilitySchema.default("private"),
});

export const updateRecipeSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  ingredients: z.array(ingredientSchema).optional(),
  steps: z.array(z.string().min(1)).optional(),
  photoUrl: z.string().url().optional(),
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
