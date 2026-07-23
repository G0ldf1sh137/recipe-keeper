import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSubscriberMiddleware } from "#/auth/auth-middleware";
import { imageUrlSchema } from "#/recipes/schemas";
import {
  transcribeRecipePhotos,
  transcribeRecipePdf,
  transcribeRecipeText,
  estimateRecipeNutrition,
} from "./transcription.server";
import type { TranscriptionResult, NutritionEstimateResult } from "./transcription.server";

export const processRecipePhotos = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
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
  .middleware([requireSubscriberMiddleware])
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
  .middleware([requireSubscriberMiddleware])
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

export const estimateNutrition = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(
    z.object({
      ingredients: z.array(z.object({ qty: z.string(), unit: z.string(), name: z.string() })).min(1),
      yield: z.string().nullable().default(null),
    }),
  )
  .handler(async ({ data }): Promise<NutritionEstimateResult> => {
    return estimateRecipeNutrition(data.ingredients, data.yield);
  });
