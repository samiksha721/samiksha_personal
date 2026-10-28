import { useMemo, useState } from "react";
import { addDays, formatRange, suggestWindows, type AvailabilityMap, type GroupDetail, type ISODate } from "@tripsync/core";

interface Props {
  group: GroupDetail;
  availability: AvailabilityMap;
  isOwner: boolean;
  onConfirm: (start: ISODate, end: ISODate) => void;
}

export function DateSuggestions({ group, availability, isOwner, onConfirm }: Props) {
  const memberIds = group.members.map((m) => m.id);
  const names = new Map(group.members.map((m) => [m.id, m.name]));
  const windows = useMemo(
    () => suggestWindows(availability, memberIds, group.windowStart, group.windowEnd, group.tripLength),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [availability, memberIds.join(), group.windowStart, group.windowEnd, group.tripLength],
  );
  const [customStart, setCustomStart] = useState(group.windowStart);
  const customEnd = addDays(customStart, group.tripLength - 1);

  const confirm = (start: ISODate, end: ISODate) => {
    if (window.confirm(`Confirm ${formatRange(start, end)} for everyone?`)) onConfirm(start, end);
  };

  return (
    <section className="card">
      <h2>Best dates for the group</h2>
      <p className="muted">
        {group.tripLength}-day windows ranked by how many people are free for the whole trip.
      </p>
      {windows.length === 0 ? (
        <p className="empty">No {group.tripLength}-day window works for anyone yet. Mark some free days above.</p>
      ) : (
        <ul className="suggestions">
          {windows.map((w, i) => {
            const everyone = w.fullyAvailable.length === memberIds.length;
            return (
              <li key={w.start} className={i === 0 ? "best" : ""}>
                <div>
                  <strong>{formatRange(w.start, w.end)}</strong>
                  {everyone && <span className="pill">Everyone free</span>}
                  <p className="muted small">
                    {w.fullyAvailable.length}/{memberIds.length} free all days:{" "}
                    {w.fullyAvailable.map((id) => names.get(id)).join(", ")}
                    {w.partiallyAvailable.length > 0 &&
                      ` · partly: ${w.partiallyAvailable.map((id) => names.get(id)).join(", ")}`}
                  </p>
                </div>
                {isOwner && (
                  <button className={i === 0 ? "primary" : ""} onClick={() => confirm(w.start, w.end)}>
                    Confirm
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {isOwner ? (
        <details className="custom-dates">
          <summary>Pick other dates</summary>
          <div className="row">
            <label>
              Start
              <input
                type="date"
                value={customStart}
                min={group.windowStart}
                max={addDays(group.windowEnd, 1 - group.tripLength)}
                onChange={(e) => e.target.value && setCustomStart(e.target.value)}
              />
            </label>
            <span className="muted">→ {formatRange(customStart, customEnd)}</span>
            <button onClick={() => confirm(customStart, customEnd)}>Confirm</button>
          </div>
        </details>
      ) : (
        <p className="muted small">The trip organizer confirms the final dates.</p>
      )}
    </section>
  );
}
