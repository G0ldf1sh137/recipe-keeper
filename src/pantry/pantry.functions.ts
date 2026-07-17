import { createServerFn } from "@tanstack/react-start";
import { requireAuthMiddleware } from "#/auth/auth-middleware";
import { pantryItemSchema } from "./schemas";
import { listPantryItems, addPantryItem as addPantryItemDb, removePantryItem as removePantryItemDb, findRecipesByPantry } from "./pantry.server";

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
    const pantryNames = await listPantryItems(context.user.id);
    return findRecipesByPantry(pantryNames, context.user.id);
  });
