#!/usr/bin/env node
/**
 * PR0 prod migration — pre/post counts in one session + optional migrate.
 * Usage:
 *   DATABASE_URL=... node scripts/audit/pr0-prod-migrate.mjs counts
 *   DATABASE_URL=... node scripts/audit/pr0-prod-migrate.mjs migrate
 */
import pg from "pg";
import { readFileSync, writeFileSync, mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execFileSync } from "child_process";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const LOG_PATH = join(root, "reports/pr0-prod-migration-log.json");
const mode = process.argv[2] ?? "counts";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const NEON_BACKUP = {
  branch: "pr0-pre-migrate-20260901",
  branchId: "br-hidden-resonance-auxt7n2v",
  projectId: "nameless-shadow-36255941",
  createdAt: "2026-09-01T09:18:05Z",
};

async function fetchCounts(client) {
  const q = await client.query(`
    SELECT
      (SELECT COUNT(*)::int FROM media WHERE type = 'digital') AS media_digital,
      (SELECT COUNT(*)::int FROM media WHERE type = 'dooh') AS media_dooh,
      (SELECT COUNT(*)::int FROM user_saved_plans WHERE items::text ~ '"mediaType"\\s*:\\s*"digital"') AS json_cart_digital_rows,
      (SELECT COUNT(*)::int FROM user_saved_plans WHERE items::text ~ '"mediaType"\\s*:\\s*"dooh"') AS json_cart_dooh_rows,
      (SELECT COUNT(*)::int FROM saved_planner_plans WHERE plan_json::text ~ '"categories"\\s*:\\s*\\[[^\\]]*"digital"') AS json_plan_digital_rows,
      (SELECT COUNT(*)::int FROM saved_planner_plans WHERE plan_json::text ~ '"categories"\\s*:\\s*\\[[^\\]]*"dooh"') AS json_plan_dooh_rows,
      (SELECT COUNT(*)::int FROM user_saved_plans) AS json_cart_users,
      (SELECT COUNT(*)::int FROM saved_planner_plans) AS json_plan_rows
  `);
  return q.rows[0];
}

function loadLog() {
  try {
    return JSON.parse(readFileSync(LOG_PATH, "utf8"));
  } catch {
    return { neonBackup: NEON_BACKUP, events: [] };
  }
}

function saveLog(log) {
  mkdirSync(dirname(LOG_PATH), { recursive: true });
  writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const log = loadLog();
log.neonBackup = NEON_BACKUP;

try {
  if (mode === "counts" || mode === "pre") {
    const pre = await fetchCounts(client);
    log.pre = { at: new Date().toISOString(), ...pre };
    log.events.push({ type: "PRE_COUNTS", at: log.pre.at, pre });
    saveLog(log);
    console.log(JSON.stringify({ phase: "PRE", ...pre }, null, 2));
  }

  if (mode === "migrate") {
    if (!log.pre) {
      console.error("Run pre counts first: node scripts/audit/pr0-prod-migrate.mjs pre");
      process.exit(1);
    }
    const sqlPath = join(root, "scripts/migrations/pr0-preview-migrate-combined.sql");
    const out = execFileSync("psql", [url, "-f", sqlPath], {
      encoding: "utf8",
      env: process.env,
    });
    log.migration = { at: new Date().toISOString(), psqlOutput: out };
    log.events.push({ type: "MIGRATE", at: log.migration.at });

    const post = await fetchCounts(client);
    log.post = { at: new Date().toISOString(), ...post };
    log.events.push({ type: "POST_COUNTS", at: log.post.at, post });
    saveLog(log);
    console.log(out);
    console.log(JSON.stringify({ phase: "POST", ...post }, null, 2));
  }

  if (mode === "post") {
    const post = await fetchCounts(client);
    log.post = { at: new Date().toISOString(), ...post };
    log.events.push({ type: "POST_COUNTS", at: log.post.at, post });
    saveLog(log);
    console.log(JSON.stringify({ phase: "POST", ...post }, null, 2));
  }
} finally {
  await client.end();
}
