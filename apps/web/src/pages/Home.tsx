import { useEffect, useState } from "react";
import { addDays, formatRange, todayISO, type Group } from "@tripsync/core";
import { api } from "../api";
import { navigate } from "../router";
import { StatusBadge } from "../components/StatusBadge";

export function Home({ joinCode }: { joinCode?: string }) {
  const [groups, setGroups] = useState<Group[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listGroups().then(setGroups, (err) => setError(err.message));
  }, []);

  return (
    <div className="home">
      <section>
        <h2>Your trips</h2>
        {error && <p className="error">{error}</p>}
        {groups === null ? (
          <p className="muted">Loading…</p>
        ) : groups.length === 0 ? (
          <p className="muted">No trips yet. Create one or join with an invite code.</p>
        ) : (
          <ul className="trip-list">
            {groups.map((g) => (
              <li key={g.id}>
                <a className="card trip-card" href={`#/trip/${g.id}`}>
                  <div>
                    <h3>{g.name}</h3>
                    <p className="muted">
                      {g.destination} ·{" "}
                      {g.confirmedStart && g.confirmedEnd
                        ? formatRange(g.confirmedStart, g.confirmedEnd)
                        : `${g.tripLength} days between ${formatRange(g.windowStart, g.windowEnd)}`}
                    </p>
                  </div>
                  <StatusBadge status={g.status} />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside className="home-side">
        <JoinTrip initialCode={joinCode} />
        <CreateTrip />
      </aside>
    </div>
  );
}

function JoinTrip({ initialCode }: { initialCode?: string }) {
  const [code, setCode] = useState(initialCode ?? "");
  const [error, setError] = useState<string | null>(null);

  const join = async (inviteCode: string) => {
    setError(null);
    try {
      const group = await api.joinGroup(inviteCode);
      navigate(`/trip/${group.id}`);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  // Opening an invite link joins straight away.
  useEffect(() => {
    if (initialCode) join(initialCode);
  }, [initialCode]);

  return (
    <form
      className="card"
      onSubmit={(e) => {
        e.preventDefault();
        join(code);
      }}
    >
      <h3>Join a trip</h3>
      <div className="row">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Invite code"
          maxLength={20}
          className="code-input"
        />
        <button disabled={!code.trim()}>Join</button>
      </div>
      {error && <p className="error">{error}</p>}
    </form>
  );
}

function CreateTrip() {
  const today = todayISO();
  const [form, setForm] = useState({
    name: "",
    destination: "",
    windowStart: addDays(today, 7),
    windowEnd: addDays(today, 60),
    tripLength: 4,
  });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const group = await api.createGroup(form);
      navigate(`/trip/${group.id}`);
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  };

  return (
    <form className="card stack" onSubmit={submit}>
      <h3>Create a trip</h3>
      <label>
        Trip name
        <input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Goa with college friends" />
      </label>
      <label>
        Destination
        <input
          value={form.destination}
          onChange={(e) => set("destination", e.target.value)}
          placeholder="Goa, India"
        />
      </label>
      <div className="row">
        <label>
          Earliest date
          <input
            type="date"
            value={form.windowStart}
            min={today}
            onChange={(e) => set("windowStart", e.target.value)}
          />
        </label>
        <label>
          Latest date
          <input
            type="date"
            value={form.windowEnd}
            min={form.windowStart}
            onChange={(e) => set("windowEnd", e.target.value)}
          />
        </label>
      </div>
      <label>
        Trip length (days)
        <input
          type="number"
          min={1}
          max={60}
          value={form.tripLength}
          onChange={(e) => set("tripLength", Number(e.target.value))}
        />
      </label>
      {error && <p className="error">{error}</p>}
      <button className="primary" disabled={busy || !form.name.trim() || !form.destination.trim()}>
        Create trip
      </button>
    </form>
  );
}
