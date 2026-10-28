import { useState } from "react";
import type { AvailabilityMap, GroupDetail } from "@tripsync/core";

export function Members({ group, availability }: { group: GroupDetail; availability: AvailabilityMap }) {
  const [copied, setCopied] = useState(false);
  const inviteUrl = `${window.location.origin}${window.location.pathname}#/join/${group.inviteCode}`;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this invite link", inviteUrl);
    }
  };

  return (
    <section className="card">
      <h3>Invite friends</h3>
      <p className="invite-code">{group.inviteCode}</p>
      <button onClick={copy} className="full">
        {copied ? "Link copied!" : "Copy invite link"}
      </button>

      <h3 className="spaced">Group ({group.members.length})</h3>
      <ul className="members">
        {group.members.map((m) => {
          const days = availability[m.id]?.length ?? 0;
          return (
            <li key={m.id}>
              <span className="avatar">{m.name[0]?.toUpperCase()}</span>
              <span className="member-name">
                {m.name}
                {m.id === group.ownerId && <span className="muted small"> · organizer</span>}
              </span>
              {group.status === "planning" && (
                <span className={`small ${days ? "ok" : "muted"}`}>{days ? `${days} days` : "not yet"}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
