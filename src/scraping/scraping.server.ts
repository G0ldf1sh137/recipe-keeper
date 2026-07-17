import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { uploadImageBytes } from "#/uploads/uploads.server";

const scrapedRecipeOutputSchema = z.object({
  foundRecipe: z.boolean().describe("True only if the page shows a recipe (ingredients + method for preparing a dish)"),
  reason: z
    .string()
    .describe("One-sentence explanation of the determination, phrased for the recipe's owner"),
  recipe: z
    .union([
      z.object({
        title: z.string().describe("The recipe's title; empty string if the page doesn't name one"),
        description: z
          .string()
          .describe("Any headnote or intro blurb for the recipe; empty string if none"),
        ingredients: z.array(
          z.object({
            qty: z.string().describe("Quantity as written, e.g. '2' or '1/2'; empty if unstated"),
            unit: z.string().describe("Unit as written, e.g. 'cup'; empty if unstated"),
            name: z.string().describe("The ingredient itself"),
          }),
        ),
        steps: z.array(
          z.object({
            text: z.string(),
            imageUrls: z
              .array(z.string().url())
              .describe(
                "Absolute URLs of any images on the page that specifically illustrate this step; empty array if none",
              ),
          }),
        ).describe("The preparation steps, in order"),
        tags: z.array(z.string()).describe("2-4 lowercase tags such as 'dessert' or 'soup'"),
        yield: z
          .string()
          .describe(
            "The recipe's yield, e.g. '4 servings' or 'Makes 12 muffins'. Transcribe as written if stated; otherwise estimate a reasonable yield from the ingredient quantities. Empty string only if there's not enough information to even estimate one.",
          ),
        calories: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .describe(
            "Calories per serving. Use the page's own stated figure if present; otherwise estimate from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
          ),
        protein: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .describe(
            "Grams of protein per serving. Use the page's own stated figure if present; otherwise estimate from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
          ),
        carbs: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .describe(
            "Grams of carbohydrates per serving. Use the page's own stated figure if present; otherwise estimate from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
          ),
        fat: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .describe(
            "Grams of fat per serving. Use the page's own stated figure if present; otherwise estimate from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
          ),
        photoUrls: z
          .array(z.string().url())
          .describe(
            "Absolute URLs of photos of the finished dish found on the page (the hero/main recipe photo and similar). Do not include unrelated site images (ads, logos, author headshots, other recipes).",
          ),
      }),
      z.null(),
    ])
    .describe("The scraped recipe, or null when foundRecipe is false"),
});

export type ScrapedRecipe = NonNullable<z.infer<typeof scrapedRecipeOutputSchema>["recipe"]>;

export type ScrapeResult =
  | { status: "scraped"; recipe: ScrapedRecipe }
  | { status: "not_found"; reason: string }
  | { status: "error"; message: string };

const PROMPT_PREFIX = `A user of a recipe-keeping app pasted a link to a page they believe contains a recipe, and pressed a button asking to scrape it. Fetch the page at the URL below.

First decide whether it shows a recipe: ingredients plus a method for preparing a dish. General articles, listicles linking to other recipes, or unrelated pages do not count.

If it does show a recipe:
- Extract it faithfully, preserving the author's wording for title/description/steps.
- Normalize each ingredient line into qty/unit/name (e.g. "2 cups flour" -> qty "2", unit "cups", name "flour"). Leave qty or unit empty when unstated.
- Split the method into ordered steps as the page presents them.
- Find absolute image URLs on the page: the main/finished-dish photo(s) go in the recipe-level photoUrls; any image clearly illustrating one specific step goes in that step's imageUrls. Only include real photo URLs actually present on the fetched page — never invent one. Skip ads, logos, author photos, and images for unrelated recipes.
- Suggest 2-4 lowercase tags.
- Determine the yield (servings) and nutrition per serving (calories, protein, carbs, fat): use the page's stated values if present; otherwise estimate them from the ingredient list and quantities using your general nutrition knowledge. Only leave a figure blank (empty string / null) if there's not enough information to make any reasonable estimate.

If it does not show a recipe, say so and briefly explain what the page appears to show instead (including if the page could not be fetched at all).

URL: `;

async function rehostImage(url: string): Promise<string | null> {
  let response: Response;
  try {
    response = await fetch(url);
  } catch {
    return null;
  }
  if (!response.ok) return null;

  const bytes = new Uint8Array(await response.arrayBuffer());
  const result = await uploadImageBytes(bytes);
  return "url" in result ? result.url : null;
}

async function rehostAll(urls: string[]): Promise<string[]> {
  const rehosted = await Promise.all(urls.map(rehostImage));
  return rehosted.filter((url): url is string => url !== null);
}

async function rehostRecipeImages(recipe: ScrapedRecipe): Promise<ScrapedRecipe> {
  const [photoUrls, steps] = await Promise.all([
    rehostAll(recipe.photoUrls),
    Promise.all(
      recipe.steps.map(async (step) => ({ ...step, imageUrls: await rehostAll(step.imageUrls) })),
    ),
  ]);
  return { ...recipe, photoUrls, steps };
}

export async function scrapeRecipeFromUrl(url: string): Promise<ScrapeResult> {
  const client = new Anthropic();

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      tools: [{ type: "web_fetch_20260209", name: "web_fetch", max_uses: 1 }],
      output_config: { format: zodOutputFormat(scrapedRecipeOutputSchema) },
      messages: [{ role: "user", content: `${PROMPT_PREFIX}${url}` }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: "error", message: "The Claude API key is missing or invalid." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { status: "error", message: "The Claude API is rate limited right now. Try again in a minute." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Scraping API error:", error.status, error.message);
      return { status: "error", message: "Scraping failed. Please try again." };
    }
    throw error;
  }

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { status: "error", message: "Claude couldn't produce a recipe from this page." };
  }

  const output = response.parsed_output;
  if (!output.foundRecipe || !output.recipe) {
    return { status: "not_found", reason: output.reason };
  }

  const recipe = await rehostRecipeImages(output.recipe);
  return { status: "scraped", recipe };
}
