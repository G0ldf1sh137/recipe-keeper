import { createFileRoute } from "@tanstack/react-router";
import { renderToBuffer } from "@react-pdf/renderer";
import { readSessionToken } from "#/auth/cookies.server";
import { validateSessionToken } from "#/auth/session.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { RecipePdfDocument } from "#/recipes/RecipePdfDocument";

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "recipe";
}

export const Route = createFileRoute("/recipes/$recipeId/pdf")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const shareToken = url.searchParams.get("st") ?? undefined;

        const token = readSessionToken();
        const user = token ? await validateSessionToken(token) : null;

        const recipe = await findRecipeById(params.recipeId, user?.id, shareToken);
        if (!recipe) return new Response("Not found", { status: 404 });

        const buffer = await renderToBuffer(
          <RecipePdfDocument
            recipe={{
              title: recipe.title,
              description: recipe.description,
              ownerName: recipe.owner.name,
              photoUrls: recipe.photoUrls,
              ingredients: recipe.ingredients,
              steps: recipe.steps,
              tags: recipe.tags,
              yield: recipe.yield,
              calories: recipe.calories,
              protein: recipe.protein,
              carbs: recipe.carbs,
              fat: recipe.fat,
              sourceUrl: recipe.sourceUrl,
            }}
          />,
        );

        return new Response(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${slugify(recipe.title)}.pdf"`,
          },
        });
      },
    },
  },
});
