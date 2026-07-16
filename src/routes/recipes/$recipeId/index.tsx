import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getRecipe,
  deleteRecipe,
  createRecipeShare,
  revokeRecipeShare,
  forkRecipe,
} from "#/recipes/recipes.functions";
import { RecipeCard } from "#/recipes/RecipeCard";
import { listComments } from "#/comments/comments.functions";
import { getSessionUser } from "#/auth/auth.functions";
import { CommentThread } from "#/comments/CommentThread";
import { getRatingSummary } from "#/ratings/ratings.functions";
import { RecipeRating } from "#/ratings/RecipeRating";
import { getCollectionsForRecipe } from "#/collections/collections.functions";
import { SaveToList } from "#/collections/SaveToList";
import { getGroceryListsForRecipe } from "#/grocery/grocery.functions";
import { AddToGroceryList } from "#/grocery/AddToGroceryList";
import { ShareControl } from "#/sharing/ShareControl";

const recipeSearchSchema = z.object({ st: z.string().optional() });

export const Route = createFileRoute("/recipes/$recipeId/")({
  validateSearch: recipeSearchSchema,
  loaderDeps: ({ search }) => ({ shareToken: search.st }),
  loader: async ({ params, deps }) => {
    const [recipe, comments, user, rating] = await Promise.all([
      getRecipe({ data: { id: params.recipeId, shareToken: deps.shareToken } }),
      listComments({ data: { recipeId: params.recipeId, shareToken: deps.shareToken } }),
      getSessionUser(),
      getRatingSummary({ data: { recipeId: params.recipeId, shareToken: deps.shareToken } }),
    ]);
    const [collections, groceryLists] = user
      ? await Promise.all([
          getCollectionsForRecipe({ data: { recipeId: params.recipeId } }),
          getGroceryListsForRecipe({ data: { recipeId: params.recipeId } }),
        ])
      : [[], []];
    return { recipe, comments, user, rating, collections, groceryLists };
  },
  component: RecipePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">Recipe not found</h1>
      <p className="mt-2 text-ink/60">
        This recipe doesn't exist, or isn't shared with you.{" "}
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

function RecipePage() {
  const { recipe, comments, user, rating, collections, groceryLists } = Route.useLoaderData();
  const { st: shareToken } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const deleteRecipeFn = useServerFn(deleteRecipe);
  const createShareFn = useServerFn(createRecipeShare);
  const revokeShareFn = useServerFn(revokeRecipeShare);
  const forkRecipeFn = useServerFn(forkRecipe);
  const [deleting, setDeleting] = useState(false);
  const [forking, setForking] = useState(false);

  async function handleFork() {
    setForking(true);
    try {
      const fork = await forkRecipeFn({ data: { recipeId: recipe.id, shareToken } });
      await navigate({ to: "/recipes/$recipeId", params: { recipeId: fork.id } });
    } finally {
      setForking(false);
    }
  }

  async function handleShare() {
    await createShareFn({ data: { recipeId: recipe.id } });
    await router.invalidate();
  }

  async function handleRevoke() {
    await revokeShareFn({ data: { recipeId: recipe.id } });
    await router.invalidate();
  }

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
        <Link
          to="/"
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          ← Back home
        </Link>
        <div className="flex gap-3">
          {!!user && (
            <button
              type="button"
              onClick={handleFork}
              disabled={forking}
              className="text-sm font-medium text-accent-600 hover:text-accent-700 disabled:opacity-50 dark:hover:text-accent-400"
            >
              {forking ? "Forking..." : "Fork"}
            </button>
          )}
          {recipe.isOwner && (
            <>
              <Link
                to="/recipes/$recipeId/edit"
                params={{ recipeId: recipe.id }}
                className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
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
            </>
          )}
        </div>
      </div>
      <span className="mt-4 block text-xs font-medium uppercase tracking-wide text-accent-600">
        {recipe.visibility}
      </span>
      {recipe.isOwner && (
        <div className="mt-3">
          <ShareControl
            shareUrl={recipe.shareUrl}
            disabled={recipe.visibility === "private"}
            onShare={handleShare}
            onRevoke={handleRevoke}
          />
        </div>
      )}
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">{recipe.title}</h1>
      {recipe.owner.username ? (
        <Link
          to="/u/$username"
          params={{ username: recipe.owner.username }}
          className="mt-1 inline-block text-sm text-ink/60 hover:text-accent-600 dark:hover:text-accent-400"
        >
          by {recipe.owner.name}
        </Link>
      ) : (
        <p className="mt-1 text-sm text-ink/60">by {recipe.owner.name}</p>
      )}
      {recipe.forkedFrom && (
        <p className="mt-1 text-sm text-ink/60">
          Forked from{" "}
          <Link
            to="/recipes/$recipeId"
            params={{ recipeId: recipe.forkedFrom.id }}
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            {recipe.forkedFrom.title}
          </Link>{" "}
          by {recipe.forkedFrom.owner.name}
        </p>
      )}
      {recipe.description && <p className="mt-2 text-ink/70">{recipe.description}</p>}

      {recipe.photoUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          {recipe.photoUrls.map((url, i) => (
            <img
              key={url}
              src={url}
              alt={`${recipe.title} photo ${i + 1}`}
              className={`w-full rounded-xl object-cover shadow-sm ${
                recipe.photoUrls.length === 1 ? "col-span-2" : ""
              }`}
            />
          ))}
        </div>
      )}

      {recipe.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <span key={tag} className="rounded-full bg-accent-50 px-3 py-1 text-sm text-ink/70">
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
        <ol className="mt-2 list-inside list-decimal space-y-3 text-ink/80">
          {recipe.steps.map((step, i) => (
            <li key={i}>
              {step.text}
              {step.imageUrls.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {step.imageUrls.map((url, j) => (
                    <img
                      key={url}
                      src={url}
                      alt={`Step ${i + 1} photo ${j + 1}`}
                      className="max-h-48 rounded-lg object-cover shadow-sm"
                    />
                  ))}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <RecipeRating
        recipeId={recipe.id}
        average={rating.average}
        count={rating.count}
        myRating={rating.myRating}
        canRate={!!user}
      />

      <SaveToList recipeId={recipe.id} collections={collections} canSave={!!user} />

      <AddToGroceryList recipeId={recipe.id} groceryLists={groceryLists} canSave={!!user} />

      {recipe.forks.length > 0 && (
        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-ink">
            Forked {recipe.forks.length} time{recipe.forks.length === 1 ? "" : "s"}
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {recipe.forks.map((fork) => (
              <li key={fork.id}>
                <RecipeCard recipe={fork} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <CommentThread recipeId={recipe.id} comments={comments} canComment={!!user} />
    </div>
  );
}
