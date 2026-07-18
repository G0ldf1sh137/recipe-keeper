import { useState } from "react";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createRecipe, getIngredientNames, getUnitNames, getTagNames } from "#/recipes/recipes.functions";
import { getSessionUser } from "#/auth/auth.functions";
import { RecipeForm, emptyRecipeFormValues } from "#/recipes/RecipeForm";
import type { RecipeFormValues } from "#/recipes/RecipeForm";
import { ProcessPhotos } from "#/transcription/ProcessPhotos";
import { ProcessPdf } from "#/transcription/ProcessPdf";
import { ProcessText } from "#/transcription/ProcessText";
import type { TranscribedRecipe } from "#/transcription/transcription.server";
import { MultiImageUpload } from "#/uploads/ImageUpload";
import { PdfUpload } from "#/uploads/PdfUpload";
import { ProcessUrl, isValidHttpUrl } from "#/scraping/ProcessUrl";

export const Route = createFileRoute("/recipes/new")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ context }) => {
    const [knownIngredientNames, knownUnitNames, knownTagNames] = await Promise.all([
      getIngredientNames(),
      getUnitNames(),
      getTagNames(),
    ]);
    const isSubscriber = context.user.isAdmin || context.user.isSubscriber;
    return { knownIngredientNames, knownUnitNames, knownTagNames, isSubscriber };
  },
  component: NewRecipePage,
});

type ImportMode = "choose" | "photo" | "pdf" | "text" | "url" | "form";

function NewRecipePage() {
  const { knownIngredientNames, knownUnitNames, knownTagNames, isSubscriber } = Route.useLoaderData();
  const navigate = useNavigate();
  const createRecipeFn = useServerFn(createRecipe);

  const [mode, setMode] = useState<ImportMode>("choose");
  const [formValues, setFormValues] = useState<RecipeFormValues>(emptyRecipeFormValues());
  const [scrapeUrl, setScrapeUrl] = useState("");
  // Bumped to force RecipeForm to re-initialize its internal state from formValues
  // after a transcription is applied (RecipeForm otherwise only reads initialValues once).
  const [formKey, setFormKey] = useState(0);

  function applyTranscription(transcribed: TranscribedRecipe & { photoUrls?: string[] }) {
    setFormValues((prev) => ({
      ...prev,
      ...(transcribed.title.trim() ? { title: transcribed.title.trim() } : {}),
      ...(transcribed.description.trim() ? { description: transcribed.description.trim() } : {}),
      ingredients: transcribed.ingredients.length ? transcribed.ingredients : prev.ingredients,
      steps: transcribed.steps.length
        ? transcribed.steps.map((step) => ({ text: step.text, imageUrls: [] }))
        : prev.steps,
      tags: transcribed.tags.length ? transcribed.tags : prev.tags,
      ...(transcribed.yield.trim() ? { yield: transcribed.yield.trim() } : {}),
      ...(transcribed.calories !== null ? { calories: transcribed.calories } : {}),
      ...(transcribed.protein !== null ? { protein: transcribed.protein } : {}),
      ...(transcribed.carbs !== null ? { carbs: transcribed.carbs } : {}),
      ...(transcribed.fat !== null ? { fat: transcribed.fat } : {}),
      ...(transcribed.sourceUrl.trim() ? { sourceUrl: transcribed.sourceUrl.trim() } : {}),
      ...(transcribed.photoUrls && transcribed.photoUrls.length > 0
        ? {
            photoUrls: [...prev.photoUrls, ...transcribed.photoUrls],
            coverPhotoUrl: prev.coverPhotoUrl || transcribed.photoUrls[0],
          }
        : {}),
    }));
    setFormKey((k) => k + 1);
    setMode("form");
  }

  if (mode === "choose") {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">New recipe</h1>
        <p className="mt-2 text-ink/60">How would you like to start?</p>
        {!isSubscriber && (
          <p className="mt-2 text-sm text-ink/50">
            AI import tools are disabled for your account — you can still start from scratch.
          </p>
        )}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setMode("photo")}
            disabled={!isSubscriber}
            className="rounded-xl border-2 border-accent-200 bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <span className="font-serif text-lg font-medium text-ink">📷 Import from photo</span>
            <p className="mt-1 text-sm text-ink/60">Upload a photo of a recipe card, and Claude will transcribe it.</p>
          </button>
          <button
            type="button"
            onClick={() => setMode("pdf")}
            disabled={!isSubscriber}
            className="rounded-xl border-2 border-accent-200 bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <span className="font-serif text-lg font-medium text-ink">📄 Import from PDF</span>
            <p className="mt-1 text-sm text-ink/60">Upload a PDF, and Claude will transcribe it.</p>
          </button>
          <button
            type="button"
            onClick={() => setMode("text")}
            disabled={!isSubscriber}
            className="rounded-xl border-2 border-accent-200 bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <span className="font-serif text-lg font-medium text-ink">📋 Import from text</span>
            <p className="mt-1 text-sm text-ink/60">Paste a recipe from anywhere, and Claude will parse it.</p>
          </button>
          <button
            type="button"
            onClick={() => setMode("url")}
            disabled={!isSubscriber}
            className="rounded-xl border-2 border-accent-200 bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-sm"
          >
            <span className="font-serif text-lg font-medium text-ink">🔗 Import from URL</span>
            <p className="mt-1 text-sm text-ink/60">Paste a link to a recipe page, and we'll pull it in.</p>
          </button>
          <button
            type="button"
            onClick={() => setMode("form")}
            className="rounded-xl border-2 border-accent-200 bg-surface p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
          >
            <span className="font-serif text-lg font-medium text-ink">✏️ Start from scratch</span>
            <p className="mt-1 text-sm text-ink/60">Fill in a blank recipe form yourself.</p>
          </button>
        </div>
      </div>
    );
  }

  if (mode === "photo" || mode === "pdf" || mode === "text" || mode === "url") {
    return (
      <div className="mx-auto max-w-2xl p-4 sm:p-8">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">New recipe</h1>
        <div className="mt-4 flex items-center justify-between text-sm">
          <button
            type="button"
            onClick={() => setMode("choose")}
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            ← Back
          </button>
          <button
            type="button"
            onClick={() => setMode("form")}
            className="font-medium text-ink/50 hover:text-ink"
          >
            Skip, fill in manually
          </button>
        </div>

        {mode === "photo" && (
          <div className="mt-6 flex flex-col gap-4">
            <MultiImageUpload
              imageUrls={formValues.photoUrls}
              onChange={(photoUrls) => setFormValues((prev) => ({ ...prev, photoUrls }))}
              previewClassName="h-32 w-48 rounded-lg object-cover"
              coverUrl={formValues.coverPhotoUrl}
              onSetCover={(coverPhotoUrl) => setFormValues((prev) => ({ ...prev, coverPhotoUrl }))}
            />
            {formValues.photoUrls.length > 0 && (
              <ProcessPhotos
                photoUrls={formValues.photoUrls}
                onApply={applyTranscription}
                knownIngredientNames={knownIngredientNames}
                knownUnitNames={knownUnitNames}
                canUse={isSubscriber}
              />
            )}
          </div>
        )}

        {mode === "pdf" && (
          <div className="mt-6 flex flex-col gap-4">
            <PdfUpload
              url={formValues.sourcePdfUrl}
              onChange={(sourcePdfUrl) => setFormValues((prev) => ({ ...prev, sourcePdfUrl }))}
            />
            {formValues.sourcePdfUrl && (
              <ProcessPdf
                pdfUrl={formValues.sourcePdfUrl}
                onApply={applyTranscription}
                knownIngredientNames={knownIngredientNames}
                knownUnitNames={knownUnitNames}
                canUse={isSubscriber}
              />
            )}
          </div>
        )}

        {mode === "text" && (
          <div className="mt-6">
            <ProcessText
              onApply={applyTranscription}
              knownIngredientNames={knownIngredientNames}
              knownUnitNames={knownUnitNames}
              canUse={isSubscriber}
            />
          </div>
        )}

        {mode === "url" && (
          <div className="mt-6 flex flex-col gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-ink/70">Recipe URL</span>
              <input
                type="url"
                className="rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none disabled:opacity-50"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://example.com/a-great-recipe"
                disabled={!isSubscriber}
              />
            </label>
            {isValidHttpUrl(scrapeUrl) && (
              <ProcessUrl
                url={scrapeUrl}
                onApply={applyTranscription}
                knownIngredientNames={knownIngredientNames}
                knownUnitNames={knownUnitNames}
                canUse={isSubscriber}
              />
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">New recipe</h1>

      {formValues.photoUrls.length > 0 && (
        <div className="mt-6">
          <ProcessPhotos
            photoUrls={formValues.photoUrls}
            onApply={applyTranscription}
            knownIngredientNames={knownIngredientNames}
            knownUnitNames={knownUnitNames}
            canUse={isSubscriber}
          />
        </div>
      )}

      {formValues.sourcePdfUrl && (
        <div className="mt-6">
          <ProcessPdf
            pdfUrl={formValues.sourcePdfUrl}
            onApply={applyTranscription}
            knownIngredientNames={knownIngredientNames}
            knownUnitNames={knownUnitNames}
            canUse={isSubscriber}
          />
        </div>
      )}

      <RecipeForm
        key={formKey}
        initialValues={formValues}
        submitLabel="Save recipe"
        knownIngredientNames={knownIngredientNames}
        knownUnitNames={knownUnitNames}
        knownTagNames={knownTagNames}
        onPhotoUrlsChange={(photoUrls) => setFormValues((prev) => ({ ...prev, photoUrls }))}
        onSourceUrlChange={(sourceUrl) => setFormValues((prev) => ({ ...prev, sourceUrl }))}
        onSubmit={async (values) => {
          const recipe = await createRecipeFn({ data: values });
          await navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id } });
        }}
      />
    </div>
  );
}
