import { useState } from "react";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getRecipe, getIngredientNames, getUnitNames, updateRecipe } from "#/recipes/recipes.functions";
import { RecipeForm } from "#/recipes/RecipeForm";
import type { RecipeFormValues } from "#/recipes/RecipeForm";
import { ProcessPhotos } from "#/transcription/ProcessPhotos";
import type { TranscribedRecipe } from "#/transcription/transcription.server";

export const Route = createFileRoute("/recipes/$recipeId/edit")({
  loader: async ({ params }) => {
    const [recipe, knownIngredientNames, knownUnitNames] = await Promise.all([
      getRecipe({ data: { id: params.recipeId } }),
      getIngredientNames(),
      getUnitNames(),
    ]);
    if (!recipe.isOwner) {
      throw redirect({ to: "/recipes/$recipeId", params: { recipeId: params.recipeId } });
    }
    return { recipe, knownIngredientNames, knownUnitNames };
  },
  component: EditRecipePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">Recipe not found</h1>
      <p className="mt-2 text-ink/60">
        This recipe doesn't exist, or isn't shared with you.{" "}
        <Link
          to="/"
          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Back home
        </Link>
      </p>
    </div>
  ),
});

function EditRecipePage() {
  const { recipe, knownIngredientNames, knownUnitNames } = Route.useLoaderData();
  const navigate = useNavigate();
  const updateRecipeFn = useServerFn(updateRecipe);

  const [formValues, setFormValues] = useState<RecipeFormValues>({
    title: recipe.title,
    description: recipe.description ?? "",
    photoUrls: recipe.photoUrls,
    coverPhotoUrl: recipe.coverPhotoUrl,
    sourceUrl: recipe.sourceUrl,
    sourcePdfUrl: recipe.sourcePdfUrl,
    tagsInput: recipe.tags.join(", "),
    yield: recipe.yield,
    calories: recipe.calories,
    protein: recipe.protein,
    carbs: recipe.carbs,
    fat: recipe.fat,
    visibility: recipe.visibility,
    ingredients: recipe.ingredients.length ? recipe.ingredients : [{ qty: "", unit: "", name: "" }],
    steps: recipe.steps.length ? recipe.steps : [{ text: "", imageUrls: [] }],
  });
  // Bumped to force RecipeForm to re-initialize its internal state from formValues
  // after a transcription is applied (RecipeForm otherwise only reads initialValues once).
  const [formKey, setFormKey] = useState(0);

  function applyTranscription(transcribed: TranscribedRecipe) {
    setFormValues((prev) => ({
      ...prev,
      ...(transcribed.title.trim() ? { title: transcribed.title.trim() } : {}),
      ...(transcribed.description.trim() ? { description: transcribed.description.trim() } : {}),
      ingredients: transcribed.ingredients.length ? transcribed.ingredients : prev.ingredients,
      steps: transcribed.steps.length
        ? transcribed.steps.map((step) => ({ text: step.text, imageUrls: [] }))
        : prev.steps,
      tagsInput: transcribed.tags.length ? transcribed.tags.join(", ") : prev.tagsInput,
      ...(transcribed.yield.trim() ? { yield: transcribed.yield.trim() } : {}),
      ...(transcribed.calories !== null ? { calories: transcribed.calories } : {}),
      ...(transcribed.protein !== null ? { protein: transcribed.protein } : {}),
      ...(transcribed.carbs !== null ? { carbs: transcribed.carbs } : {}),
      ...(transcribed.fat !== null ? { fat: transcribed.fat } : {}),
      ...(transcribed.sourceUrl.trim() ? { sourceUrl: transcribed.sourceUrl.trim() } : {}),
    }));
    setFormKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Edit recipe</h1>

      {formValues.photoUrls.length > 0 && (
        <div className="mt-6">
          <ProcessPhotos
            photoUrls={formValues.photoUrls}
            onApply={applyTranscription}
            knownIngredientNames={knownIngredientNames}
            knownUnitNames={knownUnitNames}
          />
        </div>
      )}

      <RecipeForm
        key={formKey}
        initialValues={formValues}
        submitLabel="Save changes"
        knownIngredientNames={knownIngredientNames}
        knownUnitNames={knownUnitNames}
        onPhotoUrlsChange={(photoUrls) => setFormValues((prev) => ({ ...prev, photoUrls }))}
        onSourceUrlChange={(sourceUrl) => setFormValues((prev) => ({ ...prev, sourceUrl }))}
        onSourcePdfUrlChange={(sourcePdfUrl) => setFormValues((prev) => ({ ...prev, sourcePdfUrl }))}
        onSubmit={async (values) => {
          await updateRecipeFn({ data: { id: recipe.id, ...values } });
          await navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id } });
        }}
      />
    </div>
  );
}
