import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getRecipe, updateRecipe } from "#/recipes/recipes.functions";
import { RecipeForm } from "#/recipes/RecipeForm";

export const Route = createFileRoute("/recipes/$recipeId/edit")({
  loader: async ({ params }) => {
    const recipe = await getRecipe({ data: { id: params.recipeId } });
    if (!recipe.isOwner) {
      throw redirect({ to: "/recipes/$recipeId", params: { recipeId: params.recipeId } });
    }
    return { recipe };
  },
  component: EditRecipePage,
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

function EditRecipePage() {
  const { recipe } = Route.useLoaderData();
  const navigate = useNavigate();
  const updateRecipeFn = useServerFn(updateRecipe);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="text-3xl font-bold">Edit recipe</h1>
      <RecipeForm
        initialValues={{
          title: recipe.title,
          description: recipe.description ?? "",
          photoUrl: recipe.photoUrl ?? "",
          tagsInput: recipe.tags.join(", "),
          visibility: recipe.visibility,
          ingredients: recipe.ingredients.length ? recipe.ingredients : [{ qty: "", unit: "", name: "" }],
          steps: recipe.steps.length ? recipe.steps : [""],
        }}
        submitLabel="Save changes"
        onSubmit={async (values) => {
          await updateRecipeFn({ data: { id: recipe.id, ...values } });
          await navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id } });
        }}
      />
    </div>
  );
}
