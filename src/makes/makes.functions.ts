import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { markRecipeMadeSchema, getMakeCountSchema } from "./schemas";
import { insertMake, countMakes } from "./makes.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { sessionMiddleware, requireNotBannedMiddleware } from "#/auth/auth-middleware";

export const getMakeCount = createServerFn({ method: "GET" })
  .middleware([sessionMiddleware])
  .validator(getMakeCountSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user?.id, data.shareToken, context.user?.isAdmin);
    if (!recipe) throw notFound();
    return countMakes(data.recipeId);
  });

export const markRecipeMade = createServerFn({ method: "POST" })
  .middleware([requireNotBannedMiddleware])
  .validator(markRecipeMadeSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id, undefined, context.user.isAdmin);
    if (!recipe) throw notFound();
    await insertMake(data.recipeId, context.user.id);
    return countMakes(data.recipeId);
  });
