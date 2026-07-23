import { useState } from "react";
import { RecipeCard } from "./RecipeCard";

type ForkableRecipe = {
  id: string;
  parentRecipeId: string | null;
  title: string;
  visibility: string;
  tags: string[];
  photoUrls: string[];
  coverPhotoUrl: string | null;
};

export type RecipeGroup<T extends ForkableRecipe> = { primary: T; forks: T[] };

// Collapses a flat, already-sorted list of recipes so that a recipe and any of
// its forks present in the same list render as one card with an expandable
// "N forks" toggle, instead of separate, duplicate-looking entries. Grouping
// primarily works off whatever's currently loaded, but `extraRoots` (backfilled
// server-side by resolveMissingRoots for any fork whose original isn't in this
// page) lets a fork resolve to its true primary immediately, rather than
// rendering standalone until the original happens to paginate in. extraRoots
// entries are only ever used for this lookup, never rendered as their own
// top-level card. A fork whose original truly can't be resolved (filtered out
// by visibility/wall/mute/hidden, not just unloaded) is still left standalone.
export function groupRecipeForks<T extends ForkableRecipe>(
  recipes: T[],
  extraRoots: Map<string, T> = new Map(),
): RecipeGroup<T>[] {
  const byId = new Map<string, T>(extraRoots);
  for (const r of recipes) byId.set(r.id, r);
  const rootIdCache = new Map<string, string>();

  function findRootId(id: string): string {
    const cached = rootIdCache.get(id);
    if (cached) return cached;
    const parentId = byId.get(id)?.parentRecipeId;
    const root = parentId && byId.has(parentId) ? findRootId(parentId) : id;
    rootIdCache.set(id, root);
    return root;
  }

  const membersByRoot = new Map<string, T[]>();
  for (const recipe of recipes) {
    const root = findRootId(recipe.id);
    const members = membersByRoot.get(root);
    if (members) members.push(recipe);
    else membersByRoot.set(root, [recipe]);
  }

  const seenRoots = new Set<string>();
  const groups: RecipeGroup<T>[] = [];
  for (const recipe of recipes) {
    const root = findRootId(recipe.id);
    if (seenRoots.has(root)) continue;
    seenRoots.add(root);
    const primary = byId.get(root)!;
    const forks = membersByRoot.get(root)!.filter((m) => m.id !== primary.id);
    groups.push({ primary, forks });
  }
  return groups;
}

export function RecipeForkGroup<T extends ForkableRecipe>({
  group,
  rating,
  ratingsById,
  onHide,
}: {
  group: RecipeGroup<T>;
  rating?: { average: number; count: number };
  ratingsById: Map<string, { average: number; count: number }>;
  onHide?: (recipeId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const { primary, forks } = group;

  return (
    <div>
      <RecipeCard recipe={primary} rating={rating} onHide={onHide ? () => onHide(primary.id) : undefined} />
      {forks.length > 0 && (
        <div className="mt-1 pl-2">
          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            {expanded ? "▾" : "▸"} {forks.length} fork{forks.length === 1 ? "" : "s"}
          </button>
          {expanded && (
            <ul className="mt-2 flex flex-col gap-2 border-l-2 border-accent-100 pl-4">
              {forks.map((fork) => (
                <li key={fork.id}>
                  <RecipeCard
                    recipe={fork}
                    rating={ratingsById.get(fork.id)}
                    onHide={onHide ? () => onHide(fork.id) : undefined}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
