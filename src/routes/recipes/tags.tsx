import { createFileRoute, Link } from "@tanstack/react-router";
import { getTagCounts } from "#/recipes/recipes.functions";

export const Route = createFileRoute("/recipes/tags")({
  loader: async () => getTagCounts(),
  component: TagsPage,
});

function TagsPage() {
  const tagCounts = Route.useLoaderData();

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/recipes"
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Back to recipes
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink">Browse tags</h1>

      {tagCounts.length === 0 ? (
        <p className="mt-6 text-ink/60">No tags yet.</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-2">
          {tagCounts.map(({ tag, count }) => (
            <li key={tag}>
              <Link
                to="/recipes"
                search={{ tags: tag }}
                className="flex items-center justify-between rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="font-medium text-ink">{tag}</span>
                <span className="text-sm text-ink/50">
                  {count} recipe{count === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
