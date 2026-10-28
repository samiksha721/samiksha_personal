import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { createApp } from "./app";
import { openDatabase } from "./db";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dataDir = process.env.DATA_DIR ?? join(root, "data");
mkdirSync(dataDir, { recursive: true });

const app = createApp(openDatabase(join(dataDir, "tripsync.db")), join(dataDir, "uploads"));

// In production, serve the built web app from the same origin.
const webDist = join(root, "..", "web", "dist");
if (existsSync(webDist)) {
  app.use(express.static(webDist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(webDist, "index.html")));
}

const port = Number(process.env.PORT ?? 4000);
app.listen(port, () => console.log(`TripSync API listening on http://localhost:${port}`));
