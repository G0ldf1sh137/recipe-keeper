import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuthMiddleware } from "#/auth/auth-middleware";
import { imageUrlSchema } from "#/recipes/schemas";
import { transcribeRecipePhotos } from "./transcription.server";
import type { TranscriptionResult } from "./transcription.server";

export const processRecipePhotos = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(z.object({ photoUrls: z.array(imageUrlSchema).min(1) }))
  .handler(async ({ data }): Promise<TranscriptionResult> => {
    return transcribeRecipePhotos(data.photoUrls);
  });
