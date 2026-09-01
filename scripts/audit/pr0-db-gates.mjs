#!/usr/bin/env node
/**
 * PR0 gate queries — saved JSON audit + digital type breakdown (read-only).
 * Usage: DATABASE_URL=... node scripts/audit/pr0-db-gates.mjs [--label prod|preview]
 */
import pg from "pg";

const label = process.argv.includes("--label")
  ? process.argv[process.argv.indexOf("--label") + 1]
  : "unknown";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });

const JSON_TABLES = [
  {
    table: "saved_planner_plans",
    column: "plan_json",
    patterns: [
      { name: "mediaType_digital", re: '"mediaType"\\s*:\\s*"digital"' },
      { name: "type_digital", re: '"type"\\s*:\\s*"digital"' },
      { name: "categories_digital", re: '"categories"\\s*:\\s*\\[[^\\]]*"digital"' },
      { name: "campaignMediaIds_only_hint", re: '"campaignMediaIds"' },
    ],
  },
  {
    table: "saved_plan_carts",
    column: "items",
    patterns: [
      { name: "mediaType_digital", re: '"mediaType"\\s*:\\s*"digital"' },
      { name: "type_digital", re: '"type"\\s*:\\s*"digital"' },
    ],
  },
  {
    table: "saved_plan_carts",
    column: "report_summary",
    patterns: [
      { name: "key_digital", re: '"key"\\s*:\\s*"digital"' },
      { name: "mediaType_digital", re: '"mediaType"\\s*:\\s*"digital"' },
    ],
  },
  {
    table: "user_saved_plans",
    column: "items",
    patterns: [
      { name: "mediaType_digital", re: '"mediaType"\\s*:\\s*"digital"' },
      { name: "type_digital", re: '"type"\\s*:\\s*"digital"' },
    ],
  },
  {
    table: "campaign_plans",
    column: "media_mix",
    patterns: [
      { name: "mediaType_digital", re: '"mediaType"\\s*:\\s*"digital"' },
      { name: "type_digital", re: '"type"\\s*:\\s*"digital"' },
      { name: "mediaId_only_hint", re: '"mediaId"' },
    ],
  },
  {
    table: "saved_campaign_proposals",
    column: "proposal_json",
    patterns: [
      { name: "mediaType_digital", re: '"mediaType"\\s*:\\s*"digital"' },
      { name: "type_digital", re: '"type"\\s*:\\s*"digital"' },
    ],
  },
  {
    table: "saved_campaign_proposals",
    column: "input_json",
    patterns: [
      { name: "mediaType_digital", re: '"mediaType"\\s*:\\s*"digital"' },
      { name: "type_digital", re: '"type"\\s*:\\s*"digital"' },
    ],
  },
];

async function countMatching(table, column, pattern) {
  const { rows } = await client.query(
    `SELECT COUNT(*)::int AS n FROM ${table} WHERE ${column}::text ~ $1`,
    [pattern],
  );
  return rows[0].n;
}

async function totalRows(table) {
  const { rows } = await client.query(`SELECT COUNT(*)::int AS n FROM ${table}`);
  return rows[0].n;
}

async function breakdown641() {
  const { rows } = await client.query(`
    SELECT
      COALESCE(media_main_category, '(null)') AS main_category,
      COALESCE(media_sub_category, sub_category, '(null)') AS sub_category,
      COUNT(*)::int AS cnt
    FROM media
    WHERE type = 'digital'
    GROUP BY 1, 2
    ORDER BY cnt DESC, main_category, sub_category
  `);
  const total = rows.reduce((s, r) => s + r.cnt, 0);
  return { total, rows };
}

async function typeCounts() {
  const { rows } = await client.query(`
    SELECT type, COUNT(*)::int AS cnt FROM media GROUP BY type ORDER BY cnt DESC
  `);
  return rows;
}

await client.connect();
try {
  const out = { label, savedJson: {}, typeCounts: await typeCounts(), breakdown641: await breakdown641() };

  for (const spec of JSON_TABLES) {
    const key = `${spec.table}.${spec.column}`;
    out.savedJson[key] = { totalRows: await totalRows(spec.table), patterns: {} };
    for (const p of spec.patterns) {
      out.savedJson[key].patterns[p.name] = await countMatching(spec.table, spec.column, p.re);
    }
  }

  console.log(JSON.stringify(out, null, 2));
} finally {
  await client.end();
}
