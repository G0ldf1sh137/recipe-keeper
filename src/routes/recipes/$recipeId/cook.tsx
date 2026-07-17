import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { getRecipe } from "#/recipes/recipes.functions";
import { scaleQuantity } from "#/recipes/quantity";
import { useRecipeScale } from "#/recipes/useRecipeScale";
import { ScaleToggle } from "#/recipes/ScaleToggle";

const cookSearchSchema = z.object({ st: z.string().optional() });

export const Route = createFileRoute("/recipes/$recipeId/cook")({
  validateSearch: cookSearchSchema,
  loaderDeps: ({ search }) => ({ shareToken: search.st }),
  loader: async ({ params, deps }) =>
    getRecipe({ data: { id: params.recipeId, shareToken: deps.shareToken } }),
  component: CookModePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">Recipe not found</h1>
      <p className="mt-2 text-ink/60">
        This recipe doesn't exist, or isn't shared with you.{" "}
        <Link to="/" className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400">
          Back home
        </Link>
      </p>
    </div>
  ),
});

// Wake locks are released automatically when the tab loses visibility, so a
// backgrounded phone re-locking the screen doesn't get stuck awake forever —
// re-request when the tab regains focus to cover the common prop-the-phone-up case.
function useWakeLock() {
  useEffect(() => {
    if (!("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;

    async function acquire() {
      try {
        lock = await navigator.wakeLock.request("screen");
      } catch {
        // Ignore — e.g. denied by the browser or page not visible yet.
      }
    }

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") void acquire();
    }

    void acquire();
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      void lock?.release();
    };
  }, []);
}

function CookModePage() {
  const recipe = Route.useLoaderData();
  const { st: shareToken } = Route.useSearch();
  const { scale, setScale, customInput, handleCustomInputChange, activeFactor, isUnscaled } = useRecipeScale();
  const [stepIndex, setStepIndex] = useState(0);
  const [ingredientsOpen, setIngredientsOpen] = useState(false);

  useWakeLock();

  const stepCount = recipe.steps.length;
  const step = recipe.steps[stepIndex];
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === stepCount - 1;

  function goTo(index: number) {
    setStepIndex(Math.max(0, Math.min(stepCount - 1, index)));
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowRight") setStepIndex((i) => Math.min(stepCount - 1, i + 1));
      if (e.key === "ArrowLeft") setStepIndex((i) => Math.max(0, i - 1));
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [stepCount]);

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col p-4 sm:p-8">
      <div className="flex items-center justify-between gap-2">
        <Link
          to="/recipes/$recipeId"
          params={{ recipeId: recipe.id }}
          search={{ st: shareToken }}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          ← Exit
        </Link>
        <h1 className="font-serif text-lg font-semibold text-ink">{recipe.title}</h1>
        <span className="text-sm text-ink/60">
          {stepCount > 0 ? `Step ${stepIndex + 1} of ${stepCount}` : ""}
        </span>
      </div>

      <div className="mt-4">
        <button
          type="button"
          onClick={() => setIngredientsOpen((open) => !open)}
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          {ingredientsOpen ? "Hide ingredients" : "Show ingredients"}
        </button>
        {ingredientsOpen && (
          <div className="mt-3 rounded-xl border-2 border-accent-200 bg-surface p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold text-ink">Ingredients</h2>
              <ScaleToggle
                scale={scale}
                onScaleChange={setScale}
                customInput={customInput}
                onCustomInputChange={handleCustomInputChange}
              />
            </div>
            <ul className="mt-2 list-inside list-disc text-ink/80">
              {recipe.ingredients.map((ing, i) => (
                <li key={i}>
                  {[isUnscaled ? ing.qty : scaleQuantity(ing.qty, activeFactor), ing.unit, ing.name]
                    .filter(Boolean)
                    .join(" ")}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {stepCount === 0 ? (
        <p className="mt-8 flex-1 text-center text-ink/60">This recipe has no steps yet.</p>
      ) : (
        <div className="relative mt-4 flex flex-1 flex-col">
          <div className="relative flex flex-1 items-center justify-center rounded-2xl border-2 border-accent-200 bg-surface p-6 sm:p-10">
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={isFirst}
              aria-label="Previous step"
              className="absolute inset-y-0 left-0 w-1/3 cursor-pointer disabled:cursor-default"
            />
            <button
              type="button"
              onClick={() => goTo(stepIndex + 1)}
              disabled={isLast}
              aria-label="Next step"
              className="absolute inset-y-0 right-0 w-1/3 cursor-pointer disabled:cursor-default"
            />
            <div className="max-w-lg text-center">
              <p className="text-2xl leading-relaxed text-ink sm:text-3xl">{step.text}</p>
              {step.imageUrls.length > 0 && (
                <div className="mt-6 flex flex-wrap justify-center gap-3">
                  {step.imageUrls.map((url, i) => (
                    <img
                      key={url}
                      src={url}
                      alt={`Step ${stepIndex + 1} photo ${i + 1}`}
                      className="max-h-64 rounded-lg object-cover shadow-sm"
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => goTo(stepIndex - 1)}
              disabled={isFirst}
              className="rounded-lg border-2 border-accent-300 px-6 py-3 font-medium text-ink transition-colors hover:bg-accent-50 disabled:opacity-40"
            >
              Previous
            </button>
            {isLast ? (
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: recipe.id }}
                search={{ st: shareToken }}
                className="rounded-lg bg-accent-600 px-6 py-3 font-medium text-white transition-colors hover:bg-accent-700"
              >
                Done — back to recipe
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => goTo(stepIndex + 1)}
                className="rounded-lg bg-accent-600 px-6 py-3 font-medium text-white transition-colors hover:bg-accent-700"
              >
                Next
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
