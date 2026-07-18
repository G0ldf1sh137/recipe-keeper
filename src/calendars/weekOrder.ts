import { dayOfWeekValues } from "#/db/schema";
import type { DayOfWeek, WeekStartDay } from "#/db/schema";

const SUNDAY_FIRST: readonly DayOfWeek[] = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

export function orderedDayOfWeekValues(weekStartDay: WeekStartDay): readonly DayOfWeek[] {
  return weekStartDay === "sun" ? SUNDAY_FIRST : dayOfWeekValues;
}
