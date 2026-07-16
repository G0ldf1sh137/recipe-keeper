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

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <div className="flex items-center gap-4">
        {user.avatarUrl && (
          <img src={user.avatarUrl} alt={user.name} className="h-16 w-16 rounded-full" />
        )}
        <div>
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{user.name}</h1>
          <p className="text-sm text-ink/60">@{user.username}</p>
        </div>
      </div>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Recipes</h2>
        {recipes.length === 0 ? (
          <p className="mt-2 text-ink/60">No public recipes yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {recipes.map((recipe) => (
              <li key={recipe.id}>
                <RecipeCard recipe={recipe} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Lists</h2>
        {collections.length === 0 ? (
          <p className="mt-2 text-ink/60">No public lists yet.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-3">
            {collections.map((collection) => (
              <li
                key={collection.id}
                className="flex items-center justify-between rounded-xl border border-accent-100 bg-surface px-4 py-3 shadow-sm"
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
