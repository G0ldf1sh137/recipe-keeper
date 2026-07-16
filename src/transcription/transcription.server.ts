import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const transcriptionOutputSchema = z.object({
  isHandwrittenRecipe: z
    .boolean()
    .describe("True only if the photos show a handwritten or typed recipe (card, notebook page, letter, etc.)"),
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
- Determine the yield (servings) and calories per serving: transcribe them as written if the recipe states them; if not, estimate both from the ingredient list and quantities using your general nutrition knowledge. Only leave them blank (empty string / null) if there's not enough information to make any reasonable estimate.

If they do not, say so and briefly explain what the photos appear to show instead.`;

function buildImageBlocks(photoUrls: string[]): Anthropic.ImageBlockParam[] {
  return photoUrls.map((url) => ({ type: "image", source: { type: "url", url } }));
}

export async function transcribeRecipePhotos(photoUrls: string[]): Promise<TranscriptionResult> {
  const images = buildImageBlocks(photoUrls);
  if (images.length === 0) {
    return { status: "error", message: "None of this recipe's photos could be read." };
  }

  const client = new Anthropic();

  let response;
  try {
    response = await client.messages.parse({
      model: "claude-opus-4-8",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      output_config: { format: zodOutputFormat(transcriptionOutputSchema) },
      messages: [{ role: "user", content: [...images, { type: "text", text: PROMPT }] }],
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
