import { useEffect, useRef, useState } from "react";
import type { GroupDetail, TripDocument, User } from "@tripsync/core";
import { api } from "../api";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function Documents({ group, user }: { group: GroupDetail; user: User }) {
  const [docs, setDocs] = useState<TripDocument[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.listDocuments(group.id).then(setDocs, (err) => setError(err.message));
  }, [group.id]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files)) setDocs(await api.uploadDocument(group.id, file));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  const run = (action: () => Promise<unknown>) => {
    setError(null);
    action().catch((err) => setError(err.message));
  };

  return (
    <section className="card">
      <div className="section-head">
        <h2>Trip documents</h2>
        <button className="primary" onClick={() => input.current?.click()} disabled={uploading}>
          {uploading ? "Uploading…" : "Upload files"}
        </button>
      </div>
      <p className="muted">Tickets, booking confirmations, IDs, itineraries — shared with everyone in the trip. Max 20 MB each.</p>
      <input ref={input} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files);
        }}
      >
        Drop files here
      </div>
      {error && <p className="error">{error}</p>}
      {docs.length > 0 && (
        <ul className="docs">
          {docs.map((d) => (
            <li key={d.id}>
              <span className="doc-icon">📄</span>
              <div className="doc-meta">
                <button className="link-button doc-name" onClick={() => run(() => api.downloadDocument(group.id, d))}>
                  {d.name}
                </button>
                <span className="muted small">
                  {formatSize(d.size)} · {d.uploaderName} · {new Date(d.createdAt).toLocaleDateString()}
                </span>
              </div>
              {(d.uploaderId === user.id || group.ownerId === user.id) && (
                <button
                  className="link-button danger"
                  onClick={() => confirm(`Delete ${d.name}?`) && run(async () => setDocs(await api.deleteDocument(group.id, d.id)))}
                >
                  Delete
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
