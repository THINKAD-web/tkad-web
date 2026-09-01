#!/usr/bin/env node
/**
 * PR1a dry-run — catalog_channel backfill simulation + optional EXCEPTION test.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/audit/pr1a-catalog-channel-dry-run.mjs
 *   DATABASE_URL=... node scripts/audit/pr1a-catalog-channel-dry-run.mjs --test-exception
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

const OFFLINE_MAINS = [
  "ooh", "transit", "shopping", "shelter", "entertainment",
  "lifestyle", "culture", "etc", "building", "education", "network",
];
const ONLINE_MAINS = ["digital", "online"];
const PER_ROW = [
  { id: "cmr9xedzi000a04layhba2ulc", main: "transit", sub: "vehicle_wrap" },
  { id: "cmrap3eo4000004jv8b2tt90v", main: "ooh", sub: "digital_signage" },
  { id: "cmrn711g8000404ib3hct4qpy", main: "ooh", sub: "digital_signage" },
  { id: "cmtd4wpic000004ic5oeqzdxq", main: "transit", sub: "subway_station" },
];

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();

const report = { at: new Date().toISOString(), testException };

try {
  const col = await client.query(`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'media' AND column_name = 'catalog_channel'
    ) AS has_column
  `);
  report.hasCatalogChannelColumn = col.rows[0].has_column;

  const total = await client.query(`SELECT COUNT(*)::int AS n FROM media`);
  report.totalMedia = total.rows[0].n;

  const mainDist = await client.query(`
    SELECT COALESCE(media_main_category, '__NULL__') AS main, COUNT(*)::int AS cnt
    FROM media GROUP BY 1 ORDER BY cnt DESC
  `);
  report.mainCategoryDistribution = mainDist.rows;

  const unmapped = await client.query(`
    SELECT media_main_category, COUNT(*)::int AS cnt FROM media
    WHERE media_main_category IS NOT NULL
      AND media_main_category NOT IN (${[...OFFLINE_MAINS, ...ONLINE_MAINS].map((_, i) => `$${i + 1}`).join(",")})
    GROUP BY 1
  `, [...OFFLINE_MAINS, ...ONLINE_MAINS]);
  report.unmappedMainCategories = unmapped.rows;

  const afterPerRow = await client.query(`
    WITH simulated AS (
      SELECT
        id,
        CASE
          WHEN id = 'cmr9xedzi000a04layhba2ulc' THEN 'transit'
          WHEN id IN ('cmrap3eo4000004jv8b2tt90v','cmrn711g8000404ib3hct4qpy') THEN 'ooh'
          WHEN id = 'cmtd4wpic000004ic5oeqzdxq' THEN 'transit'
          ELSE media_main_category
        END AS sim_main
      FROM media
    )
    SELECT
      COUNT(*) FILTER (WHERE sim_main = ANY($1::text[]))::int AS would_offline,
      COUNT(*) FILTER (WHERE sim_main = ANY($2::text[]))::int AS would_online,
      COUNT(*) FILTER (WHERE sim_main IS NULL)::int AS would_null_main,
      COUNT(*)::int AS total
    FROM simulated
  `, [OFFLINE_MAINS, ONLINE_MAINS]);

  report.simulatedAfterPerRow = afterPerRow.rows[0];
  report.perRowTargets = PER_ROW;

  const four = await client.query(`
    SELECT id, name, type, media_main_category, media_sub_category, sub_category
    FROM media WHERE id = ANY($1::text[])
  `, [PER_ROW.map((r) => r.id)]);
  report.fourRowsCurrent = four.rows;

  const filterGain = {
    digital_signage: four.rows.filter((r) =>
      ["cmrap3eo4000004jv8b2tt90v", "cmrn711g8000404ib3hct4qpy"].includes(r.id),
    ).length,
    vehicle_wrap: four.rows.filter((r) => r.id === "cmr9xedzi000a04layhba2ulc").length,
    subway_station: four.rows.filter((r) => r.id === "cmtd4wpic000004ic5oeqzdxq").length,
  };
  report.filterVisibilityGain = filterGain;

  report.pass =
    report.unmappedMainCategories.length === 0 &&
    report.simulatedAfterPerRow.would_null_main === 0 &&
    report.simulatedAfterPerRow.would_online === 0 &&
    report.simulatedAfterPerRow.would_offline === report.simulatedAfterPerRow.total;

  if (testException) {
    report.exceptionTest = { started: true };
    try {
      await client.query("BEGIN");
      const unmappedProbe = await client.query(`
        WITH simulated AS (
          SELECT id, media_main_category AS main FROM media
          UNION ALL
          SELECT 'pr1a-exception-probe', '__pr1a_unmapped_probe__'
        ),
        mapped AS (
          SELECT id FROM simulated s
          WHERE s.main = ANY($1::text[])
             OR s.main = ANY($2::text[])
        )
        SELECT COUNT(*)::int AS unmapped FROM simulated s
        WHERE s.id NOT IN (SELECT id FROM mapped) AND s.main IS NOT NULL
      `, [OFFLINE_MAINS, ONLINE_MAINS]);
      const n = unmappedProbe.rows[0].unmapped;
      if (n > 0) {
        throw new Error(`PR1a backfill: ${n} rows with unmapped media_main_category: __pr1a_unmapped_probe__`);
      }
      report.exceptionTest.result = "unexpected_pass";
      await client.query("ROLLBACK");
    } catch (e) {
      await client.query("ROLLBACK");
      report.exceptionTest.result = "exception_raised";
      report.exceptionTest.message = String(e.message ?? e);
      report.exceptionTest.pass = /unmapped/i.test(String(e.message ?? e));
    }
  }
} finally {
  await client.end();
}

const outPath = join(root, "reports/pr1a-catalog-channel-dry-run.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ pass: report.pass, outPath, simulated: report.simulatedAfterPerRow }, null, 2));
process.exit(report.pass ? 0 : 1);
