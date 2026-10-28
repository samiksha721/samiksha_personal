import { addDays, eachDay } from "./dates";
import type { AvailabilityMap, ISODate } from "./types";

/** For each day, the ids of members available on it. */
export function availableByDay(availability: AvailabilityMap): Map<ISODate, string[]> {
  const byDay = new Map<ISODate, string[]>();
  for (const [userId, days] of Object.entries(availability)) {
    for (const day of new Set(days)) {
      const list = byDay.get(day);
      if (list) list.push(userId);
      else byDay.set(day, [userId]);
    }
  }
  return byDay;
}

export interface DateWindow {
  start: ISODate;
  end: ISODate;
  /** Members free on every day of the window. */
  fullyAvailable: string[];
  /** Members free on some, but not all, days of the window. */
  partiallyAvailable: string[];
  /** Sum over days of members available that day; used as a tie-breaker. */
  memberDays: number;
}

/**
 * Ranks every `length`-day window between windowStart and windowEnd:
 * most members free for the whole window first, then most member-days,
 * then earliest start. Windows nobody can fully attend are dropped.
 */
export function suggestWindows(
  availability: AvailabilityMap,
  memberIds: string[],
  windowStart: ISODate,
  windowEnd: ISODate,
  length: number,
  limit = 5,
): DateWindow[] {
  if (length < 1) return [];
  const sets = new Map(memberIds.map((id) => [id, new Set(availability[id] ?? [])]));
  const windows: DateWindow[] = [];

  for (let start = windowStart; addDays(start, length - 1) <= windowEnd; start = addDays(start, 1)) {
    const end = addDays(start, length - 1);
    const days = eachDay(start, end);
    const fullyAvailable: string[] = [];
    const partiallyAvailable: string[] = [];
    let memberDays = 0;

    for (const id of memberIds) {
      const free = days.filter((d) => sets.get(id)!.has(d)).length;
      memberDays += free;
      if (free === days.length) fullyAvailable.push(id);
      else if (free > 0) partiallyAvailable.push(id);
    }
    if (fullyAvailable.length > 0) {
      windows.push({ start, end, fullyAvailable, partiallyAvailable, memberDays });
    }
  }

  windows.sort(
    (a, b) =>
      b.fullyAvailable.length - a.fullyAvailable.length ||
      b.memberDays - a.memberDays ||
      a.start.localeCompare(b.start),
  );
  return windows.slice(0, limit);
}
