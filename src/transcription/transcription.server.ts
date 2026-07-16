import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { readUpload } from "#/uploads/uploads.server";

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

If they do not, say so and briefly explain what the photos appear to show instead.`;

async function buildImageBlocks(photoUrls: string[]): Promise<Anthropic.ImageBlockParam[]> {
  const blocks: Anthropic.ImageBlockParam[] = [];
  for (const url of photoUrls) {
    if (url.startsWith("/uploads/")) {
      const upload = await readUpload(url.slice("/uploads/".length));
      if (!upload) continue; // file deleted from disk; skip rather than fail the scan
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: upload.mime as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: upload.bytes.toString("base64"),
        },
      });
    } else {
      blocks.push({ type: "image", source: { type: "url", url } });
    }
  }
  return blocks;
}

export async function transcribeRecipePhotos(photoUrls: string[]): Promise<TranscriptionResult> {
  const images = await buildImageBlocks(photoUrls);
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
