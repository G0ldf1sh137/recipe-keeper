import { z } from "zod";

export const pantryItemSchema = z.object({
  name: z.string().trim().min(1),
});

export const removeHouseholdPantryItemSchema = z.object({
  ownerId: z.string(),
  name: z.string().trim().min(1),
});
