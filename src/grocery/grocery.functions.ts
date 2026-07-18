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
  addCalendarToGroceryListSchema,
} from "./schemas";
import {
  findGroceryListsByOwner,
  findGroceryListsWithMembership,
  findGroceryItemPresence,
  insertGroceryList,
  renameOwnedGroceryList,
  deleteOwnedGroceryList,
  toggleRecipeInGroceryList as toggleRecipeInGroceryListDb,
  addManualItem,
  deleteGroceryItem as deleteGroceryItemDb,
  setItemsChecked,
  getGroceryListWithGroups,
  addCalendarIngredientsToGroceryList,
} from "./grocery.server";
import { requireSubscriberMiddleware } from "#/auth/auth-middleware";

export const listMyGroceryLists = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .handler(async ({ context }) => findGroceryListsByOwner(context.user.id));

export const getGroceryList = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .validator(getGroceryListSchema)
  .handler(async ({ data, context }) => {
    const result = await getGroceryListWithGroups(data.id, context.user.id, context.user.isAdmin);
    if (!result) throw notFound();
    const isOwner = result.list.ownerId === context.user.id;
    const canManage = isOwner || context.user.isAdmin;
    return { ...result, list: { ...result.list, isOwner, canManage } };
  });

export const createGroceryList = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(createGroceryListSchema)
  .handler(async ({ data, context }) => insertGroceryList(data.name, context.user.id));

export const renameGroceryList = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(renameGroceryListSchema)
  .handler(async ({ data, context }) => {
    const updated = await renameOwnedGroceryList(data.id, context.user.id, data.name, context.user.isAdmin);
    if (!updated) throw notFound();
    return updated;
  });

export const deleteGroceryList = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(deleteGroceryListSchema)
  .handler(async ({ data, context }) => {
    const deleted = await deleteOwnedGroceryList(data.id, context.user.id, context.user.isAdmin);
    if (!deleted) throw notFound();
    return deleted;
  });

export const getGroceryListsForRecipe = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .validator(groceryListsForRecipeSchema)
  .handler(async ({ data, context }) => findGroceryListsWithMembership(context.user.id, data.recipeId));

export const getGroceryItemPresence = createServerFn({ method: "GET" })
  .middleware([requireSubscriberMiddleware])
  .handler(async ({ context }) => findGroceryItemPresence(context.user.id));

export const toggleRecipeInGroceryList = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(toggleRecipeInGroceryListSchema)
  .handler(async ({ data, context }) => {
    const result = await toggleRecipeInGroceryListDb(
      data.listId,
      data.recipeId,
      context.user.id,
      context.user.isAdmin,
    );
    if (!result) throw notFound();
    return result;
  });

export const addGroceryItem = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(addGroceryItemSchema)
  .handler(async ({ data, context }) => {
    const item = await addManualItem(
      data.listId,
      context.user.id,
      { qty: data.qty, unit: data.unit, name: data.name },
      context.user.isAdmin,
    );
    if (!item) throw notFound();
    return item;
  });

export const deleteGroceryItem = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(deleteGroceryItemSchema)
  .handler(async ({ data, context }) => {
    const deleted = await deleteGroceryItemDb(data.listId, data.itemId, context.user.id, context.user.isAdmin);
    if (!deleted) throw notFound();
    return deleted;
  });

export const setGroupChecked = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(setGroupCheckedSchema)
  .handler(async ({ data, context }) => {
    const result = await setItemsChecked(
      data.listId,
      data.itemIds,
      context.user.id,
      data.checked,
      context.user.isAdmin,
    );
    if (!result) throw notFound();
    return result;
  });

export const addCalendarToGroceryList = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(addCalendarToGroceryListSchema)
  .handler(async ({ data, context }) => {
    const result = await addCalendarIngredientsToGroceryList(
      data.calendarId,
      data.listId,
      context.user.id,
      data.shareToken,
    );
    if (!result) throw notFound();
    return result;
  });
