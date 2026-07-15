import { createFileRoute, Link } from "@tanstack/react-router";
import { listRecipes } from "#/recipes/recipes.functions";
import { getCurrentUser } from "#/users/users.functions";

export const Route = createFileRoute("/recipes/")({
  loader: async () => {
    const viewer = await getCurrentUser();
    const recipes = await listRecipes({ data: { viewerId: viewer.id } });
    return { recipes };
  },
  component: RecipesListPage,
});

function RecipesListPage() {
  const { recipes } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Recipes</h1>
        <Link to="/recipes/new" className="rounded bg-blue-600 px-4 py-2 font-medium text-white">
          New recipe
        </Link>
      </div>

      {recipes.length === 0 ? (
        <p className="mt-6 text-gray-600">No recipes yet. Create the first one!</p>
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
