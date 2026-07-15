import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { listRecipes } from "#/recipes/recipes.functions";
import { getCurrentUser } from "#/users/users.functions";
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
    const viewer = await getCurrentUser();
    const recipes = await listRecipes({
      data: { viewerId: viewer.id, tag: deps.tag, visibility: deps.visibility },
    });
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
        <h1 className="text-3xl font-bold">Recipes</h1>
        <Link to="/recipes/new" className="rounded bg-blue-600 px-4 py-2 font-medium text-white">
          New recipe
        </Link>
      </div>

      <form onSubmit={handleFilterSubmit} className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Tag</span>
          <input
            className="rounded border px-3 py-2"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            placeholder="breakfast"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">Visibility</span>
          <select
            className="rounded border px-3 py-2"
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

        <button type="submit" className="rounded border px-4 py-2 font-medium">
          Apply
        </button>

        {hasFilters && (
          <Link to="/recipes" className="text-sm text-blue-600">
            Clear filters
          </Link>
        )}
      </form>

      {recipes.length === 0 ? (
        <p className="mt-6 text-gray-600">
          {hasFilters ? "No recipes match these filters." : "No recipes yet. Create the first one!"}
        </p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link
                to="/recipes/$recipeId"
                params={{ recipeId: recipe.id }}
                className="block rounded border px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{recipe.title}</span>
                  <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    {recipe.visibility}
                  </span>
                </div>
                {recipe.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {recipe.tags.map((tag) => (
                      <span key={tag} className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700">
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
