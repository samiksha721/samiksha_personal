import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "./app";
import { openDatabase } from "./db";

let app: ReturnType<typeof createApp>;

beforeEach(() => {
  const dir = mkdtempSync(join(tmpdir(), "tripsync-"));
  app = createApp(openDatabase(":memory:"), join(dir, "uploads"));
});

async function signUp(name: string) {
  const res = await request(app).post("/api/users").send({ name }).expect(200);
  return res.body.id as string;
}

async function createTrip(ownerId: string) {
  const res = await request(app)
    .post("/api/groups")
    .set("x-user-id", ownerId)
    .send({ name: "Goa", destination: "Goa, India", windowStart: "2026-12-01", windowEnd: "2026-12-10", tripLength: 3 })
    .expect(200);
  return res.body;
}

describe("trip flow", () => {
  it("lets a group mark availability, confirm and finalize", async () => {
    const ana = await signUp("Ana");
    const ben = await signUp("Ben");
    const trip = await createTrip(ana);

    await request(app).get(`/api/groups/${trip.id}`).set("x-user-id", ben).expect(403);
    await request(app).post("/api/groups/join").set("x-user-id", ben).send({ inviteCode: trip.inviteCode.toLowerCase() }).expect(200);

    const res = await request(app)
      .put(`/api/groups/${trip.id}/availability`)
      .set("x-user-id", ben)
      .send({ days: ["2026-12-02", "2026-12-03", "2026-12-03", "2027-01-01"] })
      .expect(200);
    expect(res.body.members).toHaveLength(2);
    expect(res.body.availability[ben]).toEqual(["2026-12-02", "2026-12-03"]);

    await request(app).post(`/api/groups/${trip.id}/finalize`).set("x-user-id", ana).expect(409);
    await request(app)
      .post(`/api/groups/${trip.id}/confirm`)
      .set("x-user-id", ben)
      .send({ start: "2026-12-02", end: "2026-12-04" })
      .expect(403);
    await request(app)
      .post(`/api/groups/${trip.id}/confirm`)
      .set("x-user-id", ana)
      .send({ start: "2026-12-02", end: "2026-12-04" })
      .expect(200);
    await request(app)
      .put(`/api/groups/${trip.id}/availability`)
      .set("x-user-id", ben)
      .send({ days: [] })
      .expect(409);

    const final = await request(app).post(`/api/groups/${trip.id}/finalize`).set("x-user-id", ana).expect(200);
    expect(final.body).toMatchObject({ status: "finalized", confirmedStart: "2026-12-02", confirmedEnd: "2026-12-04" });
  });

  it("rejects bad trip input", async () => {
    const ana = await signUp("Ana");
    await request(app)
      .post("/api/groups")
      .set("x-user-id", ana)
      .send({ name: "x", destination: "y", windowStart: "2026-12-10", windowEnd: "2026-12-01", tripLength: 2 })
      .expect(400);
    await request(app).get("/api/groups").expect(401);
  });
});

describe("documents and links", () => {
  it("stores, downloads and deletes documents for members only", async () => {
    const ana = await signUp("Ana");
    const eve = await signUp("Eve");
    const trip = await createTrip(ana);

    await request(app)
      .post(`/api/groups/${trip.id}/documents`)
      .set("x-user-id", eve)
      .attach("file", Buffer.from("nope"), "x.txt")
      .expect(403);

    const up = await request(app)
      .post(`/api/groups/${trip.id}/documents`)
      .set("x-user-id", ana)
      .attach("file", Buffer.from("boarding pass"), { filename: "pass.txt", contentType: "text/plain" })
      .expect(200);
    expect(up.body).toHaveLength(1);
    const doc = up.body[0];
    expect(doc).toMatchObject({ name: "pass.txt", size: 13, uploaderName: "Ana" });

    const dl = await request(app)
      .get(`/api/groups/${trip.id}/documents/${doc.id}/download`)
      .set("x-user-id", ana)
      .expect(200);
    expect(dl.text).toBe("boarding pass");

    await request(app).delete(`/api/groups/${trip.id}/documents/${doc.id}`).set("x-user-id", ana).expect(200, []);
  });

  it("only accepts http(s) custom links", async () => {
    const ana = await signUp("Ana");
    const trip = await createTrip(ana);
    await request(app)
      .post(`/api/groups/${trip.id}/links`)
      .set("x-user-id", ana)
      .send({ label: "bad", url: "javascript:alert(1)" })
      .expect(400);
    const res = await request(app)
      .post(`/api/groups/${trip.id}/links`)
      .set("x-user-id", ana)
      .send({ label: "Villa", url: "https://example.com/villa" })
      .expect(200);
    expect(res.body[0]).toMatchObject({ label: "Villa", url: "https://example.com/villa" });
  });
});
