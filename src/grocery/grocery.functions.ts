import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  createGroceryListSchema,
  renameGroceryListSchema,
  deleteGroceryListSchema,
  getGroceryListSchema,
  groceryListsForRecipeSchema,
  toggleRecipeInGroceryListSchema,
  addGroceryItemSchema,
  deleteGroceryItemSchema,
  setGroupCheckedSchema,
} from "./schemas";
import {
  findGroceryListsByOwner,
  findGroceryListsWithMembership,
  insertGroceryList,
  renameOwnedGroceryList,
  deleteOwnedGroceryList,
  toggleRecipeInGroceryList as toggleRecipeInGroceryListDb,
  addManualItem,
  deleteGroceryItem as deleteGroceryItemDb,
  setItemsChecked,
  getGroceryListWithGroups,
} from "./grocery.server";
import { requireAuthMiddleware } from "#/auth/auth-middleware";

export const listMyGroceryLists = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .handler(async ({ context }) => findGroceryListsByOwner(context.user.id));

export const getGroceryList = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .validator(getGroceryListSchema)
  .handler(async ({ data, context }) => {
    const result = await getGroceryListWithGroups(data.id, context.user.id);
    if (!result) throw notFound();
    return result;
  });

export const createGroceryList = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(createGroceryListSchema)
  .handler(async ({ data, context }) => insertGroceryList(data.name, context.user.id));

export const renameGroceryList = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(renameGroceryListSchema)
  .handler(async ({ data, context }) => {
    const updated = await renameOwnedGroceryList(data.id, context.user.id, data.name);
    if (!updated) throw notFound();
    return updated;
  });

export const deleteGroceryList = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(deleteGroceryListSchema)
  .handler(async ({ data, context }) => {
    const deleted = await deleteOwnedGroceryList(data.id, context.user.id);
    if (!deleted) throw notFound();
    return deleted;
  });

export const getGroceryListsForRecipe = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .validator(groceryListsForRecipeSchema)
  .handler(async ({ data, context }) => findGroceryListsWithMembership(context.user.id, data.recipeId));

export const toggleRecipeInGroceryList = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(toggleRecipeInGroceryListSchema)
  .handler(async ({ data, context }) => {
    const result = await toggleRecipeInGroceryListDb(data.listId, data.recipeId, context.user.id);
    if (!result) throw notFound();
    return result;
  });

export const addGroceryItem = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(addGroceryItemSchema)
  .handler(async ({ data, context }) => {
    const item = await addManualItem(data.listId, context.user.id, {
      qty: data.qty,
      unit: data.unit,
      name: data.name,
    });
    if (!item) throw notFound();
    return item;
  });

export const deleteGroceryItem = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(deleteGroceryItemSchema)
  .handler(async ({ data, context }) => {
    const deleted = await deleteGroceryItemDb(data.listId, data.itemId, context.user.id);
    if (!deleted) throw notFound();
    return deleted;
  });

export const setGroupChecked = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(setGroupCheckedSchema)
  .handler(async ({ data, context }) => {
    const result = await setItemsChecked(data.listId, data.itemIds, context.user.id, data.checked);
    if (!result) throw notFound();
    return result;
  });
