import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { scrapeRecipeUrl } from "./scraping.functions";
import type { ScrapeResult, ScrapedRecipe } from "./scraping.server";

export function isValidHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function ProcessUrl({
  url,
  onApply,
}: {
  url: string;
  onApply: (recipe: ScrapedRecipe) => void;
}) {
  const scrapeFn = useServerFn(scrapeRecipeUrl);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScrapeResult | null>(null);

  async function handleProcess() {
    setScanning(true);
    setResult(null);
    try {
      setResult(await scrapeFn({ data: { url } }));
    } catch {
      setResult({ status: "error", message: "Scraping failed. Please try again." });
    } finally {
      setScanning(false);
    }
  }

  function handleApply(recipe: ScrapedRecipe) {
    onApply(recipe);
    setResult(null);
  }

  return (
    <section className="mb-6 rounded-xl border border-accent-200 bg-surface p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleProcess}
          disabled={scanning}
          className="rounded-lg border border-accent-200 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50 disabled:opacity-50"
        >
          {scanning ? "Scraping page…" : "Process URL"}
        </button>
        {!scanning && !result && (
          <span className="text-xs text-ink/50">Uses Claude to pull a recipe from the linked page.</span>
        )}
        {scanning && <span className="text-xs text-ink/50">Reading the page with Claude — this can take a minute.</span>}
      </div>

      {result?.status === "not_found" && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-accent-50 px-4 py-3 text-sm text-ink/80">
          <p>No recipe found: {result.reason}</p>
          <button type="button" onClick={() => setResult(null)} className="text-ink/50 hover:text-ink">
            ✕
          </button>
        </div>
      )}

      {result?.status === "error" && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <p>{result.message}</p>
          <button type="button" onClick={() => setResult(null)} className="hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {result?.status === "scraped" && (
        <div className="mt-3 rounded-xl border border-accent-200 bg-paper p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-ink">Scraped recipe preview</h3>
            <span className="text-xs font-medium uppercase tracking-wide text-accent-600">Not applied yet</span>
          </div>

          {result.recipe.title.trim() && (
            <p className="mt-3 font-serif text-xl font-medium text-ink">{result.recipe.title}</p>
          )}
          {result.recipe.description.trim() && (
            <p className="mt-1 text-sm text-ink/70">{result.recipe.description}</p>
          )}
          {(result.recipe.yield.trim() || result.recipe.calories !== null) && (
            <p className="mt-1 text-sm text-ink/60">
              {[
                result.recipe.yield.trim() || null,
                result.recipe.calories !== null ? `${result.recipe.calories} cal/serving` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          {result.recipe.photoUrls.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.recipe.photoUrls.map((photoUrl) => (
                <img key={photoUrl} src={photoUrl} alt="" className="h-20 w-20 rounded-lg object-cover" />
              ))}
            </div>
          )}

          {result.recipe.ingredients.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-semibold text-ink/70">Ingredients</h4>
              <ul className="mt-1 list-inside list-disc text-sm text-ink/80">
                {result.recipe.ingredients.map((ing, i) => (
                  <li key={i}>{[ing.qty, ing.unit, ing.name].filter(Boolean).join(" ")}</li>
                ))}
              </ul>
            </div>
          )}

          {result.recipe.steps.length > 0 && (
            <div className="mt-3">
              <h4 className="text-sm font-semibold text-ink/70">Steps</h4>
              <ol className="mt-1 list-inside list-decimal space-y-1 text-sm text-ink/80">
                {result.recipe.steps.map((step, i) => (
                  <li key={i}>{step.text}</li>
                ))}
              </ol>
            </div>
          )}

          {result.recipe.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {result.recipe.tags.map((tag) => (
                <span key={tag} className="rounded-full bg-accent-50 px-2 py-0.5 text-xs text-ink/70">
                  {tag}
                </span>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-ink/50">
            Applying fills in the fields below — nothing is saved until you press Save changes.
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => handleApply(result.recipe)}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
            >
              Apply to form
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-lg border border-accent-200 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
