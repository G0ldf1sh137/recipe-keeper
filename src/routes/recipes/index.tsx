import { useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { listRecipes, getRandomRecipeId } from "#/recipes/recipes.functions";
import { getRatingSummaries } from "#/ratings/ratings.functions";
import { RecipeCardSkeleton } from "#/recipes/RecipeCardSkeleton";
import { groupRecipeForks, RecipeForkGroup } from "#/recipes/RecipeForkGroup";
import { getSessionUser } from "#/auth/auth.functions";
import { hideRecipe, unhideRecipe } from "#/hidden-recipes/hidden-recipes.functions";
import { Toast } from "#/ui/Toast";
import { visibilityValues } from "#/db/schema";
import type { Visibility } from "#/db/schema";

const recipesSearchSchema = z.object({
  visibility: z.enum(visibilityValues).optional(),
  q: z.string().min(1).optional(),
  sortBy: z.enum(["recent", "topRated", "mostComments"]).optional(),
});

export const Route = createFileRoute("/recipes/")({
  validateSearch: recipesSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const [{ recipes, hasMore, extraRoots }, user] = await Promise.all([
      listRecipes({ data: deps }),
      getSessionUser(),
    ]);
    const ratings = await getRatingSummaries({ data: { recipeIds: recipes.map((r) => r.id) } });
    return { recipes, hasMore, extraRoots, ratings, isLoggedIn: !!user };
  },
  component: RecipesListPage,
});

function RecipesListPage() {
  const loaderData = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const listRecipesFn = useServerFn(listRecipes);
  const getRatingSummariesFn = useServerFn(getRatingSummaries);
  const getRandomRecipeIdFn = useServerFn(getRandomRecipeId);
  const hideRecipeFn = useServerFn(hideRecipe);
  const unhideRecipeFn = useServerFn(unhideRecipe);

  const [recipes, setRecipes] = useState(loaderData.recipes);
  const [hasMore, setHasMore] = useState(loaderData.hasMore);
  const [extraRoots, setExtraRoots] = useState(() => new Map(Object.entries(loaderData.extraRoots)));
  const [ratingsById, setRatingsById] = useState(() => new Map(Object.entries(loaderData.ratings)));
  const [loadingMore, setLoadingMore] = useState(false);
  const [hideToast, setHideToast] = useState<{ recipeId: string; title: string } | null>(null);
  const removedRecipeRef = useRef<{ recipe: (typeof loaderData.recipes)[number]; index: number } | null>(null);
  const toastTimeoutRef = useRef<number | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // Synchronous guards for the scroll-triggered fetch below — state alone isn't
  // enough here, since IntersectionObserver can fire again before a re-render
  // (with the updated `loadingMore`/`hasMore` state) has had a chance to land.
  const scrollStateRef = useRef({ recipes: loaderData.recipes, hasMore: loaderData.hasMore, loadingMore: false });

  useEffect(() => {
    scrollStateRef.current = { recipes: loaderData.recipes, hasMore: loaderData.hasMore, loadingMore: false };
    setRecipes(loaderData.recipes);
    setHasMore(loaderData.hasMore);
    setExtraRoots(new Map(Object.entries(loaderData.extraRoots)));
    setRatingsById(new Map(Object.entries(loaderData.ratings)));
  }, [loaderData]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) void loadMore();
    });
    observer.observe(sentinel);
    return () => observer.disconnect();

    async function loadMore() {
      const current = scrollStateRef.current;
      if (current.loadingMore || !current.hasMore) return;
      scrollStateRef.current = { ...current, loadingMore: true };
      setLoadingMore(true);
      try {
        const result = await listRecipesFn({ data: { ...search, offset: current.recipes.length } });
        const newRatings = await getRatingSummariesFn({
          data: { recipeIds: result.recipes.map((r) => r.id) },
        });
        const nextRecipes = [...current.recipes, ...result.recipes];
        scrollStateRef.current = { recipes: nextRecipes, hasMore: result.hasMore, loadingMore: false };
        setRecipes(nextRecipes);
        setExtraRoots((prev) => {
          const next = new Map(prev);
          for (const [id, recipe] of Object.entries(result.extraRoots)) next.set(id, recipe);
          return next;
        });
        setRatingsById((prev) => {
          const next = new Map(prev);
          for (const [id, summary] of Object.entries(newRatings)) next.set(id, summary);
          return next;
        });
        setHasMore(result.hasMore);
      } finally {
        setLoadingMore(false);
      }
    }
  }, [search, listRecipesFn, getRatingSummariesFn]);

  const [qInput, setQInput] = useState(search.q ?? "");
  useEffect(() => setQInput(search.q ?? ""), [search.q]);

  // Live search: debounce so we don't refetch on every keystroke, mirroring
  // the same setTimeout/clearTimeout pattern used for admin's user search.
  useEffect(() => {
    const trimmed = qInput.trim();
    if (trimmed === (search.q ?? "")) return;
    const timeout = window.setTimeout(() => {
      navigate({ search: (prev) => ({ ...prev, q: trimmed || undefined }) });
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [qInput, search.q, navigate]);

  function handleVisibilityChange(value: string) {
    navigate({
      search: (prev) => ({ ...prev, visibility: (value || undefined) as Visibility | undefined }),
    });
  }

  function handleSortChange(value: string) {
    navigate({
      search: (prev) => ({
        ...prev,
        sortBy: (value || undefined) as "recent" | "topRated" | "mostComments" | undefined,
      }),
    });
  }

  const hasFilters = Boolean(search.visibility || search.q);
  const groups = useMemo(() => groupRecipeForks(recipes, extraRoots), [recipes, extraRoots]);

  async function handleRandom() {
    const id = await getRandomRecipeIdFn({ data: search });
    if (id) void navigate({ to: "/recipes/$recipeId", params: { recipeId: id } });
  }

  function handleHide(recipeId: string) {
    const index = recipes.findIndex((r) => r.id === recipeId);
    if (index === -1) return;
    const recipe = recipes[index];
    removedRecipeRef.current = { recipe, index };
    setRecipes((prev) => prev.filter((r) => r.id !== recipeId));
    setHideToast({ recipeId, title: recipe.title });
    void hideRecipeFn({ data: { recipeId } });

    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    toastTimeoutRef.current = window.setTimeout(() => {
      setHideToast((current) => (current?.recipeId === recipeId ? null : current));
    }, 5000);
  }

  function handleUndoHide() {
    const removed = removedRecipeRef.current;
    if (!removed) return;
    if (toastTimeoutRef.current) window.clearTimeout(toastTimeoutRef.current);
    setRecipes((prev) => {
      const next = [...prev];
      next.splice(Math.min(removed.index, next.length), 0, removed.recipe);
      return next;
    });
    setHideToast(null);
    removedRecipeRef.current = null;
    void unhideRecipeFn({ data: { recipeId: removed.recipe.id } });
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Recipes</h1>
        <div className="flex gap-3">
          {recipes.length > 0 && (
            <button
              type="button"
              onClick={handleRandom}
              className="rounded-lg border-2 border-accent-300 px-4 py-2 font-medium text-ink transition-colors hover:bg-accent-50"
            >
              Random recipe
            </button>
          )}
          <Link
            to="/recipes/new"
            className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700"
          >
            New recipe
          </Link>
        </div>
      </div>

      <Link
        to="/recipes/tags"
        className="mt-2 inline-block text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        Browse tags
      </Link>

      <div className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink/70">Search</span>
          <input
            className="w-64 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="title, tag, or ingredient"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink/70">Visibility</span>
          <select
            className="rounded-lg border border-accent-100 bg-surface px-3 py-2 text-ink focus:border-accent-400 focus:outline-none"
            value={search.visibility ?? ""}
            onChange={(e) => handleVisibilityChange(e.target.value)}
          >
            <option value="">All</option>
            {visibilityValues.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink/70">Sort by</span>
          <select
            className="rounded-lg border border-accent-100 bg-surface px-3 py-2 text-ink focus:border-accent-400 focus:outline-none"
            value={search.sortBy ?? ""}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            <option value="">Most recent</option>
            <option value="topRated">Highest rated</option>
            <option value="mostComments">Most comments</option>
          </select>
        </label>

        {hasFilters && (
          <Link
            to="/recipes"
            search={{ sortBy: search.sortBy }}
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Clear filters
          </Link>
        )}
      </div>

      {recipes.length === 0 ? (
        <p className="mt-6 text-ink/60">
          {hasFilters ? "No recipes match these filters." : "No recipes yet. Create the first one!"}
        </p>
      ) : (
        <>
          <ul className="mt-6 flex flex-col gap-3">
            {groups.map((group) => (
              <li key={group.primary.id}>
                <RecipeForkGroup
                  group={group}
                  rating={ratingsById.get(group.primary.id)}
                  ratingsById={ratingsById}
                  onHide={loaderData.isLoggedIn ? handleHide : undefined}
                />
              </li>
            ))}
            {loadingMore && (
              <>
                <li>
                  <RecipeCardSkeleton />
                </li>
                <li>
                  <RecipeCardSkeleton />
                </li>
              </>
            )}
          </ul>
          {hasMore && <div ref={sentinelRef} className="h-1" />}
        </>
      )}
      {hideToast && (
        <Toast message={`"${hideToast.title}" hidden`} actionLabel="Undo" onAction={handleUndoHide} />
      )}
    </div>
  );
}
