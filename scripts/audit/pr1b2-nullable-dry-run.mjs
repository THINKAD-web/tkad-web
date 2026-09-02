#!/usr/bin/env node
/**
 * PR1b-2 dry-run — nullable type/price + CHECK constraint simulation.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/audit/pr1b2-nullable-dry-run.mjs
 *   DATABASE_URL=... node scripts/audit/pr1b2-nullable-dry-run.mjs --test-exception
 */
import pg from "pg";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const testException = process.argv.includes("--test-exception");
const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const report = { at: new Date().toISOString(), testException };

try {
  const cols = await client.query(`
    SELECT column_name, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'media' AND column_name IN ('type', 'price', 'catalog_channel')
    ORDER BY column_name
  `);
  report.mediaColumnNullability = cols.rows;

  const constraints = await client.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'media'::regclass
      AND conname LIKE 'media_%'
    ORDER BY conname
  `);
  report.existingMediaConstraints = constraints.rows.map((r) => r.conname);

  const counts = await client.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE catalog_channel = 'offline')::int AS offline,
      COUNT(*) FILTER (WHERE catalog_channel = 'online')::int AS online,
      COUNT(*) FILTER (WHERE catalog_channel = 'offline' AND type IS NULL)::int AS offline_null_type,
      COUNT(*) FILTER (WHERE catalog_channel = 'offline' AND price IS NULL)::int AS offline_null_price,
      COUNT(*) FILTER (WHERE catalog_channel = 'online' AND type IS NOT NULL)::int AS online_with_type,
      COUNT(*) FILTER (WHERE catalog_channel = 'online' AND price IS NOT NULL)::int AS online_with_price
    FROM media
  `);
  report.counts = counts.rows[0];

  report.wouldPassOfflineInvariants =
    report.counts.offline_null_type === 0 &&
    report.counts.offline_null_price === 0;
  report.wouldPassOnlineInvariants =
    report.counts.online_with_type === 0 &&
    report.counts.online_with_price === 0;

  if (testException) {
    await client.query("BEGIN");
    try {
      await client.query(`
        INSERT INTO media (id, name, location, region, type, price, catalog_channel, updated_at)
        VALUES ('__pr1b2_dry_run_online__', 'dry-run', 'loc', 'seoul', NULL, NULL, 'online', NOW())
      `);
      report.exceptionOnlineInsert = "unexpected success";
    } catch (e) {
      report.exceptionOnlineInsert =
        e instanceof Error ? e.message.slice(0, 200) : String(e);
    }
    await client.query("ROLLBACK");
  }

  const outDir = join(root, "reports");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "pr1b2-nullable-dry-run.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log("wrote", outPath);
} finally {
  await client.end();
}
