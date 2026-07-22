import { z } from "zod";

export const pantryItemSchema = z.object({
  name: z.string().trim().min(1),
});

export const removeHouseholdPantryItemSchema = z.object({
  ownerId: z.string(),
  name: z.string().trim().min(1),
});

export const searchRecipesByPantryMatchSchema = z.object({
  q: z.string().trim().min(1),
  limit: z.number().int().positive().max(50).optional(),
});
