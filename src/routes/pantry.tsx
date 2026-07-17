import { useState } from "react";
import { createFileRoute, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { getIngredientNames } from "#/recipes/recipes.functions";
import { getPantryItems, addPantryItem, removePantryItem, getPantryMatches } from "#/pantry/pantry.functions";
import type { PantryMatch } from "#/pantry/pantry.server";
import { TagInput } from "#/recipes/TagInput";
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

  async function handlePantryChange(next: string[]) {
    const added = next.filter((name) => !pantryNames.includes(name));
    const removed = pantryNames.filter((name) => !next.includes(name));
    setPantryNames(next);
    await Promise.all([
      ...added.map((name) => addPantryItemFn({ data: { name } })),
      ...removed.map((name) => removePantryItemFn({ data: { name } })),
    ]);
    setMatches(await getPantryMatchesFn());
  }

  const pantryNamesLower = new Set(pantryNames.map((name) => name.toLowerCase()));
  const readyToMake = matches.filter((match) => match.totalIngredients === match.matchedIngredients);
  const closeMatches = matches.filter((match) => match.totalIngredients > match.matchedIngredients);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Pantry</h1>
      <p className="mt-2 text-ink/60">List what you have, and we'll show you what you can make.</p>

      <div className="mt-6">
        <TagInput
          value={pantryNames}
          onChange={(next) => void handlePantryChange(next)}
          knownTagNames={loaderData.knownIngredientNames}
          placeholder="Add an ingredient you have on hand..."
        />
      </div>

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
                  <li key={match.id}>
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
                  <li key={match.id}>
                    <RecipeCard recipe={match} />
                    <p className="mt-1 px-1 text-sm text-ink/60">
                      Missing: {missingIngredientNames(match, pantryNamesLower).join(", ")}
                    </p>
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
