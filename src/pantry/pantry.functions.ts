import { createServerFn } from "@tanstack/react-start";
import { requireAuthMiddleware } from "#/auth/auth-middleware";
import { pantryItemSchema, removeHouseholdPantryItemSchema } from "./schemas";
import {
  listPantryItems,
  listCombinedPantryNames,
  listPantryGroups,
  addPantryItem as addPantryItemDb,
  removePantryItem as removePantryItemDb,
  removePantryItemAsOwner,
  clearHouseholdPantry,
  findRecipesByPantry,
} from "./pantry.server";

export const getPantryItems = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => listPantryItems(context.user.id));

export const addPantryItem = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(pantryItemSchema)
  .handler(async ({ data, context }) => {
    await addPantryItemDb(context.user.id, data.name);
    return { ok: true };
  });

export const removePantryItem = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(pantryItemSchema)
  .handler(async ({ data, context }) => {
    await removePantryItemDb(context.user.id, data.name);
    return { ok: true };
  });

export const getPantryMatches = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    const pantryNames = await listCombinedPantryNames(context.user.id);
    return findRecipesByPantry(pantryNames, context.user.id);
  });

export const getPantryGroups = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => listPantryGroups(context.user.id));

export const removeHouseholdPantryItem = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(removeHouseholdPantryItemSchema)
  .handler(async ({ data, context }) => {
    await removePantryItemAsOwner(context.user.id, data.ownerId, data.name);
    return { ok: true };
  });

export const clearPantry = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => {
    await clearHouseholdPantry(context.user.id);
    return { ok: true };
  });
