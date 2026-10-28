import { useEffect, useState } from "react";
import { buildTravelLinks, CATEGORY_LABELS, type CustomLink, type GroupDetail, type LinkCategory } from "@tripsync/core";
import { api } from "../api";

export function BookingLinks({ group }: { group: GroupDetail }) {
  const links = buildTravelLinks({
    destination: group.destination,
    start: group.confirmedStart!,
    end: group.confirmedEnd!,
    travelers: group.members.length,
  });
  const categories = [...new Set(links.map((l) => l.category))] as LinkCategory[];

  return (
    <section className="card">
      <h2>Book your trip</h2>
      <p className="muted">
        Searches are pre-filled with {group.destination}, your dates and {group.members.length} travelers where the
        site supports it.
      </p>
      <div className="link-groups">
        {categories.map((cat) => (
          <div key={cat} className="link-group">
            <h4>{CATEGORY_LABELS[cat]}</h4>
            <ul>
              {links
                .filter((l) => l.category === cat)
                .map((l) => (
                  <li key={l.url}>
                    <a href={l.url} target="_blank" rel="noopener noreferrer">
                      <span>{l.label}</span>
                      <span className="muted small">{l.provider} ↗</span>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
      <SharedLinks groupId={group.id} />
    </section>
  );
}

function SharedLinks({ groupId }: { groupId: string }) {
  const [links, setLinks] = useState<CustomLink[]>([]);
  const [label, setLabel] = useState("");
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.listLinks(groupId).then(setLinks, (err) => setError(err.message));
  }, [groupId]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLinks(await api.addLink(groupId, label, url));
      setLabel("");
      setUrl("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="shared-links">
      <h4>Group's saved links</h4>
      {links.length === 0 && <p className="muted small">Save the hotel, flight or tour you picked so everyone can see it.</p>}
      <ul>
        {links.map((l) => (
          <li key={l.id}>
            <a href={l.url} target="_blank" rel="noopener noreferrer">
              {l.label} ↗
            </a>
            <button className="link-button" onClick={() => api.deleteLink(groupId, l.id).then(setLinks)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
      <form className="row" onSubmit={add}>
        <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Our villa)" />
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" type="url" />
        <button disabled={!label.trim() || !url.trim()}>Save link</button>
      </form>
      {error && <p className="error">{error}</p>}
    </div>
  );
}
