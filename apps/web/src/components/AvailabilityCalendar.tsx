import { useEffect, useMemo, useRef } from "react";
import {
  availableByDay,
  eachDay,
  monthGrid,
  parseISODate,
  type AvailabilityMap,
  type GroupDetail,
  type ISODate,
} from "@tripsync/core";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

interface Props {
  group: GroupDetail;
  availability: AvailabilityMap;
  myDays: Set<ISODate>;
  /** `commit` is false while a drag is in progress and true once it ends. */
  onChange: (days: Set<ISODate>, commit: boolean) => void;
}

function monthsBetween(start: ISODate, end: ISODate): { year: number; month0: number }[] {
  const s = parseISODate(start);
  const e = parseISODate(end);
  const months = [];
  for (let y = s.getUTCFullYear(), m = s.getUTCMonth(); y < e.getUTCFullYear() || (y === e.getUTCFullYear() && m <= e.getUTCMonth()); ) {
    months.push({ year: y, month0: m });
    if (++m === 12) {
      m = 0;
      y++;
    }
  }
  return months;
}

export function AvailabilityCalendar({ group, availability, myDays, onChange }: Props) {
  const byDay = useMemo(() => availableByDay(availability), [availability]);
  const names = useMemo(() => new Map(group.members.map((m) => [m.id, m.name])), [group.members]);
  const months = useMemo(() => monthsBetween(group.windowStart, group.windowEnd), [group.windowStart, group.windowEnd]);
  const total = group.members.length;

  const inWindow = (day: ISODate) => day >= group.windowStart && day <= group.windowEnd;

  // Drag selects every day between the first day pressed and the current one.
  // The first day decides whether the range is added or removed.
  const drag = useRef<{ adding: boolean; anchor: ISODate; base: Set<ISODate>; result: Set<ISODate> } | null>(null);

  useEffect(() => {
    const end = () => {
      if (drag.current) onChange(drag.current.result, true);
      drag.current = null;
    };
    window.addEventListener("pointerup", end);
    window.addEventListener("pointercancel", end);
    return () => {
      window.removeEventListener("pointerup", end);
      window.removeEventListener("pointercancel", end);
    };
  }, [onChange]);

  const paintTo = (day: ISODate) => {
    const d = drag.current;
    if (!d) return;
    const [from, to] = d.anchor <= day ? [d.anchor, day] : [day, d.anchor];
    const next = new Set(d.base);
    for (const x of eachDay(from, to)) {
      if (!inWindow(x)) continue;
      if (d.adding) next.add(x);
      else next.delete(x);
    }
    d.result = next;
    onChange(next, false);
  };

  return (
    <div className="calendar">
      {months.map(({ year, month0 }) => (
        <div className="month" key={`${year}-${month0}`}>
          <h4>
            {new Date(Date.UTC(year, month0, 1)).toLocaleDateString(undefined, {
              month: "long",
              year: "numeric",
              timeZone: "UTC",
            })}
          </h4>
          <div className="month-grid">
            {WEEKDAYS.map((w) => (
              <div className="weekday" key={w}>
                {w}
              </div>
            ))}
            {monthGrid(year, month0).map((day, i) => {
              if (!day) return <div key={i} />;
              const enabled = inWindow(day);
              const free = byDay.get(day) ?? [];
              const ratio = total ? free.length / total : 0;
              const mine = myDays.has(day);
              const title = enabled
                ? free.length
                  ? `${free.length}/${total} free: ${free.map((id) => names.get(id)).join(", ")}`
                  : "Nobody free yet"
                : "Outside trip range";
              return (
                <button
                  key={day}
                  type="button"
                  className={`day${mine ? " mine" : ""}${ratio === 1 && total > 1 ? " everyone" : ""}`}
                  disabled={!enabled}
                  title={title}
                  style={enabled && free.length ? { ["--heat" as string]: String(0.15 + ratio * 0.85) } : undefined}
                  onPointerDown={(e) => {
                    e.preventDefault();
                    // Let pointerenter fire on other days during touch drags.
                    e.currentTarget.releasePointerCapture?.(e.pointerId);
                    drag.current = { adding: !mine, anchor: day, base: new Set(myDays), result: myDays };
                    paintTo(day);
                  }}
                  onPointerEnter={() => paintTo(day)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      const next = new Set(myDays);
                      if (mine) next.delete(day);
                      else next.add(day);
                      onChange(next, true);
                    }
                  }}
                >
                  <span className="day-num">{parseISODate(day).getUTCDate()}</span>
                  {enabled && free.length > 0 && <span className="day-count">{free.length}</span>}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      <div className="legend">
        <span>
          <i className="swatch mine-swatch" /> You're free
        </span>
        <span>
          <i className="swatch heat-low" /> Few free
        </span>
        <span>
          <i className="swatch heat-high" /> Most free
        </span>
      </div>
    </div>
  );
}
