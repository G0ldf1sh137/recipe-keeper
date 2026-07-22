import * as cheerio from "cheerio";
import { uploadImageBytes } from "#/uploads/uploads.server";
import { transcribeRecipeText } from "#/transcription/transcription.server";
import type { TranscribedRecipe } from "#/transcription/transcription.server";

export type ScrapedRecipe = TranscribedRecipe & { photoUrls: string[] };

export type ScrapeResult =
  | { status: "scraped"; recipe: ScrapedRecipe }
  | { status: "not_found"; reason: string }
  | { status: "error"; message: string };

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function isRecipeType(type: unknown): boolean {
  if (typeof type === "string") return type === "Recipe";
  if (Array.isArray(type)) return type.includes("Recipe");
  return false;
}

function findRecipeNode(node: unknown): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  if (node === null || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;
  if (isRecipeType(obj["@type"])) return obj;
  if (obj["@graph"]) return findRecipeNode(obj["@graph"]);
  if (obj.mainEntity) return findRecipeNode(obj.mainEntity);
  return null;
}

function extractRecipeJsonLd(html: string): Record<string, unknown> | null {
  const $ = cheerio.load(html);
  const scripts = $('script[type="application/ld+json"]').toArray();
  for (const el of scripts) {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(el).contents().text());
    } catch {
      continue;
    }
    const found = findRecipeNode(parsed);
    if (found) return found;
  }
  return null;
}

function toArray(value: unknown): unknown[] {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function extractImageUrls(image: unknown): string[] {
  return toArray(image)
    .map((img) => {
      if (typeof img === "string") return img;
      if (img && typeof img === "object") return (img as Record<string, unknown>).url;
      return undefined;
    })
    .filter((url): url is string => typeof url === "string" && url.length > 0);
}

function flattenInstructions(instructions: unknown): string[] {
  if (typeof instructions === "string") {
    return instructions
      .split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }
  return toArray(instructions).flatMap((item): string[] => {
    if (typeof item === "string") return [item];
    if (item && typeof item === "object") {
      const obj = item as Record<string, unknown>;
      if (Array.isArray(obj.itemListElement)) return flattenInstructions(obj.itemListElement);
      if (typeof obj.text === "string") return [obj.text];
      if (typeof obj.name === "string") return [obj.name];
    }
    return [];
  });
}

function extractNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const match = /[\d.]+/.exec(value);
    return match ? parseFloat(match[0]) : null;
  }
  return null;
}

function extractNutritionLine(nutrition: unknown): string | null {
  if (!nutrition || typeof nutrition !== "object") return null;
  const obj = nutrition as Record<string, unknown>;
  const parts: string[] = [];
  const calories = extractNumber(obj.calories);
  if (calories !== null) parts.push(`${calories} calories`);
  const protein = extractNumber(obj.proteinContent);
  if (protein !== null) parts.push(`${protein}g protein`);
  const carbs = extractNumber(obj.carbohydrateContent);
  if (carbs !== null) parts.push(`${carbs}g carbs`);
  const fat = extractNumber(obj.fatContent);
  if (fat !== null) parts.push(`${fat}g fat`);
  return parts.length > 0 ? parts.join(", ") : null;
}

function extractYield(recipeYield: unknown): string {
  const values = toArray(recipeYield).map((v) => String(v));
  const withDigits = values.find((v) => /\d/.test(v));
  if (withDigits) return withDigits;
  return values.length > 0 ? values[0] : "";
}

function extractKeywords(keywords: unknown): string {
  if (typeof keywords === "string") return keywords;
  return toArray(keywords)
    .filter((k): k is string => typeof k === "string")
    .join(", ");
}

function buildRecipeTextBlob(node: Record<string, unknown>): string {
  const title = typeof node.name === "string" ? node.name : "";
  const description = typeof node.description === "string" ? node.description : "";
  const ingredients = toArray(node.recipeIngredient).filter((i): i is string => typeof i === "string");
  const instructions = flattenInstructions(node.recipeInstructions);
  const yieldText = extractYield(node.recipeYield);
  const nutritionLine = extractNutritionLine(node.nutrition);
  const keywords = extractKeywords(node.keywords);

  const lines: string[] = [];
  if (title) lines.push(`Title: ${title}`);
  if (description) lines.push(`Description: ${description}`);
  if (yieldText) lines.push(`Yield: ${yieldText}`);
  if (ingredients.length > 0) {
    lines.push("Ingredients:");
    for (const ingredient of ingredients) lines.push(`- ${ingredient}`);
  }
  if (instructions.length > 0) {
    lines.push("Instructions:");
    instructions.forEach((step, i) => lines.push(`${i + 1}. ${step}`));
  }
  if (nutritionLine) lines.push(`Nutrition per serving (as stated on the page): ${nutritionLine}`);
  if (keywords) lines.push(`Keywords: ${keywords}`);
  return lines.join("\n");
}

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

export async function scrapeRecipeFromUrl(
  url: string,
  knownIngredientNames: string[] = [],
  knownUnitNames: string[] = [],
): Promise<ScrapeResult> {
  let html: string;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      return { status: "error", message: `Could not fetch this page (HTTP ${response.status}).` };
    }
    html = await response.text();
  } catch {
    return {
      status: "error",
      message: "Could not fetch this page. It may be unreachable or blocking automated requests.",
    };
  }

  const recipeNode = extractRecipeJsonLd(html);
  if (!recipeNode) {
    return { status: "not_found", reason: "No structured recipe data (schema.org Recipe) was found on this page." };
  }

  const textBlob = buildRecipeTextBlob(recipeNode);
  const imageUrls = extractImageUrls(recipeNode.image).slice(0, 4);

  const result = await transcribeRecipeText(textBlob, knownIngredientNames, knownUnitNames);
  if (result.status === "error") return result;
  if (result.status === "not_handwritten") return { status: "not_found", reason: result.reason };

  const photoUrls = await rehostAll(imageUrls);
  return { status: "scraped", recipe: { ...result.recipe, sourceUrl: url, photoUrls } };
}
