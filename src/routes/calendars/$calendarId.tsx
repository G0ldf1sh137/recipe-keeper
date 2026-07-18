import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { DndContext, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import type { DragCancelEvent, DragEndEvent, DragOverEvent } from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
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
import { CalendarDayColumn } from "#/calendars/CalendarDayColumn";
import { ShareControl } from "#/sharing/ShareControl";
import { Toast } from "#/ui/Toast";
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
    const isSubscriber = !!user && (user.isAdmin || user.isSubscriber);
    const groceryLists = isSubscriber ? await listMyGroceryLists() : [];
    return { calendar, entriesByDay, user, groceryLists, isSubscriber };
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

type CalendarEntry = ReturnType<typeof Route.useLoaderData>["entriesByDay"][DayOfWeek][number];

function findContainer(
  entriesByDay: Record<DayOfWeek, CalendarEntry[]>,
  id: string,
): DayOfWeek | undefined {
  if ((dayOfWeekValues as readonly string[]).includes(id)) return id as DayOfWeek;
  for (const day of dayOfWeekValues) {
    if (entriesByDay[day].some((entry) => entry.entryId === id)) return day;
  }
  return undefined;
}

function CalendarPage() {
  const { calendar, entriesByDay: loaderEntriesByDay, user, groceryLists, isSubscriber } = Route.useLoaderData();
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
  const [entriesByDay, setEntriesByDay] = useState(loaderEntriesByDay);
  const [toast, setToast] = useState<{ entryId: string; title: string } | null>(null);
  const pendingRemovalsRef = useRef(
    new Map<string, { entry: CalendarEntry; day: DayOfWeek; index: number; timeoutId: number }>(),
  );

  useEffect(() => {
    setEntriesByDay(loaderEntriesByDay);
  }, [loaderEntriesByDay]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  function handleRemove(entryId: string) {
    const day = findContainer(entriesByDay, entryId);
    if (!day) return;
    const index = entriesByDay[day].findIndex((e) => e.entryId === entryId);
    if (index === -1) return;
    const entry = entriesByDay[day][index];
    setEntriesByDay((prev) => ({ ...prev, [day]: prev[day].filter((e) => e.entryId !== entryId) }));

    const timeoutId = window.setTimeout(() => {
      pendingRemovalsRef.current.delete(entryId);
      void removeFn({ data: { calendarId: calendar.id, entryId } });
      setToast((current) => (current?.entryId === entryId ? null : current));
    }, 5000);
    pendingRemovalsRef.current.set(entryId, { entry, day, index, timeoutId });
    setToast({ entryId, title: entry.title });
  }

  function handleUndoRemove() {
    if (!toast) return;
    const pending = pendingRemovalsRef.current.get(toast.entryId);
    if (!pending) return;
    window.clearTimeout(pending.timeoutId);
    pendingRemovalsRef.current.delete(toast.entryId);
    setEntriesByDay((prev) => {
      const next = [...prev[pending.day]];
      next.splice(Math.min(pending.index, next.length), 0, pending.entry);
      return { ...prev, [pending.day]: next };
    });
    setToast(null);
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const activeContainer = findContainer(entriesByDay, activeId);
    const overContainer = findContainer(entriesByDay, overId);
    if (!activeContainer || !overContainer || activeContainer === overContainer) return;

    setEntriesByDay((prev) => {
      const activeItems = prev[activeContainer];
      const overItems = prev[overContainer];
      const activeIndex = activeItems.findIndex((e) => e.entryId === activeId);
      if (activeIndex === -1) return prev;
      const overIndex = overItems.findIndex((e) => e.entryId === overId);
      const insertIndex = overIndex >= 0 ? overIndex : overItems.length;
      const movedEntry = { ...activeItems[activeIndex], dayOfWeek: overContainer };
      return {
        ...prev,
        [activeContainer]: activeItems.filter((e) => e.entryId !== activeId),
        [overContainer]: [...overItems.slice(0, insertIndex), movedEntry, ...overItems.slice(insertIndex)],
      };
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over) {
      void router.invalidate();
      return;
    }
    const activeId = String(active.id);
    const overId = String(over.id);
    const container = findContainer(entriesByDay, activeId);
    if (!container) return;

    setEntriesByDay((prev) => {
      const items = prev[container];
      const oldIndex = items.findIndex((e) => e.entryId === activeId);
      const newIndex = overId === container ? items.length - 1 : items.findIndex((e) => e.entryId === overId);
      if (oldIndex === -1 || newIndex === -1) return prev;
      const next = arrayMove(items, oldIndex, newIndex);
      void moveFn({
        data: {
          calendarId: calendar.id,
          entryId: activeId,
          dayOfWeek: container,
          orderedEntryIds: next.map((e) => e.entryId),
        },
      }).catch(() => router.invalidate());
      return { ...prev, [container]: next };
    });
  }

  function handleDragCancel(_event: DragCancelEvent) {
    void router.invalidate();
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
              className="rounded-lg border border-accent-100 bg-surface px-2 py-1 text-sm text-ink focus:border-accent-400 focus:outline-none"
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

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-7">
          {dayOfWeekValues.map((day) => (
            <CalendarDayColumn
              key={day}
              day={day}
              dayLabel={dayLabels[day]}
              entries={entriesByDay[day]}
              canManage={calendar.canManage}
              onRemove={handleRemove}
            />
          ))}
        </div>
      </DndContext>

      {toast && (
        <Toast message={`Removed "${toast.title}" from this calendar.`} actionLabel="Undo" onAction={handleUndoRemove} />
      )}

      <AddCalendarToGroceryList
        calendarId={calendar.id}
        shareToken={shareToken}
        groceryLists={groceryLists}
        canSave={isSubscriber}
        isLoggedIn={!!user}
      />
    </div>
  );
}
