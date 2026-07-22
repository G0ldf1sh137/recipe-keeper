import { useState } from "react";
import { createFileRoute, Link, redirect, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { getSessionUser } from "#/auth/auth.functions";
import { getMyHouseholdInfo } from "#/households/households.functions";
import { listMyCalendars } from "#/calendars/calendars.functions";
import { listMyHouseholdPolls, createPoll, deletePoll } from "#/polls/polls.functions";

// targetDate is a calendar date with no meaningful time-of-day component, so
// it's always read with UTC getters — local-timezone getters would shift the
// displayed day backward/forward depending on the viewer's timezone.
function formatTargetDate(date: Date) {
  return `${dayLabels[date.getUTCDay()]}, ${date.getUTCMonth() + 1}/${date.getUTCDate()}/${date.getUTCFullYear()}`;
}

// UTC-anchored "today", matching the same convention as formatTargetDate —
// used as the date input's min so the picker can't be scrolled into the past.
function todayUTCDateString() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const dayLabels: Record<number, string> = {
  0: "Sunday",
  1: "Monday",
  2: "Tuesday",
  3: "Wednesday",
  4: "Thursday",
  5: "Friday",
  6: "Saturday",
};

export const Route = createFileRoute("/polls/")({
  beforeLoad: async () => {
    const user = await getSessionUser();
    if (!user) throw redirect({ to: "/login" });
    if (!user.isAdmin && !user.isSubscriber) {
      throw redirect({ to: "/subscribers-only", search: { feature: "polls" } });
    }
  },
  loader: async () => {
    const [polls, household, calendars, user] = await Promise.all([
      listMyHouseholdPolls(),
      getMyHouseholdInfo(),
      listMyCalendars(),
      getSessionUser(),
    ]);
    return { polls, household, calendars, userId: user!.id };
  },
  component: PollsPage,
});

function PollsPage() {
  const { polls, household, calendars, userId } = Route.useLoaderData();
  const router = useRouter();
  const createFn = useServerFn(createPoll);
  const deleteFn = useServerFn(deletePoll);

  const [title, setTitle] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [targetCalendarId, setTargetCalendarId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !targetDate) return;
    setCreating(true);
    setCreateError(null);
    try {
      await createFn({
        data: { title: title.trim(), targetDate: new Date(targetDate), targetCalendarId: targetCalendarId || undefined },
      });
      setTitle("");
      setTargetDate("");
      setTargetCalendarId("");
      await router.invalidate();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Couldn't create that poll.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(pollId: string, pollTitle: string) {
    if (!window.confirm(`Delete "${pollTitle}"? This can't be undone.`)) return;
    await deleteFn({ data: { id: pollId } });
    await router.invalidate();
  }

  return (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">Dinner Polls</h1>
      <p className="mt-2 text-ink/70">
        Propose a recipe poll for a specific night. Your household votes, one vote each.
      </p>

      {!household ? (
        <p className="mt-6 text-ink/60">
          You need to be in a household first.{" "}
          <Link to="/pantry" className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400">
            Create or join one from Pantry →
          </Link>
        </p>
      ) : (
        <>
          <form onSubmit={handleCreate} className="mt-6 flex flex-col gap-3 rounded-xl border-2 border-accent-200 bg-surface p-4">
            <input
              className="rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="What's the poll for? e.g. Tuesday dinner?"
            />
            <div className="flex flex-wrap gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-ink/70">Date</span>
                <input
                  type="date"
                  min={todayUTCDateString()}
                  className="rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-sm font-medium text-ink/70">Add winner to Meal Week (optional)</span>
                <select
                  className="rounded-lg border border-accent-100 bg-surface px-3 py-2 text-ink focus:border-accent-400 focus:outline-none"
                  value={targetCalendarId}
                  onChange={(e) => setTargetCalendarId(e.target.value)}
                >
                  <option value="">Don't auto-schedule</option>
                  {calendars.map((calendar) => (
                    <option key={calendar.id} value={calendar.id}>
                      {calendar.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {createError && <p className="text-sm text-red-600">{createError}</p>}
            <button
              type="submit"
              disabled={creating || !title.trim() || !targetDate}
              className="self-start rounded-lg bg-accent-600 px-4 py-2 font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
            >
              {creating ? "Creating..." : "Create poll"}
            </button>
          </form>

          {polls.length === 0 ? (
            <p className="mt-6 text-ink/60">No Dinner Polls yet. Create one above.</p>
          ) : (
            <ul className="mt-6 flex flex-col gap-3">
              {polls.map((poll) => {
                const date = new Date(poll.targetDate);
                const canDelete = poll.status === "closed" && poll.createdBy === userId;
                return (
                  <li
                    key={poll.id}
                    className="rounded-xl border-2 border-accent-200 bg-surface shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
                  >
                    <Link to="/polls/$pollId" params={{ pollId: poll.id }} className="block px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-serif text-lg font-medium text-ink">{poll.title}</span>
                        <span className="text-xs font-medium uppercase tracking-wide text-ink/40">
                          {poll.status}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-ink/50">
                        {formatTargetDate(date)} · {poll.optionCount} option
                        {poll.optionCount === 1 ? "" : "s"} · {poll.voteCount} vote{poll.voteCount === 1 ? "" : "s"}
                      </p>
                      {poll.winningRecipeTitle && (
                        <p className="mt-1 text-sm font-medium text-accent-600">Winner: {poll.winningRecipeTitle}</p>
                      )}
                    </Link>
                    {canDelete && (
                      <div className="border-t border-accent-100 px-4 py-2">
                        <button
                          type="button"
                          onClick={() => handleDelete(poll.id, poll.title)}
                          className="text-sm font-medium text-red-600 hover:text-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}
