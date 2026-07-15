import { createFileRoute, Link } from "@tanstack/react-router";
import { getRecipe } from "#/recipes/recipes.functions";
import { getCurrentUser } from "#/users/users.functions";

export const Route = createFileRoute("/recipes/$recipeId")({
  loader: async ({ params }) => {
    const viewer = await getCurrentUser();
    const recipe = await getRecipe({ data: { id: params.recipeId, viewerId: viewer.id } });
    return { recipe };
  },
  component: RecipePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-2xl font-bold">Recipe not found</h1>
      <p className="mt-2 text-gray-600">
        This recipe doesn't exist, or isn't shared with you.{" "}
        <Link to="/" className="text-blue-600">
          Back home
        </Link>
      </p>
    </div>
  ),
});

function RecipePage() {
  const { recipe } = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-2xl p-8">
      <Link to="/" className="text-sm text-blue-600">
        ← Back home
      </Link>
      <span className="mt-4 block text-xs font-medium uppercase tracking-wide text-gray-500">
        {recipe.visibility}
      </span>
      <h1 className="text-3xl font-bold">{recipe.title}</h1>
      {recipe.description && <p className="mt-2 text-gray-700">{recipe.description}</p>}

      {recipe.photoUrl && (
        <img src={recipe.photoUrl} alt={recipe.title} className="mt-4 w-full rounded object-cover" />
      )}

      {recipe.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
              {tag}
            </span>
          ))}
        </div>
      )}

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Ingredients</h2>
        <ul className="mt-2 list-inside list-disc">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>
              {[ing.qty, ing.unit, ing.name].filter(Boolean).join(" ")}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xl font-semibold">Steps</h2>
        <ol className="mt-2 list-inside list-decimal space-y-2">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
