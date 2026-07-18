import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getFollowing } from "#/follows/follows.functions";

export const Route = createFileRoute("/u/$username/following")({
  loader: async ({ params }) => getFollowing({ data: { username: params.username } }),
  component: FollowingPage,
});

function FollowingPage() {
  const { profileName, following } = Route.useLoaderData();
  const { username } = Route.useParams();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredFollowing = following.filter(
    (followed) => followed.name.toLowerCase().includes(q) || followed.username?.toLowerCase().includes(q),
  );

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <Link
        to="/u/$username"
        params={{ username }}
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← {profileName}
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink">Following</h1>

      {following.length > 0 && (
        <input
          className="mt-6 w-full rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search following"
        />
      )}

      {following.length === 0 ? (
        <p className="mt-6 text-ink/60">Not following anyone yet.</p>
      ) : filteredFollowing.length === 0 ? (
        <p className="mt-6 text-ink/60">No matches for "{query}".</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {filteredFollowing.map((followed) => (
            <li
              key={followed.id}
              className="flex items-center gap-3 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              {followed.avatarUrl && (
                <img src={followed.avatarUrl} alt="" loading="lazy" className="h-10 w-10 rounded-full" />
              )}
              <div className="flex flex-col">
                {followed.username ? (
                  <Link
                    to="/u/$username"
                    params={{ username: followed.username }}
                    className="font-serif text-lg font-medium text-ink hover:text-accent-600 dark:hover:text-accent-400"
                  >
                    {followed.name}
                  </Link>
                ) : (
                  <span className="font-serif text-lg font-medium text-ink">{followed.name}</span>
                )}
                {followed.username && <span className="text-sm text-ink/60">@{followed.username}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
