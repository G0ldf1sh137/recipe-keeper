import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import {
  createRecipeSchema,
  deleteRecipeSchema,
  getRecipeSchema,
  listRecipesSchema,
  updateRecipeSchema,
} from "./schemas";
import {
  deleteOwnedRecipe,
  findRecipeById,
  findRecipes,
  insertRecipe,
  updateOwnedRecipe,
} from "./recipes.server";

// NOTE: these take ownerId/viewerId as plain input because there is no
// session/auth layer yet (see design-plan.md milestone 4). Once auth lands,
// swap these for a session middleware instead of trusting client-supplied ids.

export const listRecipes = createServerFn({ method: "GET" })
  .validator(listRecipesSchema)
  .handler(async ({ data }) => findRecipes(data));

export const getRecipe = createServerFn({ method: "GET" })
  .validator(getRecipeSchema)
  .handler(async ({ data }) => {
    const recipe = await findRecipeById(data.id, data.viewerId);
    if (!recipe) throw notFound();
    return recipe;
  });

export const createRecipe = createServerFn({ method: "POST" })
  .validator(createRecipeSchema)
  .handler(async ({ data }) => insertRecipe(data));

export const updateRecipe = createServerFn({ method: "POST" })
  .validator(updateRecipeSchema)
  .handler(async ({ data }) => {
    const recipe = await updateOwnedRecipe(data);
    if (!recipe) throw notFound();
    return recipe;
  });

export const deleteRecipe = createServerFn({ method: "POST" })
  .validator(deleteRecipeSchema)
  .handler(async ({ data }) => {
    const recipe = await deleteOwnedRecipe(data);
    if (!recipe) throw notFound();
    return recipe;
  });
