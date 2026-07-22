import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getHiddenRecipes, unhideRecipe } from "#/hidden-recipes/hidden-recipes.functions";

export const Route = createFileRoute("/settings/hidden-recipes")({
  loader: async () => getHiddenRecipes(),
  component: HiddenRecipesPage,
});

function HiddenRecipesPage() {
  const hiddenRecipes = Route.useLoaderData();
  const router = useRouter();
  const unhideRecipeFn = useServerFn(unhideRecipe);

  async function handleUnhide(recipeId: string) {
    await unhideRecipeFn({ data: { recipeId } });
    await router.invalidate();
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/settings"
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Settings
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink">Hidden recipes</h1>

      {hiddenRecipes.length === 0 ? (
        <p className="mt-6 text-ink/60">You haven't hidden any recipes.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {hiddenRecipes.map((recipe) => (
            <li
              key={recipe.id}
              className="flex items-center justify-between gap-4 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              <div className="flex items-center gap-3">
                {recipe.coverPhotoUrl && (
                  <img
                    src={recipe.coverPhotoUrl}
                    alt=""
                    loading="lazy"
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                )}
                <Link
                  to="/recipes/$recipeId"
                  params={{ recipeId: recipe.id }}
                  className="font-medium text-ink hover:text-accent-600 dark:hover:text-accent-400"
                >
                  {recipe.title}
                </Link>
              </div>
              <button
                type="button"
                onClick={() => void handleUnhide(recipe.id)}
                className="rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-accent-50"
              >
                Unhide
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
