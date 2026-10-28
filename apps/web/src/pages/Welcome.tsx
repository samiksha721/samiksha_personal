import { useState } from "react";
import type { User } from "@tripsync/core";
import { api } from "../api";

export function Welcome({ onSignIn, joinCode }: { onSignIn: (u: User) => void; joinCode?: string }) {
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      onSignIn(await api.createUser(name));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="hero">
      <h1>Plan group trips without the endless group chat.</h1>
      <p className="lead">
        Everyone marks when they're free, TripSync finds the dates that work, and once the trip is locked in you
        get booking links and a shared place for tickets and documents.
      </p>
      <ol className="steps">
        <li>
          <strong>Create a trip</strong> and share the invite code
        </li>
        <li>
          <strong>Mark your free days</strong> on the shared calendar
        </li>
        <li>
          <strong>Confirm the best dates</strong> and finalize
        </li>
        <li>
          <strong>Book & store documents</strong> together
        </li>
      </ol>
      <form className="card form-inline" onSubmit={submit}>
        <label htmlFor="name">{joinCode ? "Enter your name to join the trip" : "What's your name?"}</label>
        <div className="row">
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Priya"
            maxLength={60}
            autoFocus
          />
          <button className="primary" disabled={busy || !name.trim()}>
            Get started
          </button>
        </div>
        {error && <p className="error">{error}</p>}
      </form>
    </section>
  );
}
