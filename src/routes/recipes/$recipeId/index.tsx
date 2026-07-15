import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getRecipe, deleteRecipe } from "#/recipes/recipes.functions";
import { listComments } from "#/comments/comments.functions";
import { getSessionUser } from "#/auth/auth.functions";
import { CommentThread } from "#/comments/CommentThread";

export const Route = createFileRoute("/recipes/$recipeId/")({
  loader: async ({ params }) => {
    const [recipe, comments, user] = await Promise.all([
      getRecipe({ data: { id: params.recipeId } }),
      listComments({ data: { recipeId: params.recipeId } }),
      getSessionUser(),
    ]);
    return { recipe, comments, user };
  },
  component: RecipePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">Recipe not found</h1>
      <p className="mt-2 text-ink/60">
        This recipe doesn't exist, or isn't shared with you.{" "}
        <Link to="/" className="font-medium text-accent-600 hover:text-accent-700">
          Back home
        </Link>
      </p>
    </div>
  ),
});

function RecipePage() {
  const { recipe, comments, user } = Route.useLoaderData();
  const navigate = useNavigate();
  const deleteRecipeFn = useServerFn(deleteRecipe);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    if (!window.confirm(`Delete "${recipe.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteRecipeFn({ data: { id: recipe.id } });
      await navigate({ to: "/recipes" });
    } catch {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="flex items-center justify-between">
        <Link to="/" className="text-sm font-medium text-accent-600 hover:text-accent-700">
          ← Back home
        </Link>
        {recipe.isOwner && (
          <div className="flex gap-3">
            <Link
              to="/recipes/$recipeId/edit"
              params={{ recipeId: recipe.id }}
              className="text-sm font-medium text-accent-600 hover:text-accent-700"
            >
              Edit
            </Link>
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
            >
              {deleting ? "Deleting..." : "Delete"}
            </button>
          </div>
        )}
      </div>
      <span className="mt-4 block text-xs font-medium uppercase tracking-wide text-accent-600">
        {recipe.visibility}
      </span>
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">{recipe.title}</h1>
      {recipe.description && <p className="mt-2 text-ink/70">{recipe.description}</p>}

      {recipe.photoUrl && (
        <img
          src={recipe.photoUrl}
          alt={recipe.title}
          className="mt-4 w-full rounded-xl object-cover shadow-sm"
        />
      )}

      {recipe.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-accent-50 px-3 py-1 text-sm text-accent-700">
              {tag}
            </span>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Ingredients</h2>
        <ul className="mt-2 list-inside list-disc text-ink/80">
          {recipe.ingredients.map((ing, i) => (
            <li key={i}>
              {[ing.qty, ing.unit, ing.name].filter(Boolean).join(" ")}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Steps</h2>
        <ol className="mt-2 list-inside list-decimal space-y-2 text-ink/80">
          {recipe.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>
      </section>

      <CommentThread recipeId={recipe.id} comments={comments} canComment={!!user} />
    </div>
  );
}
