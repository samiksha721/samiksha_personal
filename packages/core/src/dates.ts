import type { ISODate } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;
const ISO_RE = /^\d{4}-\d{2}-\d{2}$/;

export function isISODate(value: unknown): value is ISODate {
  if (typeof value !== "string" || !ISO_RE.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && toISODate(d) === value;
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

/** Today's date in the caller's local timezone. */
export function todayISO(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseISODate(value: ISODate): Date {
  return new Date(`${value}T00:00:00Z`);
}

export function addDays(value: ISODate, days: number): ISODate {
  return toISODate(new Date(parseISODate(value).getTime() + days * DAY_MS));
}

/** Number of days from `a` to `b` (b - a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISODate(b).getTime() - parseISODate(a).getTime()) / DAY_MS);
}

/** Every day from start to end, inclusive. Empty if end < start. */
export function eachDay(start: ISODate, end: ISODate): ISODate[] {
  const days: ISODate[] = [];
  for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);
  return days;
}

/** Days to render for a month grid (weeks start on Monday), padded with nulls. */
export function monthGrid(year: number, month0: number): (ISODate | null)[] {
  const first = new Date(Date.UTC(year, month0, 1));
  const daysInMonth = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const leading = (first.getUTCDay() + 6) % 7;
  const cells: (ISODate | null)[] = Array(leading).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push(toISODate(new Date(Date.UTC(year, month0, day))));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function formatDate(value: ISODate, opts: Intl.DateTimeFormatOptions = {}): string {
  return parseISODate(value).toLocaleDateString(undefined, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
    ...opts,
  });
}

export function formatRange(start: ISODate, end: ISODate): string {
  if (start === end) return formatDate(start);
  return `${formatDate(start, { year: undefined })} – ${formatDate(end)}`;
}
