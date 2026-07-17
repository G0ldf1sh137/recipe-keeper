import { useState } from "react";
import { useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { createCalendar, addRecipeToCalendarDay, removeRecipeFromCalendarDay } from "./calendars.functions";
import { dayOfWeekValues } from "#/db/schema";
import type { DayOfWeek } from "#/db/schema";

const dayLabels: Record<DayOfWeek, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

type CalendarEntry = { entryId: string; dayOfWeek: DayOfWeek };
type CalendarOption = { id: string; name: string; entries: CalendarEntry[] };

export function AddToCalendar({
  recipeId,
  calendars,
  canSave,
}: {
  recipeId: string;
  calendars: CalendarOption[];
  canSave: boolean;
}) {
  const router = useRouter();
  const addFn = useServerFn(addRecipeToCalendarDay);
  const removeFn = useServerFn(removeRecipeFromCalendarDay);
  const createFn = useServerFn(createCalendar);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [newDay, setNewDay] = useState<DayOfWeek>("mon");
  const [dayByCalendar, setDayByCalendar] = useState<Record<string, DayOfWeek>>({});
  const [busy, setBusy] = useState<string | null>(null);

  function dayFor(calendarId: string) {
    return dayByCalendar[calendarId] ?? "mon";
  }

  async function handleAdd(calendarId: string) {
    setBusy(`${calendarId}:new`);
    try {
      await addFn({ data: { calendarId, recipeId, dayOfWeek: dayFor(calendarId) } });
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(calendarId: string, entryId: string) {
    setBusy(`${calendarId}:${entryId}`);
    try {
      await removeFn({ data: { calendarId, entryId } });
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  async function handleCreateAndAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newCalendarName.trim()) return;
    setBusy("new");
    try {
      const calendar = await createFn({ data: { name: newCalendarName.trim() } });
      await addFn({ data: { calendarId: calendar.id, recipeId, dayOfWeek: newDay } });
      setNewCalendarName("");
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  if (!canSave) {
    return (
      <section className="mt-8">
        <h2 className="font-serif text-xl font-semibold text-ink">Add to calendar</h2>
        <p className="mt-3 text-sm text-ink/60">
          <a
            href="/auth/google"
            className="font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400"
          >
            Sign in with Google
          </a>{" "}
          to add this recipe to a weekly calendar.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <h2 className="font-serif text-xl font-semibold text-ink">Add to calendar</h2>

      {calendars.length > 0 && (
        <div className="mt-3 flex flex-col gap-3">
          {calendars.map((calendar) => (
            <div key={calendar.id} className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-ink/70">{calendar.name}</span>
              {calendar.entries.map((entry) => (
                <button
                  key={entry.entryId}
                  type="button"
                  onClick={() => handleRemove(calendar.id, entry.entryId)}
                  disabled={busy === `${calendar.id}:${entry.entryId}`}
                  className="rounded-full bg-accent-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                >
                  ✕ {dayLabels[entry.dayOfWeek]}
                </button>
              ))}
              <select
                className="rounded-lg border border-accent-100 px-2 py-1 text-sm focus:border-accent-400 focus:outline-none"
                value={dayFor(calendar.id)}
                onChange={(e) =>
                  setDayByCalendar((prev) => ({ ...prev, [calendar.id]: e.target.value as DayOfWeek }))
                }
              >
                {dayOfWeekValues.map((day) => (
                  <option key={day} value={day}>
                    {dayLabels[day]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => handleAdd(calendar.id)}
                disabled={busy === `${calendar.id}:new`}
                className="rounded-full border-2 border-accent-300 px-3 py-1 text-sm font-medium text-ink hover:bg-accent-50 disabled:opacity-50"
              >
                + Add
              </button>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleCreateAndAdd} className="mt-3 flex flex-wrap gap-2">
        <input
          className="flex-1 rounded-lg border border-accent-100 px-3 py-1.5 text-sm focus:border-accent-400 focus:outline-none"
          value={newCalendarName}
          onChange={(e) => setNewCalendarName(e.target.value)}
          placeholder="New calendar name"
        />
        <select
          className="rounded-lg border border-accent-100 px-2 py-1.5 text-sm focus:border-accent-400 focus:outline-none"
          value={newDay}
          onChange={(e) => setNewDay(e.target.value as DayOfWeek)}
        >
          {dayOfWeekValues.map((day) => (
            <option key={day} value={day}>
              {dayLabels[day]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={busy === "new" || !newCalendarName.trim()}
          className="rounded-lg bg-accent-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
        >
          {busy === "new" ? "Adding..." : "+ New calendar"}
        </button>
      </form>
    </section>
  );
}
