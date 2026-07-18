import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSubscriberMiddleware } from "#/auth/auth-middleware";
import { scrapeRecipeFromUrl } from "./scraping.server";
import type { ScrapeResult } from "./scraping.server";

export const scrapeRecipeUrl = createServerFn({ method: "POST" })
  .middleware([requireSubscriberMiddleware])
  .validator(
    z.object({
      url: z.string().url(),
      knownIngredientNames: z.array(z.string()).default([]),
      knownUnitNames: z.array(z.string()).default([]),
    }),
  )
  .handler(async ({ data }): Promise<ScrapeResult> => {
    return scrapeRecipeFromUrl(data.url, data.knownIngredientNames, data.knownUnitNames);
  });
