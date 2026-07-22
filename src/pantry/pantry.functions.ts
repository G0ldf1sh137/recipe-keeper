import { createServerFn } from "@tanstack/react-start";
import { requireSubscriberMiddleware } from "#/auth/auth-middleware";
import { pantryItemSchema, removeHouseholdPantryItemSchema, searchRecipesByPantryMatchSchema } from "./schemas";
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
  .middleware([requireSubscriberMiddleware])
  .handler(async ({ context }) => listPantryItems(context.user.id));

export const getCombinedPantryNames = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .handler(async ({ context }) => listCombinedPantryNames(context.user.id));

export const addPantryItem = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(pantryItemSchema)
  .handler(async ({ data, context }) => {
    await addPantryItemDb(context.user.id, data.name);
    return { ok: true };
  });

export const removePantryItem = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(pantryItemSchema)
  .handler(async ({ data, context }) => {
    await removePantryItemDb(context.user.id, data.name);
    return { ok: true };
  });

export const getPantryMatches = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .handler(async ({ context }) => {
    const pantryNames = await listCombinedPantryNames(context.user.id);
    return findRecipesByPantry(pantryNames, context.user.id);
  });

// Reused by the Dinner Polls "Add a recipe option" search so results are ranked
// the same way Pantry mode ranks recipes: fewest missing ingredients first.
// Unlike Pantry mode, doesn't require any ingredient overlap — a text search
// should still surface a recipe you don't have the ingredients for.
export const searchRecipesByPantryMatch = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .validator(searchRecipesByPantryMatchSchema)
  .handler(async ({ data, context }) => {
    const pantryNames = await listCombinedPantryNames(context.user.id);
    return findRecipesByPantry(pantryNames, context.user.id, {
      q: data.q,
      limit: data.limit ?? 10,
      requireMatch: false,
    });
  });

export const getPantryGroups = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .handler(async ({ context }) => listPantryGroups(context.user.id));

export const removeHouseholdPantryItem = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(removeHouseholdPantryItemSchema)
  .handler(async ({ data, context }) => {
    await removePantryItemAsOwner(context.user.id, data.ownerId, data.name);
    return { ok: true };
  });

export const clearPantry = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .handler(async ({ context }) => {
    await clearHouseholdPantry(context.user.id);
    return { ok: true };
  });
