import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getProfile } from "#/profile/profile.functions";
import { RecipeCard } from "#/recipes/RecipeCard";

export const Route = createFileRoute("/u/$username")({
  loader: async ({ params }) => getProfile({ data: { username: params.username } }),
  component: ProfilePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">User not found</h1>
      <p className="mt-2 text-ink/60">
        This profile doesn't exist.{" "}
        <Link
          to="/"
          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Back home
        </Link>
      </p>
    </div>
  ),
});

function ProfilePage() {
  const { user, recipes, collections } = Route.useLoaderData();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredRecipes = recipes.filter((recipe) => recipe.title.toLowerCase().includes(q));
  const filteredCollections = collections.filter((collection) =>
    collection.name.toLowerCase().includes(q),
  );

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <div className="flex items-center gap-4">
        {user.avatarUrl && (
          <img src={user.avatarUrl} alt={user.name} loading="lazy" className="h-16 w-16 rounded-full" />
        )}
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{user.name}</h1>
          <p className="text-sm text-ink/60">@{user.username}</p>
        </div>
      </div>

      {(recipes.length > 0 || collections.length > 0) && (
        <input
          className="mt-6 w-full rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search recipes and cookbooks"
        />
      )}

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Recipes</h2>
        {recipes.length === 0 ? (
          <p className="mt-2 text-ink/60">No public recipes yet.</p>
        ) : filteredRecipes.length === 0 ? (
          <p className="mt-2 text-ink/60">No recipes match "{query}".</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {filteredRecipes.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Cookbooks</h2>
        {collections.length === 0 ? (
          <p className="mt-2 text-ink/60">No public cookbooks yet.</p>
        ) : filteredCollections.length === 0 ? (
          <p className="mt-2 text-ink/60">No cookbooks match "{query}".</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {filteredCollections.map((collection) => (
              <li
                key={collection.id}
                className="flex items-center justify-between rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
              >
                <Link
                  to="/collections/$collectionId"
                  params={{ collectionId: collection.id }}
                  className="font-serif text-lg font-medium text-ink"
                >
                  {collection.name}
                </Link>
                <span className="text-sm text-ink/50">
                  {collection.recipeCount} recipe{collection.recipeCount === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
