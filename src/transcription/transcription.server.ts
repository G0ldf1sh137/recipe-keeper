import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const transcriptionOutputSchema = z.object({
  isHandwrittenRecipe: z
    .boolean()
    .describe(
      "True only if the input actually shows or describes a recipe (ingredients and/or preparation steps) — whether that's a photo of a handwritten/typed recipe card, a PDF, or pasted text.",
    ),
  reason: z
    .string()
    .describe("One-sentence explanation of the determination, phrased for the recipe's owner"),
  recipe: z
    .union([
      z.object({
        title: z.string().describe("The recipe's title; empty string if the photos don't name one"),
        description: z
          .string()
          .describe("Any headnote or context written on the recipe; empty string if none"),
        ingredients: z.array(
          z.object({
            qty: z.string().describe("Quantity as written, e.g. '2' or '1/2'; empty if unstated"),
            unit: z.string().describe("Unit as written, e.g. 'cup'; empty if unstated"),
            name: z.string().describe("The ingredient itself"),
          }),
        ),
        steps: z.array(z.object({ text: z.string() })).describe("The preparation steps, in order"),
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
            "Calories per serving. Use the recipe's own stated figure if present; otherwise estimate from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
          ),
        protein: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .describe(
            "Grams of protein per serving. Use the recipe's own stated figure if present; otherwise estimate from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
          ),
        carbs: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .describe(
            "Grams of carbohydrates per serving. Use the recipe's own stated figure if present; otherwise estimate from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
          ),
        fat: z
          .number()
          .int()
          .nonnegative()
          .nullable()
          .describe(
            "Grams of fat per serving. Use the recipe's own stated figure if present; otherwise estimate from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
          ),
        sourceUrl: z
          .string()
          .describe(
            "A source URL for this recipe if one is explicitly written or shown in the input (printed on a recipe card/PDF, a link mentioned in pasted text). Empty string if none is present — never invent one.",
          ),
      }),
      z.null(),
    ])
    .describe("The transcribed recipe, or null when isHandwrittenRecipe is false"),
});

export type TranscribedRecipe = NonNullable<z.infer<typeof transcriptionOutputSchema>["recipe"]>;

export type TranscriptionResult =
  | { status: "transcribed"; recipe: TranscribedRecipe }
  | { status: "not_handwritten"; reason: string }
  | { status: "error"; message: string };

const PROMPT = `These images are the photos attached to one recipe record in a recipe-keeping app. The owner pressed a button asking to transcribe them.

First decide whether the photos show a handwritten or typed recipe: a recipe card, notebook page, letter, or similar written by hand or typed. Photos of food or cooking do not count.

If they do show a handwritten or typed recipe:
- Transcribe it faithfully, preserving the author's wording. If several photos show parts of the same recipe (front/back of a card, multiple pages), combine them into one recipe in the right order.
- Normalize each ingredient line into qty/unit/name (e.g. "2 cups flour" -> qty "2", unit "cups", name "flour"). Leave qty or unit empty when the writing doesn't specify them.
- Split the method into ordered steps. If the writing is one continuous paragraph, break it at natural sentence boundaries.
- If a word is truly illegible, transcribe your best reading followed by "(?)".
- Suggest 2-4 lowercase tags.
- Determine the yield (servings) and nutrition per serving (calories, protein, carbs, fat): transcribe them as written if the recipe states them; if not, estimate them from the ingredient list and quantities using your general nutrition knowledge. Only leave a figure blank (empty string / null) if there's not enough information to make any reasonable estimate.
- If a source URL is written or shown anywhere in the input, extract it into sourceUrl; otherwise leave it as an empty string. Never invent one.

If they do not, say so and briefly explain what the photos appear to show instead.`;

function buildImageBlocks(photoUrls: string[]): Anthropic.ImageBlockParam[] {
  return photoUrls.map((url) => ({ type: "image", source: { type: "url", url } }));
}

const PDF_PROMPT = `This PDF is attached to one recipe record in a recipe-keeping app. The owner pressed a button asking to transcribe it.

First decide whether the PDF shows a handwritten, typed, or printed recipe: a recipe card, notebook page, letter, printed page, or similar. Photos of food or cooking do not count.

If it does show a recipe:
- Transcribe it faithfully, preserving the author's wording. If several pages show parts of the same recipe (front/back of a card, multiple pages), combine them into one recipe in the right order.
- Normalize each ingredient line into qty/unit/name (e.g. "2 cups flour" -> qty "2", unit "cups", name "flour"). Leave qty or unit empty when the writing doesn't specify them.
- Split the method into ordered steps. If the writing is one continuous paragraph, break it at natural sentence boundaries.
- If a word is truly illegible, transcribe your best reading followed by "(?)".
- Suggest 2-4 lowercase tags.
- Determine the yield (servings) and nutrition per serving (calories, protein, carbs, fat): transcribe them as written if the recipe states them; if not, estimate them from the ingredient list and quantities using your general nutrition knowledge. Only leave a figure blank (empty string / null) if there's not enough information to make any reasonable estimate.
- If a source URL is written or shown anywhere in the input, extract it into sourceUrl; otherwise leave it as an empty string. Never invent one.

If it does not, say so and briefly explain what the PDF appears to show instead.`;

const TEXT_PROMPT = `This text was pasted by the owner of a recipe-keeping app into a "paste recipe text" import box. They pressed a button asking to import it as a recipe.

First decide whether the text actually describes a recipe (ingredients and/or a method for preparing a dish), as opposed to something unrelated.

If it does describe a recipe:
- Transcribe it faithfully, preserving the author's wording.
- Normalize each ingredient line into qty/unit/name (e.g. "2 cups flour" -> qty "2", unit "cups", name "flour"). Leave qty or unit empty when the text doesn't specify them.
- Split the method into ordered steps. If the method is one continuous paragraph, break it at natural sentence boundaries.
- Suggest 2-4 lowercase tags.
- Determine the yield (servings) and nutrition per serving (calories, protein, carbs, fat): use the text's own stated figures if present; if not, estimate them from the ingredient list and quantities using your general nutrition knowledge. Only leave a figure blank (empty string / null) if there's not enough information to make any reasonable estimate.
- If a source URL is written or shown anywhere in the input, extract it into sourceUrl; otherwise leave it as an empty string. Never invent one.

If it does not describe a recipe, say so and briefly explain what the text appears to be instead.`;

function buildNormalizationNote(knownIngredientNames: string[], knownUnitNames: string[]): string {
  const parts = [
    `Normalize each ingredient's name and unit so the same ingredient looks identical across different recipes (this lets a grocery list combine matching items). Use a clean, singular, lowercase ingredient name (e.g. "onion" not "onions" or "diced onions"; drop prep notes like "softened" or "to taste" that don't change what's shopped for) and a standard singular unit word (e.g. "tablespoon" not "tbsp"/"tablespoons", "cup" not "c."/"cups", "ounce" not "oz."). Only include a unit when one is actually stated or clearly implied.`,
  ];
  if (knownIngredientNames.length > 0) {
    parts.push(
      `Ingredient names already used in this app — reuse the exact spelling below when this ingredient is the same thing (but prefer the clean form above over reusing a messy or overly specific existing entry): ${knownIngredientNames.join(", ")}.`,
    );
  }
  if (knownUnitNames.length > 0) {
    parts.push(
      `Units already used in this app — reuse the exact spelling below when equivalent: ${knownUnitNames.join(", ")}.`,
    );
  }
  return parts.join("\n");
}

const nutritionEstimateSchema = z.object({
  yield: z
    .string()
    .describe(
      "The recipe's yield, e.g. '4 servings' or 'Makes 12 muffins'. Keep the given yield as-is if one was provided; otherwise estimate a reasonable yield from the ingredient quantities. Empty string only if there's not enough information to even estimate one.",
    ),
  calories: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe(
      "Calories per serving, estimated from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
    ),
  protein: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe(
      "Grams of protein per serving, estimated from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
    ),
  carbs: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe(
      "Grams of carbohydrates per serving, estimated from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
    ),
  fat: z
    .number()
    .int()
    .nonnegative()
    .nullable()
    .describe(
      "Grams of fat per serving, estimated from the ingredients, their quantities, and the yield, using general nutritional knowledge. Null only if there's not enough information to make any reasonable estimate.",
    ),
});

export type NutritionEstimate = z.infer<typeof nutritionEstimateSchema>;
export type NutritionEstimateResult =
  | { status: "estimated"; nutrition: NutritionEstimate }
  | { status: "error"; message: string };

function buildIngredientList(ingredients: { qty: string; unit: string; name: string }[]): string {
  return ingredients
    .map((ing) => [ing.qty, ing.unit, ing.name].filter((part) => part.trim()).join(" "))
    .join("\n");
}

export async function estimateRecipeNutrition(
  ingredients: { qty: string; unit: string; name: string }[],
  existingYield: string | null,
): Promise<NutritionEstimateResult> {
  const prompt = `Here is a recipe's ingredient list from a recipe-keeping app. The owner pressed a button asking to estimate its nutrition.

Ingredients:
${buildIngredientList(ingredients)}

${existingYield ? `Stated yield: ${existingYield}` : "No yield has been stated."}

Estimate the recipe's nutrition per serving (calories, protein, carbs, fat) from the ingredients, their quantities, and the yield, using general nutritional knowledge. ${
    existingYield
      ? "Keep the stated yield exactly as given."
      : "Also estimate a reasonable yield from the ingredient quantities."
  } Only leave a figure blank (empty string / null) if there's not enough information to make any reasonable estimate.`;

  const client = new Anthropic();

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 4000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(nutritionEstimateSchema) },
      messages: [{ role: "user", content: [{ type: "text", text: prompt }] }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: "error", message: "The Claude API key is missing or invalid." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { status: "error", message: "The Claude API is rate limited right now. Try again in a minute." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Nutrition estimate API error:", error.status, error.message);
      return { status: "error", message: "Estimating nutrition failed. Please try again." };
    }
    throw error;
  }

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { status: "error", message: "Claude couldn't produce a nutrition estimate for these ingredients." };
  }

  return { status: "estimated", nutrition: response.parsed_output };
}

export async function transcribeRecipeText(
  recipeText: string,
  knownIngredientNames: string[] = [],
  knownUnitNames: string[] = [],
): Promise<TranscriptionResult> {
  const client = new Anthropic();
  const prompt = `${TEXT_PROMPT}\n\n${buildNormalizationNote(knownIngredientNames, knownUnitNames)}`;

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(transcriptionOutputSchema) },
      messages: [{ role: "user", content: [{ type: "text", text: recipeText }, { type: "text", text: prompt }] }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: "error", message: "The Claude API key is missing or invalid." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { status: "error", message: "The Claude API is rate limited right now. Try again in a minute." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Text transcription API error:", error.status, error.message);
      return { status: "error", message: "Reading failed. Please try again." };
    }
    throw error;
  }

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { status: "error", message: "Claude couldn't produce a transcription for this text." };
  }

  const output = response.parsed_output;
  if (!output.isHandwrittenRecipe || !output.recipe) {
    return { status: "not_handwritten", reason: output.reason };
  }
  return { status: "transcribed", recipe: output.recipe };
}

export async function transcribeRecipePdf(
  pdfUrl: string,
  knownIngredientNames: string[] = [],
  knownUnitNames: string[] = [],
): Promise<TranscriptionResult> {
  let response: Response;
  try {
    response = await fetch(pdfUrl);
  } catch {
    return { status: "error", message: "Could not fetch the PDF to read." };
  }
  if (!response.ok) return { status: "error", message: "Could not fetch the PDF to read." };

  const bytes = new Uint8Array(await response.arrayBuffer());
  const data = Buffer.from(bytes).toString("base64");

  const client = new Anthropic();
  const prompt = `${PDF_PROMPT}\n\n${buildNormalizationNote(knownIngredientNames, knownUnitNames)}`;

  let apiResponse;
  try {
    apiResponse = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(transcriptionOutputSchema) },
      messages: [
        {
          role: "user",
          content: [
            { type: "document", source: { type: "base64", media_type: "application/pdf", data } },
            { type: "text", text: prompt },
          ],
        },
      ],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: "error", message: "The Claude API key is missing or invalid." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { status: "error", message: "The Claude API is rate limited right now. Try again in a minute." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("PDF transcription API error:", error.status, error.message);
      return { status: "error", message: "Scanning failed. Please try again." };
    }
    throw error;
  }

  if (apiResponse.stop_reason === "refusal" || !apiResponse.parsed_output) {
    return { status: "error", message: "Claude couldn't produce a transcription for this PDF." };
  }

  const output = apiResponse.parsed_output;
  if (!output.isHandwrittenRecipe || !output.recipe) {
    return { status: "not_handwritten", reason: output.reason };
  }
  return { status: "transcribed", recipe: output.recipe };
}

export async function transcribeRecipePhotos(
  photoUrls: string[],
  knownIngredientNames: string[] = [],
  knownUnitNames: string[] = [],
): Promise<TranscriptionResult> {
  const images = buildImageBlocks(photoUrls);
  if (images.length === 0) {
    return { status: "error", message: "None of this recipe's photos could be read." };
  }

  const client = new Anthropic();
  const prompt = `${PROMPT}\n\n${buildNormalizationNote(knownIngredientNames, knownUnitNames)}`;

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(transcriptionOutputSchema) },
      messages: [{ role: "user", content: [...images, { type: "text", text: prompt }] }],
    });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { status: "error", message: "The Claude API key is missing or invalid." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { status: "error", message: "The Claude API is rate limited right now. Try again in a minute." };
    }
    if (error instanceof Anthropic.APIError) {
      console.error("Transcription API error:", error.status, error.message);
      return { status: "error", message: "Scanning failed. Please try again." };
    }
    throw error;
  }

  if (response.stop_reason === "refusal" || !response.parsed_output) {
    return { status: "error", message: "Claude couldn't produce a transcription for these photos." };
  }

  const output = response.parsed_output;
  if (!output.isHandwrittenRecipe || !output.recipe) {
    return { status: "not_handwritten", reason: output.reason };
  }
  return { status: "transcribed", recipe: output.recipe };
}
