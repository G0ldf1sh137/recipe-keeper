import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { requireAuthMiddleware } from "#/auth/auth-middleware";
import { findRecipeById } from "#/recipes/recipes.server";
import { transcribeRecipePhotos } from "./transcription.server";
import type { TranscriptionResult } from "./transcription.server";

export const processRecipePhotos = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(z.object({ recipeId: z.string().min(1) }))
  .handler(async ({ data, context }): Promise<TranscriptionResult> => {
    const recipe = await findRecipeById(data.recipeId, context.user.id);
    if (!recipe || recipe.ownerId !== context.user.id) throw notFound();
    if (recipe.photoUrls.length === 0) {
      return { status: "error", message: "This recipe has no photos to scan." };
    }
    return transcribeRecipePhotos(recipe.photoUrls);
  });
