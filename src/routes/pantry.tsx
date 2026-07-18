import { useState } from "react";
import { flushSync } from "react-dom";
import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { getIngredientNames } from "#/recipes/recipes.functions";
import {
  getPantryItems,
  addPantryItem,
  removePantryItem,
  getPantryMatches,
  getPantryGroups,
  removeHouseholdPantryItem,
  clearPantry,
} from "#/pantry/pantry.functions";
import type { PantryMatch } from "#/pantry/pantry.server";
import { getMyHouseholdInfo } from "#/households/households.functions";
import { RecipeCard } from "#/recipes/RecipeCard";

export const Route = createFileRoute("/pantry")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    return { user };
  },
  loader: async ({ context }) => {
    const [pantryItems, knownIngredientNames, matches, household, groups] = await Promise.all([
      getPantryItems(),
      getIngredientNames(),
      getPantryMatches(),
      getMyHouseholdInfo(),
      getPantryGroups(),
    ]);
    return { pantryItems, knownIngredientNames, matches, household, groups, userId: context.user.id };
  },
  component: PantryPage,
});

function missingIngredientNames(match: PantryMatch, pantryNamesLower: Set<string>): string[] {
  return match.ingredients
    .filter((ingredient) => !pantryNamesLower.has(ingredient.name.toLowerCase()))
    .map((ingredient) => ingredient.name);
}

// Assigned to other household members' chip groups, by position among the
// non-"you" members (stable since households.server.ts orders members by
// name) — "you" keeps the app's usual neutral accent styling.
const memberColors = [
  { bg: "bg-sky-50 dark:bg-sky-950", text: "text-sky-700 dark:text-sky-300" },
  { bg: "bg-rose-50 dark:bg-rose-950", text: "text-rose-700 dark:text-rose-300" },
  { bg: "bg-emerald-50 dark:bg-emerald-950", text: "text-emerald-700 dark:text-emerald-300" },
  { bg: "bg-violet-50 dark:bg-violet-950", text: "text-violet-700 dark:text-violet-300" },
  { bg: "bg-amber-50 dark:bg-amber-950", text: "text-amber-700 dark:text-amber-300" },
];

function PantryPage() {
  const loaderData = Route.useLoaderData();
  const addPantryItemFn = useServerFn(addPantryItem);
  const removePantryItemFn = useServerFn(removePantryItem);
  const getPantryMatchesFn = useServerFn(getPantryMatches);
  const getPantryGroupsFn = useServerFn(getPantryGroups);
  const getPantryItemsFn = useServerFn(getPantryItems);
  const removeHouseholdPantryItemFn = useServerFn(removeHouseholdPantryItem);
  const clearPantryFn = useServerFn(clearPantry);

  const [pantryNames, setPantryNames] = useState(loaderData.pantryItems);
  const [matches, setMatches] = useState(loaderData.matches);
  const [groups, setGroups] = useState(loaderData.groups);
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

  function patchOwnGroup(updateItems: (items: string[]) => string[]) {
    setGroups(
      (prev) =>
        prev?.map((group) =>
          group.ownerId === loaderData.userId ? { ...group, items: updateItems(group.items) } : group,
        ) ?? prev,
    );
  }

  async function refreshAfterChange() {
    const [nextMatches, nextGroups] = await Promise.all([getPantryMatchesFn(), getPantryGroupsFn()]);
    applyMatches(nextMatches);
    setGroups(nextGroups);
  }

  async function addIngredient(rawName: string) {
    const name = rawName.trim().toLowerCase();
    if (!name || pantryNames.includes(name)) return;
    setPantryNames((prev) => [...prev, name]);
    patchOwnGroup((items) => [...items, name].sort());
    await addPantryItemFn({ data: { name } });
    await refreshAfterChange();
  }

  async function handleAddItem(e: React.FormEvent) {
    e.preventDefault();
    const name = draft;
    setDraft("");
    await addIngredient(name);
  }

  async function handleRemoveItem(name: string) {
    setPantryNames((prev) => prev.filter((n) => n !== name));
    patchOwnGroup((items) => items.filter((n) => n !== name));
    await removePantryItemFn({ data: { name } });
    await refreshAfterChange();
  }

  async function handleRemoveOtherItem(ownerId: string, name: string) {
    setGroups(
      (prev) => prev?.map((g) => (g.ownerId === ownerId ? { ...g, items: g.items.filter((n) => n !== name) } : g)) ?? prev,
    );
    await removeHouseholdPantryItemFn({ data: { ownerId, name } });
    await refreshAfterChange();
  }

  async function handleClearPantry() {
    if (!window.confirm("Clear every item from everyone's pantry? This can't be undone.")) return;
    await clearPantryFn();
    const [nextPantryItems, nextMatches, nextGroups] = await Promise.all([
      getPantryItemsFn(),
      getPantryMatchesFn(),
      getPantryGroupsFn(),
    ]);
    setPantryNames(nextPantryItems);
    applyMatches(nextMatches);
    setGroups(nextGroups);
  }

  const isHouseholdOwner = loaderData.household?.ownerId === loaderData.userId;
  const pantryNamesLower = new Set((groups ? groups.flatMap((g) => g.items) : pantryNames).map((name) => name.toLowerCase()));
  const readyToMake = matches.filter((match) => match.totalIngredients === match.matchedIngredients);
  const closeMatches = matches.filter((match) => match.totalIngredients > match.matchedIngredients);

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Pantry</h1>
      <p className="mt-2 text-ink/60">List what you have, and we'll show you what you can make.</p>
      {loaderData.household && (
        <p className="mt-1 text-sm text-ink/50">
          Showing combined pantry with {loaderData.household.name} — {loaderData.household.members.length}{" "}
          member{loaderData.household.members.length === 1 ? "" : "s"}.{" "}
          <Link
            to="/settings"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Manage
          </Link>
        </p>
      )}

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

      {groups ? (
        <div className="mt-4 flex flex-col gap-3">
          {groups.map((group) => {
            const isYou = group.ownerId === loaderData.userId;
            const otherIndex = groups.filter((g) => g.ownerId !== loaderData.userId).findIndex((g) => g.ownerId === group.ownerId);
            const color = isYou ? { bg: "bg-accent-50", text: "text-ink/70" } : memberColors[otherIndex % memberColors.length];
            const canRemove = isYou || isHouseholdOwner;
            return (
              <div key={group.ownerId}>
                <span className={`text-xs font-medium ${isYou ? "text-ink/50" : color.text}`}>
                  {isYou ? "You" : group.ownerName}
                </span>
                <div className="mt-1 flex flex-wrap gap-2">
                  {group.items.length === 0 ? (
                    <span className="text-xs text-ink/40">No items yet</span>
                  ) : (
                    group.items.map((name) => (
                      <span
                        key={name}
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${color.bg} ${color.text}`}
                      >
                        {name}
                        {canRemove && (
                          <button
                            type="button"
                            onClick={() =>
                              void (isYou ? handleRemoveItem(name) : handleRemoveOtherItem(group.ownerId, name))
                            }
                            aria-label={`Remove ${name}`}
                            className="text-ink/40 hover:text-ink"
                          >
                            ✕
                          </button>
                        )}
                      </span>
                    ))
                  )}
                </div>
              </div>
            );
          })}
          {isHouseholdOwner && (
            <button
              type="button"
              onClick={() => void handleClearPantry()}
              className="self-start text-sm font-medium text-red-600 hover:text-red-700"
            >
              Clear pantry
            </button>
          )}
        </div>
      ) : (
        pantryNames.length > 0 && (
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
        )
      )}

      {matches.length === 0 ? (
        <p className="mt-6 text-ink/60">
          {pantryNames.length === 0 && !loaderData.household
            ? "Add a few ingredients to see what you can make."
            : "No recipes match what's in your pantry yet."}
        </p>
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
