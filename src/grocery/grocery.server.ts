import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "#/db/index";
import { groceryLists, groceryListItems } from "#/db/schema";
import { findRecipeById } from "#/recipes/recipes.server";
import { findCalendarForViewer, findEntriesForCalendar } from "#/calendars/calendars.server";
import { parseQuantity, addFractions, formatFraction } from "#/recipes/quantity";
import type { Fraction } from "#/recipes/quantity";

export async function findGroceryListsByOwner(ownerId: string) {
  return db
    .select({
      id: groceryLists.id,
      name: groceryLists.name,
      createdAt: groceryLists.createdAt,
      itemCount: sql<number>`count(${groceryListItems.id})::int`,
    })
    .from(groceryLists)
    .leftJoin(groceryListItems, eq(groceryListItems.listId, groceryLists.id))
    .where(eq(groceryLists.ownerId, ownerId))
    .groupBy(groceryLists.id)
    .orderBy(groceryLists.createdAt);
}

export async function findGroceryListById(id: string, ownerId: string, isAdmin = false) {
  return db.query.groceryLists.findFirst({
    where: isAdmin
      ? eq(groceryLists.id, id)
      : and(eq(groceryLists.id, id), eq(groceryLists.ownerId, ownerId)),
  });
}

export async function findGroceryListsWithMembership(ownerId: string, recipeId: string) {
  const rows = await db
    .select({
      id: groceryLists.id,
      name: groceryLists.name,
      inList: sql<number>`case when ${groceryListItems.id} is not null then 1 else 0 end`,
    })
    .from(groceryLists)
    .leftJoin(
      groceryListItems,
      and(eq(groceryListItems.listId, groceryLists.id), eq(groceryListItems.recipeId, recipeId)),
    )
    .where(eq(groceryLists.ownerId, ownerId))
    .orderBy(groceryLists.createdAt);

  const byList = new Map<string, { id: string; name: string; inList: boolean }>();
  for (const row of rows) {
    const existing = byList.get(row.id);
    const inList = row.inList === 1;
    if (!existing) byList.set(row.id, { id: row.id, name: row.name, inList });
    else if (inList) existing.inList = true;
  }
  return Array.from(byList.values());
}

export async function insertGroceryList(name: string, ownerId: string) {
  const [list] = await db.insert(groceryLists).values({ name, ownerId }).returning();
  return list;
}

export async function renameOwnedGroceryList(id: string, ownerId: string, name: string, isAdmin = false) {
  const scoped = isAdmin
    ? eq(groceryLists.id, id)
    : and(eq(groceryLists.id, id), eq(groceryLists.ownerId, ownerId));
  const rows = await db.update(groceryLists).set({ name }).where(scoped).returning();
  return rows.at(0);
}

export async function deleteOwnedGroceryList(id: string, ownerId: string, isAdmin = false) {
  const scoped = isAdmin
    ? eq(groceryLists.id, id)
    : and(eq(groceryLists.id, id), eq(groceryLists.ownerId, ownerId));
  const rows = await db.delete(groceryLists).where(scoped).returning();
  return rows.at(0);
}

async function insertIngredientsForRecipe(listId: string, recipe: Awaited<ReturnType<typeof findRecipeById>>) {
  if (!recipe || recipe.ingredients.length === 0) return;
  await db.insert(groceryListItems).values(
    recipe.ingredients.map((ingredient) => ({
      listId,
      recipeId: recipe.id,
      qty: ingredient.qty,
      unit: ingredient.unit,
      name: ingredient.name,
    })),
  );
}

export async function toggleRecipeInGroceryList(
  listId: string,
  recipeId: string,
  ownerId: string,
  isAdmin = false,
) {
  const list = await findGroceryListById(listId, ownerId, isAdmin);
  if (!list) return undefined;

  const existing = await db.query.groceryListItems.findFirst({
    where: and(eq(groceryListItems.listId, listId), eq(groceryListItems.recipeId, recipeId)),
  });

  if (existing) {
    await db
      .delete(groceryListItems)
      .where(and(eq(groceryListItems.listId, listId), eq(groceryListItems.recipeId, recipeId)));
    return { inList: false };
  }

  const recipe = await findRecipeById(recipeId, ownerId);
  if (!recipe) return undefined;
  await insertIngredientsForRecipe(listId, recipe);
  return { inList: true };
}

export async function addCalendarIngredientsToGroceryList(
  calendarId: string,
  listId: string,
  viewerId: string,
  shareToken?: string,
) {
  const calendar = await findCalendarForViewer(calendarId, viewerId, shareToken);
  if (!calendar) return undefined;
  const list = await findGroceryListById(listId, viewerId);
  if (!list) return undefined;

  const entries = await findEntriesForCalendar(calendarId);
  const recipeCache = new Map<string, Awaited<ReturnType<typeof findRecipeById>>>();

  let addedEntryCount = 0;
  for (const entry of entries) {
    if (!recipeCache.has(entry.recipeId)) {
      recipeCache.set(entry.recipeId, await findRecipeById(entry.recipeId, viewerId));
    }
    const recipe = recipeCache.get(entry.recipeId);
    if (!recipe) continue; // viewer can't see this recipe, skip it
    await insertIngredientsForRecipe(listId, recipe);
    addedEntryCount++;
  }
  return { addedEntryCount, totalEntries: entries.length };
}

export async function addManualItem(
  listId: string,
  ownerId: string,
  item: { qty: string; unit: string; name: string },
  isAdmin = false,
) {
  const list = await findGroceryListById(listId, ownerId, isAdmin);
  if (!list) return undefined;
  const [row] = await db
    .insert(groceryListItems)
    .values({ listId, recipeId: null, qty: item.qty, unit: item.unit, name: item.name })
    .returning();
  return row;
}

export async function deleteGroceryItem(listId: string, itemId: string, ownerId: string, isAdmin = false) {
  const list = await findGroceryListById(listId, ownerId, isAdmin);
  if (!list) return undefined;
  const rows = await db
    .delete(groceryListItems)
    .where(and(eq(groceryListItems.id, itemId), eq(groceryListItems.listId, listId)))
    .returning();
  return rows.at(0);
}

export async function setItemsChecked(
  listId: string,
  itemIds: string[],
  ownerId: string,
  checked: boolean,
  isAdmin = false,
) {
  const list = await findGroceryListById(listId, ownerId, isAdmin);
  if (!list) return undefined;
  if (itemIds.length === 0) return { ok: true };
  await db
    .update(groceryListItems)
    .set({ checked })
    .where(and(eq(groceryListItems.listId, listId), inArray(groceryListItems.id, itemIds)));
  return { ok: true };
}

type GroceryLine = { qty: string; unit: string; checked: boolean; itemIds: string[] };

export async function getGroceryListWithGroups(id: string, ownerId: string, isAdmin = false) {
  const list = await findGroceryListById(id, ownerId, isAdmin);
  if (!list) return undefined;

  const items = await db.query.groceryListItems.findMany({
    where: eq(groceryListItems.listId, id),
    orderBy: (i, { asc }) => [asc(i.createdAt)],
  });

  const byName = new Map<string, typeof items>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const bucket = byName.get(key);
    if (bucket) bucket.push(item);
    else byName.set(key, [item]);
  }

  const groups = Array.from(byName.values()).map((group) => {
    const byUnit = new Map<string, typeof items>();
    for (const item of group) {
      const key = item.unit.trim().toLowerCase();
      const bucket = byUnit.get(key);
      if (bucket) bucket.push(item);
      else byUnit.set(key, [item]);
    }

    const lines: GroceryLine[] = Array.from(byUnit.values()).flatMap((unitGroup) => {
      const parsedQtys = unitGroup.map((item) => parseQuantity(item.qty));
      const allNumeric = parsedQtys.every((qty) => qty !== undefined);
      if (allNumeric && unitGroup.length > 1) {
        const sum = parsedQtys.reduce<Fraction>((total, qty) => addFractions(total, qty), { num: 0n, den: 1n });
        return [
          {
            qty: formatFraction(sum),
            unit: unitGroup[0].unit,
            checked: unitGroup.every((item) => item.checked),
            itemIds: unitGroup.map((item) => item.id),
          },
        ];
      }
      return unitGroup.map((item) => ({
        qty: item.qty,
        unit: item.unit,
        checked: item.checked,
        itemIds: [item.id],
      }));
    });

    return { name: group[0].name, lines };
  });

  return { list, groups };
}
