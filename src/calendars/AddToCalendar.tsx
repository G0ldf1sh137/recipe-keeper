import { useState } from "react";
import { Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays } from "lucide-react";
import { createCalendar, addRecipeToCalendarDay, removeRecipeFromCalendarDay } from "./calendars.functions";
import { dayOfWeekValues } from "#/db/schema";
import type { DayOfWeek } from "#/db/schema";
import { DropdownButton } from "#/ui/DropdownButton";

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
  isLoggedIn = true,
}: {
  recipeId: string;
  calendars: CalendarOption[];
  canSave: boolean;
  isLoggedIn?: boolean;
}) {
  const router = useRouter();
  const addFn = useServerFn(addRecipeToCalendarDay);
  const removeFn = useServerFn(removeRecipeFromCalendarDay);
  const createFn = useServerFn(createCalendar);
  const [creating, setCreating] = useState(false);
  const [newCalendarName, setNewCalendarName] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function handleToggleDay(calendarId: string, day: DayOfWeek, existingEntryId: string | undefined) {
    setBusy(`${calendarId}:${day}`);
    try {
      if (existingEntryId) {
        await removeFn({ data: { calendarId, entryId: existingEntryId } });
      } else {
        await addFn({ data: { calendarId, recipeId, dayOfWeek: day } });
      }
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newCalendarName.trim()) return;
    setBusy("new");
    try {
      await createFn({ data: { name: newCalendarName.trim() } });
      setNewCalendarName("");
      setCreating(false);
      await router.invalidate();
    } finally {
      setBusy(null);
    }
  }

  if (!canSave) {
    return isLoggedIn ? (
      <Link
        to="/subscribers-only"
        search={{ feature: "calendars" }}
        className="flex items-center gap-1.5 rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-accent-50"
      >
        <CalendarDays size={16} />
        Meal Week
      </Link>
    ) : (
      <a
        href="/auth/google"
        className="flex items-center gap-1.5 rounded-lg border-2 border-accent-300 px-3 py-1.5 text-sm font-medium text-ink hover:bg-accent-50"
      >
        <CalendarDays size={16} />
        Meal Week
      </a>
    );
  }

  const savedCount = calendars.filter((c) => c.entries.length > 0).length;

  return (
    <DropdownButton label="Meal Week" icon={<CalendarDays size={16} />} badge={savedCount || undefined}>
      {calendars.length > 0 && (
        <div className="flex flex-col gap-3">
          {calendars.map((calendar) => (
            <div key={calendar.id}>
              <p className="text-sm font-medium text-ink/70">{calendar.name}</p>
              <div className="mt-1 flex flex-wrap gap-1">
                {dayOfWeekValues.map((day) => {
                  const entry = calendar.entries.find((e) => e.dayOfWeek === day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDay(calendar.id, day, entry?.entryId)}
                      disabled={busy === `${calendar.id}:${day}`}
                      className={
                        entry
                          ? "rounded-full bg-accent-600 px-2 py-0.5 text-xs font-medium text-white disabled:opacity-50"
                          : "rounded-full border-2 border-accent-300 px-2 py-0.5 text-xs font-medium text-ink hover:bg-accent-50 disabled:opacity-50"
                      }
                    >
                      {dayLabels[day]}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {creating ? (
        <form onSubmit={handleCreate} className={`flex gap-2 ${calendars.length > 0 ? "mt-3" : ""}`}>
          <input
            className="flex-1 rounded-lg border border-accent-100 px-2 py-1 text-sm focus:border-accent-400 focus:outline-none"
            value={newCalendarName}
            onChange={(e) => setNewCalendarName(e.target.value)}
            placeholder="New Meal Week name"
            autoFocus
          />
          <button
            type="submit"
            disabled={busy === "new" || !newCalendarName.trim()}
            className="rounded-lg bg-accent-600 px-2.5 py-1 text-sm font-medium text-white transition-colors hover:bg-accent-700 disabled:opacity-50"
          >
            {busy === "new" ? "Adding..." : "Add"}
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={`text-sm font-medium text-accent-600 hover:text-accent-700 dark:hover:text-accent-400 ${calendars.length > 0 ? "mt-3" : ""}`}
        >
          + New Meal Week
        </button>
      )}
    </DropdownButton>
  );
}
