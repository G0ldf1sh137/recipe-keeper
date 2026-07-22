import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Vote } from "lucide-react";
import { addPollOption } from "./polls.functions";
import { DropdownButton } from "#/ui/DropdownButton";

type PollOption = { id: string; title: string; targetDate: string | Date; hasOption: boolean };

// targetDate is a calendar date with no meaningful time-of-day component, so
// it's always read with UTC getters — local-timezone getters would shift the
// displayed day backward/forward depending on the viewer's timezone.
function formatTargetDate(date: Date) {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

export function AddToDinnerPoll({
  recipeId,
  polls,
  canSave,
  isLoggedIn = true,
}: {
  recipeId: string;
  polls: PollOption[];
  canSave: boolean;
  isLoggedIn?: boolean;
}) {
  const router = useRouter();
  const addFn = useServerFn(addPollOption);

  async function handleAdd(pollId: string) {
    await addFn({ data: { pollId, recipeId } });
    await router.invalidate();
  }

  if (!canSave) {
    return isLoggedIn ? (
      <Link
        to="/subscribers-only"
        search={{ feature: "polls" }}
        className="flex items-center gap-1.5 rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-accent-50"
      >
        <Vote size={16} />
        Dinner Poll
      </Link>
    ) : (
      <a
        href="/auth/google"
        className="flex items-center gap-1.5 rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-accent-50"
      >
        <Vote size={16} />
        Dinner Poll
      </a>
    );
  }

  return (
    <DropdownButton label="Dinner Poll" icon={<Vote size={16} />}>
      {polls.length > 0 ? (
        <div className="flex flex-col gap-2">
          {polls.map((poll) => (
            <div key={poll.id} className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-medium text-ink">{poll.title}</p>
                <p className="text-xs text-ink/50">{formatTargetDate(new Date(poll.targetDate))}</p>
              </div>
              <button
                type="button"
                onClick={() => handleAdd(poll.id)}
                disabled={poll.hasOption}
                className={
                  poll.hasOption
                    ? "shrink-0 rounded-full bg-accent-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                    : "shrink-0 rounded-full border-2 border-accent-300 px-3 py-1 text-sm font-medium text-ink hover:bg-accent-50"
                }
              >
                {poll.hasOption ? "✓ Added" : "Add"}
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-ink/60">No open Dinner Polls in your household yet.</p>
      )}

      <Link
        to="/polls"
        className={`text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400 ${polls.length > 0 ? "mt-3" : ""} block`}
      >
        + New Dinner Poll
      </Link>
    </DropdownButton>
  );
}
