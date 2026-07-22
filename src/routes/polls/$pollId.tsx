import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Check } from "lucide-react";
import { getPoll, addPollOption, voteOnPoll, closePoll, deletePoll } from "#/polls/polls.functions";
import { searchRecipesByPantryMatch } from "#/pantry/pantry.functions";
import { RecipeCard } from "#/recipes/RecipeCard";

const dayLabels: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

// targetDate is a calendar date with no meaningful time-of-day component, so
// it's always read with UTC getters — local-timezone getters would shift the
// displayed day backward/forward depending on the viewer's timezone.
function formatTargetDate(date: Date) {
  return `${dayLabels[date.getUTCDay()]}, ${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

export const Route = createFileRoute("/polls/$pollId")({
  loader: ({ params }) => getPoll({ data: { id: params.pollId } }),
  component: PollPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">Dinner Poll not found</h1>
      <p className="mt-2 text-ink/60">
        This Dinner Poll doesn't exist, or isn't visible to you.{" "}
        <Link to="/polls" className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400">
          Back to Dinner Polls
        </Link>
      </p>
    </div>
  ),
});

function PollPage() {
  const { poll, isCreator, yourVoteOptionId } = Route.useLoaderData();
  const router = useRouter();
  const navigate = useNavigate();
  const addOptionFn = useServerFn(addPollOption);
  const voteFn = useServerFn(voteOnPoll);
  const closeFn = useServerFn(closePoll);
  const deleteFn = useServerFn(deletePoll);
  const searchFn = useServerFn(searchRecipesByPantryMatch);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Awaited<ReturnType<typeof searchRecipesByPantryMatch>>>([]);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [closing, setClosing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const searchIdRef = useRef(0);

  const isOpen = poll.status === "open";
  const maxVoteCount = Math.max(0, ...poll.options.map((option) => option.voteCount));
  const isTied = !isOpen && !poll.winningOptionId && maxVoteCount > 0;
  const date = new Date(poll.targetDate);

  // Reactive search-as-you-type, debounced so we don't refetch on every
  // keystroke; a request id guards against a slower older request clobbering
  // the result of a newer one.
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }
    const id = ++searchIdRef.current;
    setSearching(true);
    const timeout = window.setTimeout(async () => {
      try {
        const result = await searchFn({ data: { q: trimmed, limit: 10 } });
        if (searchIdRef.current === id) setResults(result);
      } finally {
        if (searchIdRef.current === id) setSearching(false);
      }
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [query, searchFn]);

  async function handleAddOption(recipeId: string) {
    setError(null);
    try {
      await addOptionFn({ data: { pollId: poll.id, recipeId } });
      setResults([]);
      setQuery("");
      await router.invalidate();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't add that recipe.");
    }
  }

  async function handleVote(optionId: string) {
    await voteFn({ data: { pollId: poll.id, optionId } });
    await router.invalidate();
  }

  async function handleClose() {
    if (!window.confirm(`Close "${poll.title}"? This can't be undone.`)) return;
    setClosing(true);
    try {
      await closeFn({ data: { pollId: poll.id } });
      await router.invalidate();
    } finally {
      setClosing(false);
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${poll.title}"? This can't be undone.`)) return;
    setDeleting(true);
    try {
      await deleteFn({ data: { id: poll.id } });
      await navigate({ to: "/polls" });
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link to="/polls" className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400">
        ← Dinner Polls
      </Link>
      <div className="mt-2 flex items-center justify-between">
        <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{poll.title}</h1>
        <span className="text-xs font-medium uppercase tracking-wide text-ink/40">{poll.status}</span>
      </div>
      <p className="mt-1 text-ink/70">
        {formatTargetDate(date)}
        {poll.targetCalendarId && isOpen && " · the winner will be scheduled into your Meal Week automatically"}
      </p>

      {isCreator && isOpen && (
        <button
          type="button"
          onClick={handleClose}
          disabled={closing}
          className="mt-4 rounded-lg border-2 border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {closing ? "Closing..." : "Close poll"}
        </button>
      )}

      {isCreator && !isOpen && (
        <button
          type="button"
          onClick={handleDelete}
          disabled={deleting}
          className="mt-4 rounded-lg border-2 border-red-300 px-4 py-2 font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
        >
          {deleting ? "Deleting..." : "Delete poll"}
        </button>
      )}

      <div className="mt-6 flex flex-col gap-3">
        {poll.options.length === 0 && <p className="text-ink/60">No recipe options yet.</p>}
        {poll.options.map((option) => {
          const isWinner = poll.winningOptionId === option.id;
          const isTiedOption = isTied && option.voteCount === maxVoteCount;
          return (
            <div
              key={option.id}
              className={`rounded-xl border-2 p-1 ${isWinner ? "border-accent-600" : isTiedOption ? "border-rust" : "border-transparent"}`}
            >
              <RecipeCard recipe={option.recipe} />
              <div className="mt-1 flex items-center justify-between px-2 pb-1">
                <span className="text-sm text-ink/50">
                  {option.voteCount} vote{option.voteCount === 1 ? "" : "s"}
                  {option.voters.length > 0 && ` · ${option.voters.map((v) => v.name).join(", ")}`}
                </span>
                <div className="flex items-center gap-2">
                  {isWinner && <span className="text-sm font-medium text-accent-600">Winner</span>}
                  {isTiedOption && <span className="text-sm font-medium text-rust">Tied</span>}
                  {isOpen && (
                    <button
                      type="button"
                      onClick={() => handleVote(option.id)}
                      className={
                        yourVoteOptionId === option.id
                          ? "flex items-center gap-1.5 rounded-full bg-accent-600 px-4 py-1.5 text-sm font-semibold text-white shadow-sm"
                          : "flex items-center gap-1.5 rounded-full border-2 border-accent-400 px-4 py-1.5 text-sm font-semibold text-accent-700 transition-colors hover:bg-accent-600 hover:text-white dark:text-accent-300"
                      }
                    >
                      {yourVoteOptionId === option.id && <Check size={16} />}
                      {yourVoteOptionId === option.id ? "Voted" : "Vote"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {isOpen && (
        <div className="mt-8">
          <h2 className="font-serif text-xl font-semibold text-ink">Add a recipe option</h2>
          <div className="relative mt-3">
            <input
              className="w-full rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search recipes to add..."
            />
            {searching && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ink/40">Searching...</span>
            )}
          </div>
          {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
          {results.length > 0 && (
            <ul className="mt-3 flex flex-col gap-2">
              {results.map((recipe) => (
                <li
                  key={recipe.id}
                  className="flex items-center justify-between rounded-lg border border-accent-100 px-3 py-2"
                >
                  <div>
                    <span className="text-ink">{recipe.title}</span>
                    <span className="ml-2 text-sm text-ink/50">
                      {recipe.matchedIngredients}/{recipe.totalIngredients} ingredients on hand
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddOption(recipe.id)}
                    className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                  >
                    Add as option
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
