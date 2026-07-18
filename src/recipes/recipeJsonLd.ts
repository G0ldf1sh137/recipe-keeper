import type { Ingredient, Step } from "#/db/schema";

type RecipeForJsonLd = {
  title: string;
  description?: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  photoUrls: string[];
  coverPhotoUrl: string | null;
  yield: string | null;
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  tags: string[];
  createdAt: Date | string;
  owner: { name: string };
};

function formatIngredient(ingredient: Ingredient): string {
  return [ingredient.qty, ingredient.unit, ingredient.name].filter(Boolean).join(" ").trim();
}

// Mirrors the shape src/scraping/scraping.server.ts's extractRecipeJsonLd/extractNutritionLine
// expect, so a recipe exported from this app can be re-imported by our own URL importer.
export function buildRecipeJsonLd(recipe: RecipeForJsonLd) {
  const images = recipe.coverPhotoUrl
    ? [recipe.coverPhotoUrl, ...recipe.photoUrls.filter((url) => url !== recipe.coverPhotoUrl)]
    : recipe.photoUrls;

  const nutritionParts: Record<string, string> = {};
  if (recipe.calories !== null) nutritionParts.calories = `${recipe.calories} calories`;
  if (recipe.protein !== null) nutritionParts.proteinContent = `${recipe.protein}g`;
  if (recipe.carbs !== null) nutritionParts.carbohydrateContent = `${recipe.carbs}g`;
  if (recipe.fat !== null) nutritionParts.fatContent = `${recipe.fat}g`;
  const hasNutrition = Object.keys(nutritionParts).length > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Recipe",
    name: recipe.title,
    ...(recipe.description ? { description: recipe.description } : {}),
    ...(images.length > 0 ? { image: images } : {}),
    author: { "@type": "Person", name: recipe.owner.name },
    datePublished: new Date(recipe.createdAt).toISOString(),
    ...(recipe.yield ? { recipeYield: recipe.yield } : {}),
    ...(recipe.tags.length > 0 ? { keywords: recipe.tags.join(", ") } : {}),
    recipeIngredient: recipe.ingredients.map(formatIngredient),
    recipeInstructions: recipe.steps.map((step) => ({ "@type": "HowToStep", text: step.text })),
    ...(hasNutrition ? { nutrition: { "@type": "NutritionInformation", ...nutritionParts } } : {}),
  };
}

// Escapes "<" so a malicious recipe field (e.g. a title containing "</script>") can't break out
// of the surrounding <script type="application/ld+json"> tag.
export function stringifyJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
