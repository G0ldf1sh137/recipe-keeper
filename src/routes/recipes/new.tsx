import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createRecipe, getIngredientNames, getUnitNames } from "#/recipes/recipes.functions";
import { getSessionUser } from "#/auth/auth.functions";
import { RecipeForm, emptyRecipeFormValues } from "#/recipes/RecipeForm";
import type { RecipeFormValues } from "#/recipes/RecipeForm";
import { ProcessPhotos } from "#/transcription/ProcessPhotos";
import type { TranscribedRecipe } from "#/transcription/transcription.server";

export const Route = createFileRoute("/recipes/new")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  loader: async () => {
    const [knownIngredientNames, knownUnitNames] = await Promise.all([getIngredientNames(), getUnitNames()]);
    return { knownIngredientNames, knownUnitNames };
  },
  component: NewRecipePage,
});

function NewRecipePage() {
  const { knownIngredientNames, knownUnitNames } = Route.useLoaderData();
  const navigate = useNavigate();
  const createRecipeFn = useServerFn(createRecipe);

  const [formValues, setFormValues] = useState<RecipeFormValues>(emptyRecipeFormValues());
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
    }));
    setFormKey((k) => k + 1);
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">New recipe</h1>

      {formValues.photoUrls.length > 0 && (
        <div className="mt-6">
          <ProcessPhotos photoUrls={formValues.photoUrls} onApply={applyTranscription} />
        </div>
      )}

      <RecipeForm
        key={formKey}
        initialValues={formValues}
        submitLabel="Save recipe"
        knownIngredientNames={knownIngredientNames}
        knownUnitNames={knownUnitNames}
        onPhotoUrlsChange={(photoUrls) => setFormValues((prev) => ({ ...prev, photoUrls }))}
        onSubmit={async (values) => {
          const recipe = await createRecipeFn({ data: values });
          await navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id } });
        }}
      />
    </div>
  );
}
