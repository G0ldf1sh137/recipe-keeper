import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getRecipe,
  getRelatedRecipes,
  deleteRecipe,
  createRecipeShare,
  revokeRecipeShare,
  forkRecipe,
} from "#/recipes/recipes.functions";
import { RecipeCard } from "#/recipes/RecipeCard";
import { RecipeCardSkeleton } from "#/recipes/RecipeCardSkeleton";
import { getSessionUser } from "#/auth/auth.functions";
import { CommentThread } from "#/comments/CommentThread";
import { getRatingSummary, getRatingSummaries } from "#/ratings/ratings.functions";
import { RecipeRating } from "#/ratings/RecipeRating";
import { getMakeCount } from "#/makes/makes.functions";
import { MadeItButton } from "#/makes/MadeItButton";
import { FollowButton } from "#/follows/FollowButton";
import { getCollectionsForRecipe } from "#/collections/collections.functions";
import { SaveToList } from "#/collections/SaveToList";
import { getGroceryListsForRecipe, getGroceryItemPresence } from "#/grocery/grocery.functions";
import { AddToGroceryList } from "#/grocery/AddToGroceryList";
import { AddIngredientToGroceryList, presenceKey } from "#/grocery/AddIngredientToGroceryList";
import { getCalendarsForRecipe } from "#/calendars/calendars.functions";
import { AddToCalendar } from "#/calendars/AddToCalendar";
import { AddIngredientToPantry } from "#/pantry/AddIngredientToPantry";
import { getCombinedPantryNames } from "#/pantry/pantry.functions";
import { getMyNote } from "#/notes/notes.functions";
import { NoteEditor } from "#/notes/NoteEditor";
import { ShareControl } from "#/sharing/ShareControl";
import { reportRecipe } from "#/reports/reports.functions";
import { ReportButton } from "#/reports/ReportButton";
import { scaleQuantity } from "#/recipes/quantity";
import { useRecipeScale } from "#/recipes/useRecipeScale";
import { ScaleToggle } from "#/recipes/ScaleToggle";
import { ImageModal } from "#/ui/ImageModal";
import { buildRecipeJsonLd, stringifyJsonLd } from "#/recipes/recipeJsonLd";

const recipeSearchSchema = z.object({ st: z.string().optional() });

function sourceUrlHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

export const Route = createFileRoute("/recipes/$recipeId/")({
  validateSearch: recipeSearchSchema,
  loaderDeps: ({ search }) => ({ shareToken: search.st }),
  loader: async ({ params, deps }) => {
    const [recipe, user, rating, makeCount] = await Promise.all([
      getRecipe({ data: { id: params.recipeId, shareToken: deps.shareToken } }),
      getSessionUser(),
      getRatingSummary({ data: { recipeId: params.recipeId, shareToken: deps.shareToken } }),
      getMakeCount({ data: { recipeId: params.recipeId, shareToken: deps.shareToken } }),
    ]);
    const isSubscriber = !!user && (user.isAdmin || user.isSubscriber);
    const [collections, note] = user
      ? await Promise.all([
          getCollectionsForRecipe({ data: { recipeId: params.recipeId } }),
          getMyNote({ data: { recipeId: params.recipeId } }),
        ])
      : [[], null];
    const [groceryLists, calendars] = isSubscriber
      ? await Promise.all([
          getGroceryListsForRecipe({ data: { recipeId: params.recipeId } }),
          getCalendarsForRecipe({ data: { recipeId: params.recipeId } }),
        ])
      : [[], []];
    return { recipe, user, rating, makeCount, collections, groceryLists, calendars, note, isSubscriber };
  },
  component: RecipePage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
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
  const { recipe, user, rating, makeCount, collections, groceryLists, calendars, note, isSubscriber } =
    Route.useLoaderData();
  const { st: shareToken } = Route.useSearch();
  const navigate = useNavigate();
  const router = useRouter();
  const deleteRecipeFn = useServerFn(deleteRecipe);
  const createShareFn = useServerFn(createRecipeShare);
  const revokeShareFn = useServerFn(revokeRecipeShare);
  const forkRecipeFn = useServerFn(forkRecipe);
  const reportRecipeFn = useServerFn(reportRecipe);
  const getRelatedRecipesFn = useServerFn(getRelatedRecipes);
  const getRatingSummariesFn = useServerFn(getRatingSummaries);
  const getCombinedPantryNamesFn = useServerFn(getCombinedPantryNames);
  const getGroceryItemPresenceFn = useServerFn(getGroceryItemPresence);
  const [deleting, setDeleting] = useState(false);
  const [forking, setForking] = useState(false);
  const { scale, setScale, customInput, handleCustomInputChange, activeFactor, isUnscaled } = useRecipeScale();
  const [zoomedImage, setZoomedImage] = useState<{ src: string; alt: string } | null>(null);

  const [related, setRelated] = useState<Awaited<ReturnType<typeof getRelatedRecipes>> | null>(null);
  const [similarRatings, setSimilarRatings] = useState<Awaited<ReturnType<typeof getRatingSummaries>>>({});
  const [pantryNames, setPantryNames] = useState<Set<string> | null>(null);
  const [groceryPresence, setGroceryPresence] = useState<Set<string> | null>(null);

  const cancelledRef = useRef(false);

  useEffect(() => {
    cancelledRef.current = false;
    setRelated(null);
    setSimilarRatings({});
    void getRelatedRecipesFn({
      data: {
        recipeId: recipe.id,
        tags: recipe.tags,
        ingredientNames: recipe.ingredients.map((i) => i.name),
      },
    }).then((result) => {
      if (cancelledRef.current) return;
      setRelated(result);
      void getRatingSummariesFn({
        data: { recipeIds: result.similarRecipes.map((r) => r.id) },
      }).then((summaries) => {
        if (cancelledRef.current) return;
        setSimilarRatings(summaries);
      });
    });
    return () => {
      cancelledRef.current = true;
    };
  }, [recipe.id, recipe.tags, recipe.ingredients, getRelatedRecipesFn, getRatingSummariesFn]);

  useEffect(() => {
    if (!isSubscriber) return;
    let cancelled = false;
    setPantryNames(null);
    setGroceryPresence(null);
    void getCombinedPantryNamesFn().then((names) => {
      if (cancelled) return;
      setPantryNames(new Set(names.map((n) => n.trim().toLowerCase())));
    });
    void getGroceryItemPresenceFn().then((rows) => {
      if (cancelled) return;
      setGroceryPresence(new Set(rows.map((row) => presenceKey(row.listId, row.name, row.unit))));
    });
    return () => {
      cancelled = true;
    };
  }, [recipe.id, isSubscriber, getCombinedPantryNamesFn, getGroceryItemPresenceFn]);

  async function handleFork() {
    setForking(true);
    try {
      const fork = await forkRecipeFn({ data: { recipeId: recipe.id, shareToken } });
      await navigate({ to: "/recipes/$recipeId/edit", params: { recipeId: fork.id } });
    } finally {
      setForking(false);
    }
  }

  async function handleShare() {
    await createShareFn({ data: { recipeId: recipe.id } });
    await router.invalidate();
  }

  async function handleReport(reason: string) {
    await reportRecipeFn({ data: { recipeId: recipe.id, reason } });
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
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      {recipe.visibility === "public" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: stringifyJsonLd(buildRecipeJsonLd(recipe)) }}
        />
      )}
      <div className="flex items-center justify-between">
        <Link
          to="/"
          className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          ← Back home
        </Link>
        <div className="flex gap-3">
          <Link
            to="/recipes/$recipeId/cook"
            params={{ recipeId: recipe.id }}
            search={{ st: shareToken }}
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            LemmeCook mode
          </Link>
          <a
            href={`/recipes/${recipe.id}/pdf${shareToken ? `?st=${shareToken}` : ""}`}
            className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Print to PDF
          </a>
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
          {!!user && !recipe.isOwner && <ReportButton onReport={handleReport} />}
          {recipe.canEdit && (
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
      {!recipe.isOwner && recipe.canEdit && (
        <p className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-sm font-medium text-accent-700">
          Viewing as admin — you aren't the owner of this recipe.
        </p>
      )}
      <h1 className="font-serif text-4xl font-semibold tracking-tight text-ink">{recipe.title}</h1>

      <RecipeRating
        recipeId={recipe.id}
        average={rating.average}
        count={rating.count}
        myRating={rating.myRating}
        canRate={!!user}
      />

      <MadeItButton
        recipeId={recipe.id}
        count={makeCount}
        ingredientNames={[...new Set(recipe.ingredients.map((ing) => ing.name))]}
        canMake={!!user}
        isSubscriber={isSubscriber}
      />

      <div className="mt-1 flex items-center gap-1.5">
        {recipe.owner.avatarUrl && (
          <img src={recipe.owner.avatarUrl} alt="" loading="lazy" className="h-5 w-5 rounded-full" />
        )}
        {recipe.owner.username ? (
          <Link
            to="/u/$username"
            params={{ username: recipe.owner.username }}
            className="inline-block text-sm text-ink/60 hover:text-accent-600 dark:hover:text-accent-400"
          >
            by {recipe.owner.name}
          </Link>
        ) : (
          <p className="text-sm text-ink/60">by {recipe.owner.name}</p>
        )}
        {recipe.canFollowOwner && (
          <FollowButton targetUserId={recipe.ownerId} initiallyFollowing={recipe.isFollowingOwner} />
        )}
      </div>
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

      {(recipe.yield || recipe.calories) && (
        <p className="mt-2 text-sm text-ink/60">
          {[recipe.yield, recipe.calories ? `${recipe.calories} cal/serving` : null]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {(recipe.protein || recipe.carbs || recipe.fat) && (
        <p className="mt-2 text-sm text-ink/60">
          {[
            recipe.protein ? `${recipe.protein}g protein` : null,
            recipe.carbs ? `${recipe.carbs}g carbs` : null,
            recipe.fat ? `${recipe.fat}g fat` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      {recipe.sourceUrl && (
        <p className="mt-2 text-sm text-ink/60">
          Originally from{" "}
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            {sourceUrlHostname(recipe.sourceUrl)} ↗
          </a>
        </p>
      )}

      {recipe.sourcePdfUrl && (
        <p className="mt-2 text-sm text-ink/60">
          <a
            href={recipe.sourcePdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            📄 View recipe PDF ↗
          </a>
        </p>
      )}

      {recipe.photoUrls.length > 0 && (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {recipe.photoUrls.map((url, i) => {
            const alt = `${recipe.title} photo ${i + 1}`;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setZoomedImage({ src: url, alt })}
                className={recipe.photoUrls.length === 1 ? "col-span-2" : ""}
              >
                <img
                  src={url}
                  alt={alt}
                  loading="lazy"
                  className="w-full cursor-zoom-in rounded-xl object-cover shadow-sm"
                />
              </button>
            );
          })}
        </div>
      )}

      {recipe.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {recipe.tags.map((tag) => (
            <Link
              key={tag}
              to="/recipes"
              search={{ q: tag }}
              className="rounded-full bg-accent-50 px-3 py-1 text-sm text-ink/70 hover:bg-accent-100"
            >
              {tag}
            </Link>
          ))}
        </div>
      )}

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-serif text-xl font-semibold text-ink">Ingredients</h2>
          <ScaleToggle
            scale={scale}
            onScaleChange={setScale}
            customInput={customInput}
            onCustomInputChange={handleCustomInputChange}
          />
        </div>
        <ul className="mt-2 flex flex-col gap-1 text-ink/80">
          {recipe.ingredients.map((ing, i) => {
            const displayQty = isUnscaled ? ing.qty : scaleQuantity(ing.qty, activeFactor);
            return (
              <li key={i} className="flex list-inside list-disc items-center justify-between gap-2">
                <span className="list-item">{[displayQty, ing.unit, ing.name].filter(Boolean).join(" ")}</span>
                {isSubscriber && (
                  <span className="flex shrink-0 gap-1.5">
                    <AddIngredientToPantry
                      name={ing.name}
                      initiallyInPantry={pantryNames?.has(ing.name.trim().toLowerCase()) ?? false}
                      loading={pantryNames === null}
                    />
                    <AddIngredientToGroceryList
                      qty={displayQty}
                      unit={ing.unit}
                      name={ing.name}
                      groceryLists={groceryLists}
                      presence={groceryPresence ?? new Set()}
                      loading={groceryPresence === null}
                    />
                  </span>
                )}
              </li>
            );
          })}
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
                  {step.imageUrls.map((url, j) => {
                    const alt = `Step ${i + 1} photo ${j + 1}`;
                    return (
                      <button key={j} type="button" onClick={() => setZoomedImage({ src: url, alt })}>
                        <img
                          src={url}
                          alt={alt}
                          loading="lazy"
                          className="max-h-48 cursor-zoom-in rounded-lg object-cover shadow-sm"
                        />
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Add this recipe to...</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <SaveToList recipeId={recipe.id} collections={collections} canSave={!!user} />
          <AddToGroceryList
            recipeId={recipe.id}
            groceryLists={groceryLists}
            canSave={isSubscriber}
            isLoggedIn={!!user}
          />
          <AddToCalendar
            recipeId={recipe.id}
            calendars={calendars}
            canSave={isSubscriber}
            isLoggedIn={!!user}
            weekStartDay={user?.weekStartDay ?? "sun"}
          />
        </div>
      </section>

      <NoteEditor recipeId={recipe.id} initialText={note?.text ?? ""} canEdit={!!user} />

      {(related === null || related.forks.length > 0) && (
        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-ink">
            {related
              ? `Forked ${related.forks.length} time${related.forks.length === 1 ? "" : "s"}`
              : "Forked recipes"}
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {related === null
              ? [0, 1].map((i) => (
                  <li key={i}>
                    <RecipeCardSkeleton />
                  </li>
                ))
              : related.forks.map((fork) => (
                  <li key={fork.id}>
                    <RecipeCard recipe={fork} />
                  </li>
                ))}
          </ul>
        </section>
      )}

      {(related === null || related.similarRecipes.length > 0) && (
        <section className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-ink">Similar recipes</h2>
          <ul className="mt-3 flex flex-col gap-3">
            {related === null
              ? [0, 1].map((i) => (
                  <li key={i}>
                    <RecipeCardSkeleton />
                  </li>
                ))
              : related.similarRecipes.map((similar) => (
                  <li key={similar.id}>
                    <RecipeCard recipe={similar} rating={similarRatings[similar.id]} />
                  </li>
                ))}
          </ul>
        </section>
      )}

      <CommentThread
        recipeId={recipe.id}
        shareToken={shareToken}
        canComment={!!user}
        currentUserId={user?.id}
        isAdmin={!!user?.isAdmin}
      />

      <ImageModal image={zoomedImage} onClose={() => setZoomedImage(null)} />
    </div>
  );
}
