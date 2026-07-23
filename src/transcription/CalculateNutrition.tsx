import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { estimateNutrition } from "./transcription.functions";
import type { NutritionEstimateResult, NutritionEstimate } from "./transcription.server";

export function CalculateNutrition({
  ingredients,
  currentYield,
  onApply,
  canUse = true,
}: {
  ingredients: { qty: string; unit: string; name: string }[];
  currentYield: string;
  onApply: (nutrition: NutritionEstimate) => void;
  canUse?: boolean;
}) {
  const estimateFn = useServerFn(estimateNutrition);
  const [estimating, setEstimating] = useState(false);
  const [result, setResult] = useState<NutritionEstimateResult | null>(null);

  const namedIngredients = ingredients
    .filter((row) => row.name.trim())
    .map((row) => ({ qty: row.qty.trim(), unit: row.unit.trim(), name: row.name.trim() }));

  async function handleEstimate() {
    setEstimating(true);
    setResult(null);
    try {
      setResult(
        await estimateFn({ data: { ingredients: namedIngredients, yield: currentYield.trim() || null } }),
      );
    } catch {
      setResult({ status: "error", message: "Estimating nutrition failed. Please try again." });
    } finally {
      setEstimating(false);
    }
  }

  function handleApply(nutrition: NutritionEstimate) {
    onApply(nutrition);
    setResult(null);
  }

  return (
    <div className="rounded-xl border-2 border-accent-300 bg-surface p-4">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleEstimate}
          disabled={estimating || namedIngredients.length === 0 || !canUse}
          className="rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50 disabled:opacity-50"
        >
          {estimating ? "Estimating…" : "Calculate nutrition"}
        </button>
        {!canUse && (
          <span className="text-xs text-ink/50">This feature is available to subscribers only.</span>
        )}
        {canUse && namedIngredients.length === 0 && (
          <span className="text-xs text-ink/50">Add at least one ingredient first.</span>
        )}
        {canUse && namedIngredients.length > 0 && !estimating && !result && (
          <span className="text-xs text-ink/50">
            Uses Claude to estimate nutrition from the ingredients. It's a rough guess, not lab-tested data.
          </span>
        )}
        {canUse && estimating && (
          <span className="text-xs text-ink/50">Estimating with Claude. This can take a minute.</span>
        )}
      </div>

      {result?.status === "error" && (
        <div className="mt-3 flex items-start justify-between gap-3 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <p>{result.message}</p>
          <button type="button" onClick={() => setResult(null)} className="hover:opacity-70">
            ✕
          </button>
        </div>
      )}

      {result?.status === "estimated" && (
        <div className="mt-3 rounded-xl border-2 border-accent-300 bg-paper p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-lg font-semibold text-ink">Nutrition estimate</h3>
            <span className="text-xs font-medium uppercase tracking-wide text-accent-600">Not applied yet</span>
          </div>

          {(result.nutrition.yield.trim() || result.nutrition.calories !== null) && (
            <p className="mt-2 text-sm text-ink/60">
              {[
                result.nutrition.yield.trim() || null,
                result.nutrition.calories !== null ? `${result.nutrition.calories} cal/serving` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {(result.nutrition.protein !== null ||
            result.nutrition.carbs !== null ||
            result.nutrition.fat !== null) && (
            <p className="mt-1 text-sm text-ink/60">
              {[
                result.nutrition.protein !== null ? `${result.nutrition.protein}g protein` : null,
                result.nutrition.carbs !== null ? `${result.nutrition.carbs}g carbs` : null,
                result.nutrition.fat !== null ? `${result.nutrition.fat}g fat` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}

          <p className="mt-3 text-xs font-medium text-accent-700 dark:text-accent-400">
            AI estimate, may not be accurate.
          </p>
          <p className="mt-1 text-xs text-ink/50">
            Applying fills in the fields below. Nothing is saved until you press Save.
          </p>
          <div className="mt-2 flex gap-3">
            <button
              type="button"
              onClick={() => handleApply(result.nutrition)}
              className="rounded-lg bg-accent-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-700"
            >
              Apply to form
            </button>
            <button
              type="button"
              onClick={() => setResult(null)}
              className="rounded-lg border-2 border-accent-300 px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-accent-50"
            >
              Discard
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
