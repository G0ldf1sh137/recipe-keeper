import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ChefHat } from "lucide-react";
import { markRecipeMade } from "./makes.functions";
import { removePantryItem } from "#/pantry/pantry.functions";

export function MadeItButton({
  recipeId,
  count,
  ingredientNames,
  canMake,
  isSubscriber,
}: {
  recipeId: string;
  count: number;
  ingredientNames: string[];
  canMake: boolean;
  isSubscriber: boolean;
}) {
  const markRecipeMadeFn = useServerFn(markRecipeMade);
  const removePantryItemFn = useServerFn(removePantryItem);
  const [displayCount, setDisplayCount] = useState(count);
  const [submitting, setSubmitting] = useState(false);
  const [madeIt, setMadeIt] = useState(false);
  const [prompting, setPrompting] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [updating, setUpdating] = useState(false);
  const [updated, setUpdated] = useState(false);

  async function handleMadeIt() {
    setSubmitting(true);
    try {
      const nextCount = await markRecipeMadeFn({ data: { recipeId } });
      setDisplayCount(nextCount);
      setMadeIt(true);
      if (isSubscriber) setPrompting(true);
    } finally {
      setSubmitting(false);
    }
  }

  function toggle(name: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  async function handleUpdatePantry() {
    setUpdating(true);
    try {
      for (const name of selected) {
        await removePantryItemFn({ data: { name } });
      }
      setPrompting(false);
      setSelected(new Set());
      setUpdated(true);
    } finally {
      setUpdating(false);
    }
  }

  if (!canMake) {
    return (
      <p className="mt-3 text-sm text-ink/60">
        <a
          href="/auth/google"
          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Sign in with Google
        </a>{" "}
        to mark that you made this recipe.
      </p>
    );
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => void handleMadeIt()}
        disabled={submitting || madeIt}
        className="flex items-center gap-1.5 rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:bg-accent-50 disabled:opacity-50"
      >
        <ChefHat size={16} />
        I cooked{displayCount > 0 ? ` (${displayCount})` : ""}
      </button>

      {prompting && (
        <div className="mt-3 rounded-xl border-2 border-accent-200 bg-surface p-3">
          <p className="text-sm font-medium text-ink/70">Did you use up any of these ingredients?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ingredientNames.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                className={
                  selected.has(name)
                    ? "rounded-full bg-accent-600 px-3 py-1 text-sm font-medium text-white"
                    : "rounded-full border-2 border-accent-300 px-3 py-1 text-sm font-medium text-ink hover:bg-accent-50"
                }
              >
                {name}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              type="button"
              onClick={() => void handleUpdatePantry()}
              disabled={updating || selected.size === 0}
              className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
            >
              {updating ? "Updating..." : "Remove from pantry"}
            </button>
            <button type="button" onClick={() => setPrompting(false)} className="text-sm text-ink/50 hover:text-ink">
              Skip
            </button>
          </div>
        </div>
      )}

      {updated && <p className="mt-2 text-sm text-green-700">Pantry updated.</p>}
    </div>
  );
}
