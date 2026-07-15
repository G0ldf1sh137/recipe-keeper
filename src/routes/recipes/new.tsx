import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createRecipe } from "#/recipes/recipes.functions";
import { getSessionUser } from "#/auth/auth.functions";
import { RecipeForm, emptyRecipeFormValues } from "#/recipes/RecipeForm";

export const Route = createFileRoute("/recipes/new")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
  },
  component: NewRecipePage,
});

function NewRecipePage() {
  const navigate = useNavigate();
  const createRecipeFn = useServerFn(createRecipe);

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">New recipe</h1>
      <RecipeForm
        initialValues={emptyRecipeFormValues()}
        submitLabel="Save recipe"
        onSubmit={async (values) => {
          const recipe = await createRecipeFn({ data: values });
          await navigate({ to: "/recipes/$recipeId", params: { recipeId: recipe.id } });
        }}
      />
    </div>
  );
}
