import { useCallback, useEffect, useRef, useState } from "react";
import { formatRange, type GroupDetail, type ISODate, type User } from "@tripsync/core";
import { api } from "../api";
import { AvailabilityCalendar } from "../components/AvailabilityCalendar";
import { BookingLinks } from "../components/BookingLinks";
import { DateSuggestions } from "../components/DateSuggestions";
import { Documents } from "../components/Documents";
import { Members } from "../components/Members";
import { StatusBadge } from "../components/StatusBadge";
import { Stepper } from "../components/Stepper";

const POLL_MS = 10_000;

export function TripPage({ groupId, user }: { groupId: string; user: User }) {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  // My unsaved availability edits; null when in sync with the server.
  const [draft, setDraft] = useState<Set<ISODate> | null>(null);
  const [saving, setSaving] = useState(false);
  // Saves can overlap; only the latest one's response is applied.
  const saveSeq = useRef(0);
  const savingRef = useRef(false);

  const refresh = useCallback(async () => {
    try {
      const fresh = await api.getGroup(groupId);
      // A poll that started before a save may carry stale data for me.
      if (!savingRef.current) setGroup(fresh);
    } catch (err) {
      setError((err as Error).message);
    }
  }, [groupId]);

  useEffect(() => {
    refresh();
    const timer = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refresh]);

  const updateGroup = async (action: () => Promise<GroupDetail>) => {
    setError(null);
    try {
      setGroup(await action());
    } catch (err) {
      setError((err as Error).message);
    }
  };

  /** Shows `days` immediately; saves them when `commit` is set (end of a drag or tap). */
  const changeMyDays = async (days: Set<ISODate>, commit: boolean) => {
    setDraft(days);
    if (!commit) return;
    const seq = ++saveSeq.current;
    savingRef.current = true;
    setSaving(true);
    setError(null);
    try {
      const saved = await api.setAvailability(groupId, [...days]);
      if (seq === saveSeq.current) {
        setGroup(saved);
        setDraft(null);
      }
    } catch (err) {
      if (seq === saveSeq.current) setError((err as Error).message);
    } finally {
      if (seq === saveSeq.current) {
        savingRef.current = false;
        setSaving(false);
      }
    }
  };

  if (!group) {
    return error ? <p className="error">{error}</p> : <p className="muted">Loading trip…</p>;
  }

  const isOwner = group.ownerId === user.id;
  const availability = draft ? { ...group.availability, [user.id]: [...draft] } : group.availability;
  const myDays = draft ?? new Set(group.availability[user.id] ?? []);

  return (
    <div className="trip">
      <div className="trip-header">
        <div>
          <a href="#/" className="muted back">
            ← All trips
          </a>
          <h1>{group.name}</h1>
          <p className="muted">
            {group.destination} · {group.members.length} {group.members.length === 1 ? "person" : "people"}
          </p>
        </div>
        <StatusBadge status={group.status} />
      </div>

      <Stepper status={group.status} />
      {error && <p className="error">{error}</p>}

      <div className="trip-grid">
        <div className="trip-main">
          {group.status === "planning" && (
            <>
              <section className="card">
                <div className="section-head">
                  <h2>When are you free?</h2>
                  <span className="muted small">{saving ? "Saving…" : error ? "Not saved" : "All changes saved"}</span>
                </div>
                <p className="muted">
                  Click or drag across the days you can travel. Darker days work for more of the group.
                </p>
                <AvailabilityCalendar
                  group={group}
                  availability={availability}
                  myDays={myDays}
                  onChange={changeMyDays}
                />
              </section>
              <DateSuggestions
                group={group}
                availability={availability}
                isOwner={isOwner}
                onConfirm={(start, end) => updateGroup(() => api.confirmDates(group.id, start, end))}
              />
            </>
          )}

          {group.status === "dates_confirmed" && group.confirmedStart && group.confirmedEnd && (
            <section className="card confirmed">
              <h2>Dates confirmed 🎉</h2>
              <p className="big-date">{formatRange(group.confirmedStart, group.confirmedEnd)}</p>
              {isOwner ? (
                <>
                  <p className="muted">
                    Once everyone is on board, finalize the trip to unlock booking links and shared document
                    storage.
                  </p>
                  <div className="row">
                    <button className="primary" onClick={() => updateGroup(() => api.finalize(group.id))}>
                      Finalize trip
                    </button>
                    <button onClick={() => updateGroup(() => api.reopen(group.id))}>Change dates</button>
                  </div>
                </>
              ) : (
                <p className="muted">Waiting for the organizer to finalize the trip.</p>
              )}
            </section>
          )}

          {group.status === "finalized" && group.confirmedStart && group.confirmedEnd && (
            <>
              <section className="card confirmed">
                <h2>Trip finalized ✅</h2>
                <p className="big-date">{formatRange(group.confirmedStart, group.confirmedEnd)}</p>
                <p className="muted">Book everything below and keep tickets, IDs and itineraries in one place.</p>
                {isOwner && (
                  <button
                    className="link-button"
                    onClick={() => {
                      if (confirm("Reopen planning? Confirmed dates will be cleared.")) {
                        updateGroup(() => api.reopen(group.id));
                      }
                    }}
                  >
                    Reopen planning
                  </button>
                )}
              </section>
              <BookingLinks group={group} />
              <Documents group={group} user={user} />
            </>
          )}
        </div>

        <aside className="trip-side">
          <Members group={group} availability={availability} />
        </aside>
      </div>
    </div>
  );
}
