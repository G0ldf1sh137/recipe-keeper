import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { listRecipes } from "#/recipes/recipes.functions";
import { visibilityValues } from "#/db/schema";
import type { Visibility } from "#/db/schema";

const recipesSearchSchema = z.object({
  tag: z.string().min(1).optional(),
  visibility: z.enum(visibilityValues).optional(),
});

export const Route = createFileRoute("/recipes/")({
  validateSearch: recipesSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const recipes = await listRecipes({ data: deps });
    return { recipes };
  },
  component: RecipesListPage,
});

function RecipesListPage() {
  const { recipes } = Route.useLoaderData();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });

  const [tagInput, setTagInput] = useState(search.tag ?? "");
  useEffect(() => setTagInput(search.tag ?? ""), [search.tag]);

  function handleFilterSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate({ search: (prev) => ({ ...prev, tag: tagInput.trim() || undefined }) });
  }

  function handleVisibilityChange(value: string) {
    navigate({
      search: (prev) => ({ ...prev, visibility: (value || undefined) as Visibility | undefined }),
    });
  }

  const hasFilters = Boolean(search.tag || search.visibility);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Recipes</h1>
        <Link
          to="/recipes/new"
          className="rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700"
        >
          New recipe
        </Link>
      </div>

      <form onSubmit={handleFilterSubmit} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink/70">Tag</span>
          <input
            className="rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="breakfast"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink/70">Visibility</span>
          <select
            className="rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
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
          className="rounded-lg border border-accent-200 px-4 py-2 font-medium text-ink transition-colors hover:bg-accent-50"
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
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: recipe.id }}
                className="block rounded-xl border border-accent-100 bg-surface px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <span className="font-serif text-lg font-medium text-ink">{recipe.title}</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-ink/40">
                    {recipe.visibility}
                  </span>
                </div>
                {recipe.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recipe.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-accent-50 px-2 py-0.5 text-xs text-ink/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
