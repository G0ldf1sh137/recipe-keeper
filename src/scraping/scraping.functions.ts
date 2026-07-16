import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireAuthMiddleware } from "#/auth/auth-middleware";
import { scrapeRecipeFromUrl } from "./scraping.server";
import type { ScrapeResult } from "./scraping.server";

export const scrapeRecipeUrl = createServerFn({ method: "POST" })
  .middleware([requireAuthMiddleware])
  .validator(z.object({ url: z.string().url() }))
  .handler(async ({ data }): Promise<ScrapeResult> => {
    return scrapeRecipeFromUrl(data.url);
  });
