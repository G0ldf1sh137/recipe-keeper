import { createFileRoute, Link, notFound, redirect } from "@tanstack/react-router";
import { resolveSharedToken } from "#/sharing/sharing.functions";

export const Route = createFileRoute("/shared/$token")({
  loader: async ({ params }) => {
    const target = await resolveSharedToken({ data: { token: params.token } });
    if (!target) throw notFound();
    if (target.type === "recipe") {
      throw redirect({
        to: "/recipes/$recipeId",
        params: { recipeId: target.id },
        search: { st: params.token },
      });
    }
    throw redirect({
      to: "/collections/$collectionId",
      params: { collectionId: target.id },
      search: { st: params.token },
    });
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">Link not found</h1>
      <p className="mt-2 text-ink/60">
        This share link is invalid or has been revoked.{" "}
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
