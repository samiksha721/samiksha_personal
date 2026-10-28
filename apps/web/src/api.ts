import type { CustomLink, Group, GroupDetail, ISODate, TripDocument, User } from "@tripsync/core";

const USER_KEY = "tripsync.userId";

export function getStoredUserId(): string | null {
  try {
    return localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export function storeUserId(id: string | null) {
  try {
    if (id) localStorage.setItem(USER_KEY, id);
    else localStorage.removeItem(USER_KEY);
  } catch {
    // Storage unavailable (private mode); the session just won't persist.
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const userId = getStoredUserId();
  if (userId) headers.set("x-user-id", userId);
  if (init.body && !(init.body instanceof FormData)) headers.set("Content-Type", "application/json");

  const res = await fetch(`/api${path}`, { ...init, headers });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error ?? `Request failed (${res.status})`);
  return body as T;
}

const json = (method: string, data?: unknown): RequestInit => ({
  method,
  body: data === undefined ? undefined : JSON.stringify(data),
});

export interface NewTrip {
  name: string;
  destination: string;
  windowStart: ISODate;
  windowEnd: ISODate;
  tripLength: number;
}

export const api = {
  createUser: (name: string) => call<User>("/users", json("POST", { name })),
  me: () => call<User>("/me"),

  listGroups: () => call<Group[]>("/groups"),
  createGroup: (trip: NewTrip) => call<GroupDetail>("/groups", json("POST", trip)),
  joinGroup: (inviteCode: string) => call<GroupDetail>("/groups/join", json("POST", { inviteCode })),
  getGroup: (id: string) => call<GroupDetail>(`/groups/${id}`),
  setAvailability: (id: string, days: ISODate[]) =>
    call<GroupDetail>(`/groups/${id}/availability`, json("PUT", { days })),
  confirmDates: (id: string, start: ISODate, end: ISODate) =>
    call<GroupDetail>(`/groups/${id}/confirm`, json("POST", { start, end })),
  finalize: (id: string) => call<GroupDetail>(`/groups/${id}/finalize`, json("POST")),
  reopen: (id: string) => call<GroupDetail>(`/groups/${id}/reopen`, json("POST")),

  listDocuments: (id: string) => call<TripDocument[]>(`/groups/${id}/documents`),
  uploadDocument: (id: string, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return call<TripDocument[]>(`/groups/${id}/documents`, { method: "POST", body: form });
  },
  deleteDocument: (id: string, docId: string) =>
    call<TripDocument[]>(`/groups/${id}/documents/${docId}`, { method: "DELETE" }),
  /** Downloads via fetch so the user header is sent, then saves the blob. */
  downloadDocument: async (id: string, doc: TripDocument) => {
    const res = await fetch(`/api/groups/${id}/documents/${doc.id}/download`, {
      headers: { "x-user-id": getStoredUserId() ?? "" },
    });
    if (!res.ok) throw new ApiError(res.status, "Download failed");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.name;
    a.click();
    URL.revokeObjectURL(url);
  },

  listLinks: (id: string) => call<CustomLink[]>(`/groups/${id}/links`),
  addLink: (id: string, label: string, url: string) =>
    call<CustomLink[]>(`/groups/${id}/links`, json("POST", { label, url })),
  deleteLink: (id: string, linkId: string) =>
    call<CustomLink[]>(`/groups/${id}/links/${linkId}`, { method: "DELETE" }),
};
