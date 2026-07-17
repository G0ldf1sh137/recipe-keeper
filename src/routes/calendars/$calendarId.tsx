import { useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  getCalendar,
  renameCalendar,
  deleteCalendar,
  removeRecipeFromCalendarDay,
  moveCalendarEntry,
  createCalendarShare,
  revokeCalendarShare,
  updateCalendarVisibility,
} from "#/calendars/calendars.functions";
import { ShareControl } from "#/sharing/ShareControl";
import { getSessionUser } from "#/auth/auth.functions";
import { listMyGroceryLists } from "#/grocery/grocery.functions";
import { AddCalendarToGroceryList } from "#/grocery/AddCalendarToGroceryList";
import { visibilityValues, dayOfWeekValues } from "#/db/schema";
import type { Visibility, DayOfWeek } from "#/db/schema";

const dayLabels: Record<DayOfWeek, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

const calendarSearchSchema = z.object({ st: z.string().optional() });

export const Route = createFileRoute("/calendars/$calendarId")({
  validateSearch: calendarSearchSchema,
  loaderDeps: ({ search }) => ({ shareToken: search.st }),
  loader: async ({ params, deps }) => {
    const [{ calendar, entriesByDay }, user] = await Promise.all([
      getCalendar({ data: { id: params.calendarId, shareToken: deps.shareToken } }),
      getSessionUser(),
    ]);
    const groceryLists = user ? await listMyGroceryLists() : [];
    return { calendar, entriesByDay, user, groceryLists };
  },
  component: CalendarPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-4 sm:p-8">
      <h1 className="font-serif text-2xl font-semibold text-ink">Calendar not found</h1>
      <p className="mt-2 text-ink/60">
        This calendar doesn't exist, or isn't shared with you.{" "}
        <Link
          to="/calendars"
          className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
        >
          Back to your calendars
        </Link>
      </p>
    </div>
  ),
});

function CalendarPage() {
  const { calendar, entriesByDay, user, groceryLists } = Route.useLoaderData();
  const { st: shareToken } = Route.useSearch();
  const router = useRouter();
  const navigate = useNavigate();
  const renameFn = useServerFn(renameCalendar);
  const deleteFn = useServerFn(deleteCalendar);
  const removeFn = useServerFn(removeRecipeFromCalendarDay);
  const moveFn = useServerFn(moveCalendarEntry);
  const createShareFn = useServerFn(createCalendarShare);
  const revokeShareFn = useServerFn(revokeCalendarShare);
  const updateVisibilityFn = useServerFn(updateCalendarVisibility);

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(calendar.name);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await renameFn({ data: { id: calendar.id, name: name.trim() } });
    setEditing(false);
    await router.invalidate();
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${calendar.name}"? This can't be undone.`)) return;
    await deleteFn({ data: { id: calendar.id } });
    await navigate({ to: "/calendars" });
  }

  async function handleRemove(entryId: string) {
    await removeFn({ data: { calendarId: calendar.id, entryId } });
    await router.invalidate();
  }

  async function handleMove(entryId: string, direction: "up" | "down") {
    await moveFn({ data: { calendarId: calendar.id, entryId, direction } });
    await router.invalidate();
  }

  async function handleVisibilityChange(visibility: Visibility) {
    await updateVisibilityFn({ data: { id: calendar.id, visibility } });
    await router.invalidate();
  }

  async function handleShare() {
    await createShareFn({ data: { calendarId: calendar.id } });
    await router.invalidate();
  }

  async function handleRevokeShare() {
    await revokeShareFn({ data: { calendarId: calendar.id } });
    await router.invalidate();
  }

  return (
    <div className="mx-auto max-w-4xl p-4 sm:p-8">
      <Link
        to="/calendars"
        className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
      >
        ← Your calendars
      </Link>

      <div className="mt-4 flex items-center justify-between">
        {editing ? (
          <form onSubmit={handleRename} className="flex flex-1 gap-2">
            <input
              className="flex-1 rounded-lg border border-accent-100 px-3 py-2 focus:border-accent-400 focus:outline-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
            <button
              type="submit"
              className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setName(calendar.name);
              }}
              className="text-sm text-ink/50 hover:text-ink"
            >
              Cancel
            </button>
          </form>
        ) : (
          <>
            <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">{calendar.name}</h1>
            {calendar.canManage && (
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
                >
                  Rename
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  className="text-sm font-medium text-red-600 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {!calendar.isOwner && calendar.canManage && (
        <p className="mt-3 rounded-lg bg-accent-50 px-3 py-2 text-sm font-medium text-accent-700">
          Viewing as admin — you aren't the owner of this calendar.
        </p>
      )}

      {calendar.canManage ? (
        <div className="mt-3 flex flex-col gap-3">
          <label className="flex items-center gap-2 text-sm">
            <span className="font-medium text-ink/70">Visibility</span>
            <select
              className="rounded-lg border border-accent-100 px-2 py-1 text-sm focus:border-accent-400 focus:outline-none"
              value={calendar.visibility}
              onChange={(e) => handleVisibilityChange(e.target.value as Visibility)}
            >
              {visibilityValues.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </label>
          {calendar.isOwner && (
            <ShareControl
              shareUrl={calendar.shareUrl}
              disabled={calendar.visibility === "private"}
              onShare={handleShare}
              onRevoke={handleRevokeShare}
            />
          )}
        </div>
      ) : (
        <span className="mt-3 block text-xs font-medium uppercase tracking-wide text-accent-600">
          {calendar.visibility}
        </span>
      )}

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-7">
        {dayOfWeekValues.map((day) => (
          <div key={day} className="rounded-xl border-2 border-accent-200 bg-surface p-3">
            <h2 className="font-serif text-sm font-semibold text-ink">{dayLabels[day]}</h2>
            {entriesByDay[day].length === 0 ? (
              <p className="mt-2 text-xs text-ink/40">No recipes</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {entriesByDay[day].map((entry, index) => (
                  <li key={entry.entryId} className="flex items-start justify-between gap-1">
                    <Link
                      to="/recipes/$recipeId"
                      params={{ recipeId: entry.recipeId }}
                      className="text-sm font-medium text-ink hover:text-accent-600"
                    >
                      {entry.title}
                    </Link>
                    {calendar.canManage && (
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleMove(entry.entryId, "up")}
                          disabled={index === 0}
                          aria-label="Move up"
                          className="text-base font-medium text-accent-600 hover:text-accent-700 disabled:opacity-30"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => handleMove(entry.entryId, "down")}
                          disabled={index === entriesByDay[day].length - 1}
                          aria-label="Move down"
                          className="text-base font-medium text-accent-600 hover:text-accent-700 disabled:opacity-30"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(entry.entryId)}
                          aria-label="Remove"
                          className="text-base font-medium text-red-600 hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      <AddCalendarToGroceryList
        calendarId={calendar.id}
        shareToken={shareToken}
        groceryLists={groceryLists}
        canSave={!!user}
      />
    </div>
  );
}
