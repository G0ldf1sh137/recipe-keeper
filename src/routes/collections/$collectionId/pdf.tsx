import { createFileRoute } from "@tanstack/react-router";
import { renderToBuffer } from "@react-pdf/renderer";
import { readSessionToken } from "#/auth/cookies.server";
import { validateSessionToken } from "#/auth/session.server";
import {
  findCollectionForViewer,
  findCollectionOwnerName,
  findRecipesInCollection,
} from "#/collections/collections.server";
import { findRecipeById } from "#/recipes/recipes.server";
import { CookbookPdfDocument } from "#/collections/CookbookPdfDocument";
import type { RecipePdfData } from "#/recipes/RecipePdfDocument";
import { generateQrCode } from "#/recipes/qrcode.server";

function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "cookbook";
}

export const Route = createFileRoute("/collections/$collectionId/pdf")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const url = new URL(request.url);
        const shareToken = url.searchParams.get("st") ?? undefined;

        const token = readSessionToken();
        const resolved = token ? await validateSessionToken(token) : null;
        const user = resolved?.user ?? null;

        const collection = await findCollectionForViewer(params.collectionId, user?.id, shareToken);
        if (!collection) return new Response("Not found", { status: 404 });

        const items = await findRecipesInCollection(params.collectionId);
        const recipeResults = await Promise.all(items.map((item) => findRecipeById(item.id, user?.id)));
        const recipes: RecipePdfData[] = await Promise.all(
          recipeResults
            .filter((recipe) => recipe !== undefined)
            .map(async (recipe) => ({
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
              qrCodeDataUrl: await generateQrCode(`${url.origin}/recipes/${recipe.id}`),
            })),
        );

        const ownerName = await findCollectionOwnerName(collection.ownerId);

        const collectionUrl = `${url.origin}/collections/${collection.id}${shareToken ? `?st=${shareToken}` : ""}`;
        const qrCodeDataUrl = await generateQrCode(collectionUrl);

        const buffer = await renderToBuffer(
          <CookbookPdfDocument
            collectionName={collection.name}
            ownerName={ownerName}
            qrCodeDataUrl={qrCodeDataUrl}
            recipes={recipes}
          />,
        );

        return new Response(new Uint8Array(buffer), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${slugify(collection.name)}.pdf"`,
          },
        });
      },
    },
  },
});
