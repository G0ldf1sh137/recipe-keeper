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
import { sessionMiddleware, requireAuthMiddleware } from "#/auth/auth-middleware";

export const listRecipes = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(listRecipesSchema)
  .handler(async ({ data, context }) => findRecipes(data, context.user?.id));

export const getRecipe = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.id, context.user?.id);
    if (!recipe) throw notFound();
    return recipe;
  });

export const createRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(createRecipeSchema)
  .handler(async ({ data, context }) => insertRecipe(data, context.user.id));

export const updateRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(updateRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await updateOwnedRecipe(data, context.user.id);
    if (!recipe) throw notFound();
    return recipe;
  });

export const deleteRecipe = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(deleteRecipeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await deleteOwnedRecipe(data, context.user.id);
    if (!recipe) throw notFound();
    return recipe;
  });
