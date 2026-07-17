import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { listRecipes } from "#/recipes/recipes.functions";
import { getRatingSummaries } from "#/ratings/ratings.functions";
import { RecipeCard } from "#/recipes/RecipeCard";
import { visibilityValues } from "#/db/schema";
import type { Visibility } from "#/db/schema";

const recipesSearchSchema = z.object({
  visibility: z.enum(visibilityValues).optional(),
  q: z.string().min(1).optional(),
});

export const Route = createFileRoute("/recipes/")({
  validateSearch: recipesSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const recipes = await listRecipes({ data: deps });
    const ratings = await getRatingSummaries({ data: { recipeIds: recipes.map((r) => r.id) } });
    return { recipes, ratings };
  },
  component: RecipesListPage,
});

function RecipesListPage() {
  const { recipes, ratings } = Route.useLoaderData();
  const ratingsById = new Map(Object.entries(ratings));
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [qInput, setQInput] = useState(search.q ?? "");
  useEffect(() => setQInput(search.q ?? ""), [search.q]);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({
      search: (prev) => ({
        ...prev,
        q: qInput.trim() || undefined,
      }),
    });
  }

  function handleVisibilityChange(value: string) {
    navigate({
      search: (prev) => ({ ...prev, visibility: (value || undefined) as Visibility | undefined }),
    });
  }

  const hasFilters = Boolean(search.visibility || search.q);

  function handleRandom() {
    const recipe = recipes[Math.floor(Math.random() * recipes.length)];
    void navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id } });
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

      <form onSubmit={handleFilterSubmit} className="mt-6 flex flex-wrap items-end gap-3">
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

        <button
          type="submit"
          className="rounded-lg border-2 border-accent-300 px-4 py-2 font-medium text-ink transition-colors hover:bg-accent-50"
        >
          Apply
        </button>

        {hasFilters && (
          <Link
            to="/recipes"
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Clear filters
          </Link>
        )}
      </form>

      {recipes.length === 0 ? (
        <p className="mt-6 text-ink/60">
          {hasFilters ? "No recipes match these filters." : "No recipes yet. Create the first one!"}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} rating={ratingsById.get(recipe.id)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
