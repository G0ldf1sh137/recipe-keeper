import { z } from "zod";

export const createGroceryListSchema = z.object({
  name: z.string().trim().min(1).max(100),
});

export const renameGroceryListSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1).max(100),
});

export const deleteGroceryListSchema = z.object({
  id: z.string().min(1),
});

export const getGroceryListSchema = z.object({
  id: z.string().min(1),
});

export const groceryListsForRecipeSchema = z.object({
  recipeId: z.string().min(1),
});

export const toggleRecipeInGroceryListSchema = z.object({
  listId: z.string().min(1),
  recipeId: z.string().min(1),
});

export const addGroceryItemSchema = z.object({
  listId: z.string().min(1),
  qty: z.string().trim().default(""),
  unit: z.string().trim().default(""),
  name: z.string().trim().min(1),
});

export const deleteGroceryItemSchema = z.object({
  listId: z.string().min(1),
  itemId: z.string().min(1),
});

export const setGroupCheckedSchema = z.object({
  listId: z.string().min(1),
  itemIds: z.array(z.string().min(1)).min(1),
  checked: z.boolean(),
});
