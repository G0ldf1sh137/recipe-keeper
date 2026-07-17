import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { getNoteSchema, saveNoteSchema } from "./schemas";
import { findNote, upsertNote } from "./notes.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { requireAuthMiddleware } from "#/auth/auth-middleware";

export const getMyNote = createServerFn({ method: "GET" })
  .middleware([requireAuthMiddleware])
  .validator(getNoteSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id, undefined, context.user.isAdmin);
    if (!recipe) throw notFound();
    return (await findNote(data.recipeId, context.user.id)) ?? null;
  });

export const saveMyNote = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(saveNoteSchema)
  .handler(async ({ data, context }) => {
    const recipe = await findRecipeById(data.recipeId, context.user.id, undefined, context.user.isAdmin);
    if (!recipe) throw notFound();
    return (await upsertNote(data.recipeId, context.user.id, data.text)) ?? null;
  });
