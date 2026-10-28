import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import express, { type NextFunction, type Request, type Response } from "express";
import multer from "multer";
import {
  diffDays,
  isISODate,
  type CustomLink,
  type Group,
  type GroupDetail,
  type TripDocument,
  type User,
} from "@tripsync/core";
import type { DB } from "./db";

const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_WINDOW_DAYS = 366;

class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

type Row = Record<string, any>;

function toGroup(r: Row): Group {
  return {
    id: r.id,
    name: r.name,
    destination: r.destination,
    inviteCode: r.invite_code,
    ownerId: r.owner_id,
    windowStart: r.window_start,
    windowEnd: r.window_end,
    tripLength: r.trip_length,
    status: r.status,
    confirmedStart: r.confirmed_start,
    confirmedEnd: r.confirmed_end,
    createdAt: r.created_at,
  };
}

function text(value: unknown, field: string, max = 120): string {
  if (typeof value !== "string" || !value.trim()) throw new HttpError(400, `${field} is required`);
  if (value.trim().length > max) throw new HttpError(400, `${field} is too long`);
  return value.trim();
}

function inviteCode(): string {
  // Unambiguous characters only (no 0/O, 1/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(randomBytes(6), (b) => alphabet[b % alphabet.length]).join("");
}

const now = () => new Date().toISOString();

export function createApp(db: DB, uploadDir: string) {
  mkdirSync(uploadDir, { recursive: true });
  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (_req, _file, cb) => cb(null, randomUUID()),
    }),
    limits: { fileSize: MAX_UPLOAD_BYTES },
  });

  const app = express();
  app.use(express.json({ limit: "1mb" }));

  // --- helpers -------------------------------------------------------------

  /**
   * Identifies the caller from the x-user-id header. This is a lightweight
   * stand-in for real authentication (see docs/ROADMAP.md).
   */
  function currentUser(req: Request): User {
    const id = req.header("x-user-id");
    const row = id ? (db.prepare("SELECT id, name FROM users WHERE id = ?").get(id) as Row) : undefined;
    if (!row) throw new HttpError(401, "Unknown user");
    return { id: row.id, name: row.name };
  }

  function loadGroup(groupId: string): Group {
    const row = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as Row | undefined;
    if (!row) throw new HttpError(404, "Group not found");
    return toGroup(row);
  }

  function requireMember(req: Request): { user: User; group: Group } {
    const user = currentUser(req);
    const group = loadGroup(req.params.groupId);
    const member = db
      .prepare("SELECT 1 FROM members WHERE group_id = ? AND user_id = ?")
      .get(group.id, user.id);
    if (!member) throw new HttpError(403, "You are not a member of this group");
    return { user, group };
  }

  function requireOwner(req: Request) {
    const ctx = requireMember(req);
    if (ctx.group.ownerId !== ctx.user.id) {
      throw new HttpError(403, "Only the trip organizer can do this");
    }
    return ctx;
  }

  function groupDetail(groupId: string): GroupDetail {
    const group = loadGroup(groupId);
    const members = db
      .prepare(
        `SELECT u.id, u.name FROM members m JOIN users u ON u.id = m.user_id
         WHERE m.group_id = ? ORDER BY m.joined_at`,
      )
      .all(groupId) as Row[];
    const availability: Record<string, string[]> = Object.fromEntries(members.map((m) => [m.id, []]));
    const rows = db
      .prepare("SELECT user_id, day FROM availability WHERE group_id = ? ORDER BY day")
      .all(groupId) as Row[];
    for (const r of rows) (availability[r.user_id] ??= []).push(r.day);
    return {
      ...group,
      members: members.map((m) => ({ id: m.id, name: m.name })),
      availability,
    };
  }

  const route =
    (fn: (req: Request, res: Response) => unknown) => (req: Request, res: Response, next: NextFunction) => {
      try {
        const result = fn(req, res);
        if (result !== undefined) res.json(result);
      } catch (err) {
        next(err);
      }
    };

  // --- users ---------------------------------------------------------------

  app.post(
    "/api/users",
    route((req) => {
      const user: User = { id: randomUUID(), name: text(req.body?.name, "Name", 60) };
      db.prepare("INSERT INTO users (id, name, created_at) VALUES (?, ?, ?)").run(user.id, user.name, now());
      return user;
    }),
  );

  app.get("/api/me", route((req) => currentUser(req)));

  // --- groups --------------------------------------------------------------

  app.get(
    "/api/groups",
    route((req) => {
      const user = currentUser(req);
      const rows = db
        .prepare(
          `SELECT g.* FROM groups g JOIN members m ON m.group_id = g.id
           WHERE m.user_id = ? ORDER BY g.created_at DESC`,
        )
        .all(user.id) as Row[];
      return rows.map(toGroup);
    }),
  );

  app.post(
    "/api/groups",
    route((req) => {
      const user = currentUser(req);
      const body = req.body ?? {};
      const name = text(body.name, "Trip name");
      const destination = text(body.destination, "Destination");
      const { windowStart, windowEnd } = body;
      if (!isISODate(windowStart) || !isISODate(windowEnd)) {
        throw new HttpError(400, "Date range must be valid dates");
      }
      const span = diffDays(windowStart, windowEnd) + 1;
      if (span < 1) throw new HttpError(400, "End date must be on or after start date");
      if (span > MAX_WINDOW_DAYS) throw new HttpError(400, "Date range can be at most a year");
      const tripLength = Number(body.tripLength);
      if (!Number.isInteger(tripLength) || tripLength < 1 || tripLength > span) {
        throw new HttpError(400, "Trip length must fit inside the date range");
      }

      const id = randomUUID();
      const createdAt = now();
      db.exec("BEGIN");
      try {
        db.prepare(
          `INSERT INTO groups (id, name, destination, invite_code, owner_id, window_start, window_end, trip_length, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        ).run(id, name, destination, inviteCode(), user.id, windowStart, windowEnd, tripLength, createdAt);
        db.prepare("INSERT INTO members (group_id, user_id, joined_at) VALUES (?, ?, ?)").run(id, user.id, createdAt);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return groupDetail(id);
    }),
  );

  app.post(
    "/api/groups/join",
    route((req) => {
      const user = currentUser(req);
      const code = text(req.body?.inviteCode, "Invite code", 20).toUpperCase();
      const row = db.prepare("SELECT id FROM groups WHERE invite_code = ?").get(code) as Row | undefined;
      if (!row) throw new HttpError(404, "No trip found with that invite code");
      db.prepare("INSERT OR IGNORE INTO members (group_id, user_id, joined_at) VALUES (?, ?, ?)").run(
        row.id,
        user.id,
        now(),
      );
      return groupDetail(row.id);
    }),
  );

  app.get(
    "/api/groups/:groupId",
    route((req) => groupDetail(requireMember(req).group.id)),
  );

  app.put(
    "/api/groups/:groupId/availability",
    route((req) => {
      const { user, group } = requireMember(req);
      if (group.status !== "planning") throw new HttpError(409, "Dates are already confirmed");
      const days = req.body?.days;
      if (!Array.isArray(days) || !days.every(isISODate)) throw new HttpError(400, "days must be a list of dates");
      const inWindow = [...new Set(days)].filter((d) => d >= group.windowStart && d <= group.windowEnd);

      db.exec("BEGIN");
      try {
        db.prepare("DELETE FROM availability WHERE group_id = ? AND user_id = ?").run(group.id, user.id);
        const insert = db.prepare("INSERT INTO availability (group_id, user_id, day) VALUES (?, ?, ?)");
        for (const d of inWindow) insert.run(group.id, user.id, d);
        db.exec("COMMIT");
      } catch (err) {
        db.exec("ROLLBACK");
        throw err;
      }
      return groupDetail(group.id);
    }),
  );

  app.post(
    "/api/groups/:groupId/confirm",
    route((req) => {
      const { group } = requireOwner(req);
      if (group.status !== "planning") throw new HttpError(409, "Dates are already confirmed");
      const { start, end } = req.body ?? {};
      if (!isISODate(start) || !isISODate(end) || end < start) throw new HttpError(400, "Invalid date range");
      if (start < group.windowStart || end > group.windowEnd) {
        throw new HttpError(400, "Dates must be inside the trip's date range");
      }
      db.prepare(
        "UPDATE groups SET status = 'dates_confirmed', confirmed_start = ?, confirmed_end = ? WHERE id = ?",
      ).run(start, end, group.id);
      return groupDetail(group.id);
    }),
  );

  app.post(
    "/api/groups/:groupId/finalize",
    route((req) => {
      const { group } = requireOwner(req);
      if (group.status !== "dates_confirmed") throw new HttpError(409, "Confirm dates before finalizing");
      db.prepare("UPDATE groups SET status = 'finalized' WHERE id = ?").run(group.id);
      return groupDetail(group.id);
    }),
  );

  app.post(
    "/api/groups/:groupId/reopen",
    route((req) => {
      const { group } = requireOwner(req);
      db.prepare(
        "UPDATE groups SET status = 'planning', confirmed_start = NULL, confirmed_end = NULL WHERE id = ?",
      ).run(group.id);
      return groupDetail(group.id);
    }),
  );

  // --- documents -----------------------------------------------------------

  const listDocuments = (groupId: string): TripDocument[] =>
    (
      db
        .prepare(
          `SELECT d.*, u.name AS uploader_name FROM documents d JOIN users u ON u.id = d.uploader_id
           WHERE d.group_id = ? ORDER BY d.created_at DESC`,
        )
        .all(groupId) as Row[]
    ).map((r) => ({
      id: r.id,
      groupId: r.group_id,
      uploaderId: r.uploader_id,
      uploaderName: r.uploader_name,
      name: r.name,
      mimeType: r.mime_type,
      size: r.size,
      createdAt: r.created_at,
    }));

  app.get(
    "/api/groups/:groupId/documents",
    route((req) => listDocuments(requireMember(req).group.id)),
  );

  app.post(
    "/api/groups/:groupId/documents",
    // Check membership before accepting the upload body.
    (req: Request, _res: Response, next: NextFunction) => {
      try {
        requireMember(req);
        next();
      } catch (err) {
        next(err);
      }
    },
    upload.single("file"),
    route((req) => {
      const { user, group } = requireMember(req);
      const file = req.file;
      if (!file) throw new HttpError(400, "No file uploaded");
      db.prepare(
        `INSERT INTO documents (id, group_id, uploader_id, name, stored_name, mime_type, size, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      ).run(
        randomUUID(),
        group.id,
        user.id,
        // multer decodes the multipart filename as latin1.
        Buffer.from(file.originalname, "latin1").toString("utf8").slice(0, 200),
        file.filename,
        file.mimetype || "application/octet-stream",
        file.size,
        now(),
      );
      return listDocuments(group.id);
    }),
  );

  function loadDocument(groupId: string, docId: string): Row {
    const row = db.prepare("SELECT * FROM documents WHERE id = ? AND group_id = ?").get(docId, groupId) as
      | Row
      | undefined;
    if (!row) throw new HttpError(404, "Document not found");
    return row;
  }

  app.get("/api/groups/:groupId/documents/:docId/download", (req, res, next) => {
    try {
      const { group } = requireMember(req);
      const doc = loadDocument(group.id, req.params.docId);
      res.download(join(uploadDir, doc.stored_name), doc.name, { headers: { "Content-Type": doc.mime_type } });
    } catch (err) {
      next(err);
    }
  });

  app.delete(
    "/api/groups/:groupId/documents/:docId",
    route((req) => {
      const { user, group } = requireMember(req);
      const doc = loadDocument(group.id, req.params.docId);
      if (doc.uploader_id !== user.id && group.ownerId !== user.id) {
        throw new HttpError(403, "Only the uploader or organizer can delete this");
      }
      db.prepare("DELETE FROM documents WHERE id = ?").run(doc.id);
      try {
        unlinkSync(join(uploadDir, doc.stored_name));
      } catch {
        // File already gone; the record is what matters.
      }
      return listDocuments(group.id);
    }),
  );

  // --- custom links --------------------------------------------------------

  const listLinks = (groupId: string): CustomLink[] =>
    (db.prepare("SELECT * FROM links WHERE group_id = ? ORDER BY created_at").all(groupId) as Row[]).map((r) => ({
      id: r.id,
      groupId: r.group_id,
      label: r.label,
      url: r.url,
      addedBy: r.added_by,
      createdAt: r.created_at,
    }));

  app.get("/api/groups/:groupId/links", route((req) => listLinks(requireMember(req).group.id)));

  app.post(
    "/api/groups/:groupId/links",
    route((req) => {
      const { user, group } = requireMember(req);
      const label = text(req.body?.label, "Label");
      const url = text(req.body?.url, "URL", 2000);
      let parsed: URL;
      try {
        parsed = new URL(url);
      } catch {
        throw new HttpError(400, "URL is not valid");
      }
      if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
        throw new HttpError(400, "Only http(s) links are allowed");
      }
      db.prepare("INSERT INTO links (id, group_id, label, url, added_by, created_at) VALUES (?, ?, ?, ?, ?, ?)").run(
        randomUUID(),
        group.id,
        label,
        parsed.toString(),
        user.id,
        now(),
      );
      return listLinks(group.id);
    }),
  );

  app.delete(
    "/api/groups/:groupId/links/:linkId",
    route((req) => {
      const { group } = requireMember(req);
      db.prepare("DELETE FROM links WHERE id = ? AND group_id = ?").run(req.params.linkId, group.id);
      return listLinks(group.id);
    }),
  );

  // --- errors --------------------------------------------------------------

  app.use("/api", (_req, _res, next) => next(new HttpError(404, "Not found")));

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof HttpError) return res.status(err.status).json({ error: err.message });
    if (err instanceof multer.MulterError) {
      const message = err.code === "LIMIT_FILE_SIZE" ? "File is larger than 20 MB" : err.message;
      return res.status(400).json({ error: message });
    }
    console.error(err);
    res.status(500).json({ error: "Something went wrong" });
  });

  return app;
}
