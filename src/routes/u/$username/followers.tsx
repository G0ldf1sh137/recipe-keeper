import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { getFollowers } from "#/follows/follows.functions";

export const Route = createFileRoute("/u/$username/followers")({
  loader: async ({ params }) => getFollowers({ data: { username: params.username } }),
  component: FollowersPage,
});

function FollowersPage() {
  const { profileName, followers } = Route.useLoaderData();
  const { username } = Route.useParams();
  const [query, setQuery] = useState("");

  const q = query.trim().toLowerCase();
  const filteredFollowers = followers.filter(
    (follower) => follower.name.toLowerCase().includes(q) || follower.username?.toLowerCase().includes(q),
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
      <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-ink">Followers</h1>

      {followers.length > 0 && (
        <input
          className="mt-6 w-full rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search followers"
        />
      )}

      {followers.length === 0 ? (
        <p className="mt-6 text-ink/60">No followers yet.</p>
      ) : filteredFollowers.length === 0 ? (
        <p className="mt-6 text-ink/60">No followers match "{query}".</p>
      ) : (
        <ul className="mt-6 flex flex-col gap-3">
          {filteredFollowers.map((follower) => (
            <li
              key={follower.id}
              className="flex items-center gap-3 rounded-xl border-2 border-accent-200 bg-surface px-4 py-3 shadow-sm"
            >
              {follower.avatarUrl && (
                <img src={follower.avatarUrl} alt="" loading="lazy" className="h-10 w-10 rounded-full" />
              )}
              <div className="flex flex-col">
                {follower.username ? (
                  <Link
                    to="/u/$username"
                    params={{ username: follower.username }}
                    className="font-serif text-lg font-medium text-ink hover:text-accent-600 dark:hover:text-accent-400"
                  >
                    {follower.name}
                  </Link>
                ) : (
                  <span className="font-serif text-lg font-medium text-ink">{follower.name}</span>
                )}
                {follower.username && <span className="text-sm text-ink/60">@{follower.username}</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
