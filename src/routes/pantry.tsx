import { useState } from "react";
import { flushSync } from "react-dom";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { getIngredientNames } from "#/recipes/recipes.functions";
import { getPantryItems, addPantryItem, removePantryItem, getPantryMatches } from "#/pantry/pantry.functions";
import type { PantryMatch } from "#/pantry/pantry.server";
import { RecipeCard } from "#/recipes/RecipeCard";

export const Route = createFileRoute("/pantry")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  loader: async () => {
    const [pantryItems, knownIngredientNames, matches] = await Promise.all([
      getPantryItems(),
      getIngredientNames(),
      getPantryMatches(),
    ]);
    return { pantryItems, knownIngredientNames, matches };
  },
  component: PantryPage,
});

function missingIngredientNames(match: PantryMatch, pantryNamesLower: Set<string>): string[] {
  return match.ingredients
    .filter((ingredient) => !pantryNamesLower.has(ingredient.name.toLowerCase()))
    .map((ingredient) => ingredient.name);
}

function PantryPage() {
  const loaderData = Route.useLoaderData();
  const addPantryItemFn = useServerFn(addPantryItem);
  const removePantryItemFn = useServerFn(removePantryItem);
  const getPantryMatchesFn = useServerFn(getPantryMatches);

  const [pantryNames, setPantryNames] = useState(loaderData.pantryItems);
  const [matches, setMatches] = useState(loaderData.matches);
  const [draft, setDraft] = useState("");

  function applyMatches(nextMatches: PantryMatch[]) {
    if (!("startViewTransition" in document)) {
      setMatches(nextMatches);
      return;
    }
    document.startViewTransition(() => {
      flushSync(() => setMatches(nextMatches));
    });
  }

  async function addIngredient(rawName: string) {
    const name = rawName.trim().toLowerCase();
    if (!name || pantryNames.includes(name)) return;
    setPantryNames((prev) => [...prev, name]);
    await addPantryItemFn({ data: { name } });
    applyMatches(await getPantryMatchesFn());
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    const name = draft;
    setDraft("");
    await addIngredient(name);
  }

  async function handleRemoveItem(name: string) {
    setPantryNames((prev) => prev.filter((n) => n !== name));
    await removePantryItemFn({ data: { name } });
    applyMatches(await getPantryMatchesFn());
  }

  const pantryNamesLower = new Set(pantryNames.map((name) => name.toLowerCase()));
  const readyToMake = matches.filter((match) => match.totalIngredients === match.matchedIngredients);
  const closeMatches = matches.filter((match) => match.totalIngredients > match.matchedIngredients);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Pantry</h1>
      <p className="mt-2 text-ink/60">List what you have, and we'll show you what you can make.</p>

      <form onSubmit={(e) => void handleAddItem(e)} className="mt-6 flex gap-2">
        <input
          className="min-w-[10rem] flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          list="pantry-ingredient-names"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add an ingredient you have on hand..."
        />
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          Add
        </button>
      </form>
      <datalist id="pantry-ingredient-names">
        {loaderData.knownIngredientNames.map((name) => (
          <option key={name} value={name} />
        ))}
      </datalist>

      {pantryNames.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {pantryNames.map((name) => (
            <span
              key={name}
              className="flex items-center gap-1 rounded-full bg-accent-50 px-2 py-0.5 text-xs text-ink/70"
            >
              {name}
              <button
                type="button"
                onClick={() => void handleRemoveItem(name)}
                aria-label={`Remove ${name}`}
                className="text-ink/40 hover:text-ink"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}

      {pantryNames.length === 0 ? (
        <p className="mt-6 text-ink/60">Add a few ingredients to see what you can make.</p>
      ) : matches.length === 0 ? (
        <p className="mt-6 text-ink/60">No recipes match what's in your pantry yet.</p>
      ) : (
        <div className="mt-8 flex flex-col gap-8">
          {readyToMake.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold text-ink">You can make these now</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {readyToMake.map((match) => (
                  <li key={match.id} style={{ viewTransitionName: `pantry-recipe-${match.id}` }}>
                    <RecipeCard recipe={match} />
                  </li>
                ))}
              </ul>
            </section>
          )}

          {closeMatches.length > 0 && (
            <section>
              <h2 className="font-serif text-xl font-semibold text-ink">Close matches</h2>
              <ul className="mt-3 flex flex-col gap-3">
                {closeMatches.map((match) => (
                  <li key={match.id} style={{ viewTransitionName: `pantry-recipe-${match.id}` }}>
                    <RecipeCard recipe={match} />
                    <div className="mt-1 flex flex-wrap items-center gap-1.5 px-1">
                      <span className="text-sm text-ink/60">Missing:</span>
                      {missingIngredientNames(match, pantryNamesLower).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => void addIngredient(name)}
                          className="rounded-full border border-accent-200 px-2 py-0.5 text-xs text-ink/60 hover:bg-accent-50"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
