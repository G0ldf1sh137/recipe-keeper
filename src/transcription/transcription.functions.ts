import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuthMiddleware } from "#/auth/auth-middleware";
import { imageUrlSchema } from "#/recipes/schemas";
import { transcribeRecipePhotos, transcribeRecipePdf, transcribeRecipeText } from "./transcription.server";
import type { TranscriptionResult } from "./transcription.server";

export const processRecipePhotos = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      photoUrls: z.array(imageUrlSchema).min(1),
      knownIngredientNames: z.array(z.string()).default([]),
      knownUnitNames: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }): Promise<TranscriptionResult> => {
    return transcribeRecipePhotos(data.photoUrls, data.knownIngredientNames, data.knownUnitNames);
  });

export const processRecipePdf = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      pdfUrl: z.string().url(),
      knownIngredientNames: z.array(z.string()).default([]),
      knownUnitNames: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }): Promise<TranscriptionResult> => {
    return transcribeRecipePdf(data.pdfUrl, data.knownIngredientNames, data.knownUnitNames);
  });

export const processRecipeText = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(
    z.object({
      recipeText: z.string().trim().min(1),
      knownIngredientNames: z.array(z.string()).default([]),
      knownUnitNames: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }): Promise<TranscriptionResult> => {
    return transcribeRecipeText(data.recipeText, data.knownIngredientNames, data.knownUnitNames);
  });
