#!/usr/bin/env node
/**
 * PR1b-2 Preview validation — CHECK probes, type=null smoke, quote error path.
 *
 * Usage:
 *   DATABASE_URL=... node scripts/audit/pr1b2-preview-validation.mjs
 *   DATABASE_URL=... node scripts/audit/pr1b2-preview-validation.mjs --keep-smoke
 *   DATABASE_URL=... PREVIEW_URL=https://... node scripts/audit/pr1b2-preview-validation.mjs
 *
 * Phases:
 *   1. Pre-check counts + constraint names
 *   2. Four CHECK violation probes (rolled back each)
 *   3. Valid online smoke insert → quote-calculator throw → optional HTTP
 *   4. Delete smoke → online=0 (rollback prerequisite)
 */
import pg from "pg";
import { writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequire } from "module";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const keepSmoke = process.argv.includes("--keep-smoke");
const url = process.env.DATABASE_URL;
const previewUrl = process.env.PREVIEW_URL?.replace(/\/$/, "");

if (!url) {
  console.error("DATABASE_URL required");
  process.exit(1);
}

const SMOKE_ID = "__pr1b2_preview_smoke_online__";
const SMOKE_SLUG = "pr1b2-preview-smoke-search";

const CHECK_PROBES = [
  {
    id: "probe_online_type_violation",
    constraint: "media_online_type_null",
    sql: `
      INSERT INTO media (id, name, location, region, type, price, catalog_channel, updated_at, created_at)
      VALUES ($1, 'probe', 'loc', 'seoul', 'dooh', NULL, 'online', NOW(), NOW())
    `,
    expectReject: true,
  },
  {
    id: "probe_online_price_violation",
    constraint: "media_online_price_null",
    sql: `
      INSERT INTO media (id, name, location, region, type, price, catalog_channel, updated_at, created_at)
      VALUES ($1, 'probe', 'loc', 'seoul', NULL, 100, 'online', NOW(), NOW())
    `,
    expectReject: true,
  },
  {
    id: "probe_offline_type_violation",
    constraint: "media_offline_type_not_null",
    sql: `
      INSERT INTO media (id, name, location, region, type, price, catalog_channel, updated_at, created_at)
      VALUES ($1, 'probe', 'loc', 'seoul', NULL, 0, 'offline', NOW(), NOW())
    `,
    expectReject: true,
  },
  {
    id: "probe_offline_price_violation",
    constraint: "media_offline_price_not_null",
    sql: `
      INSERT INTO media (id, name, location, region, type, price, catalog_channel, updated_at, created_at)
      VALUES ($1, 'probe', 'loc', 'seoul', 'dooh', NULL, 'offline', NOW(), NOW())
    `,
    expectReject: true,
  },
  {
    id: "probe_valid_online",
    constraint: "(valid online row)",
    sql: `
      INSERT INTO media (
        id, slug, name, location, region, type, price, catalog_channel,
        media_main_category, is_active, updated_at, created_at
      )
      VALUES (
        $1, $2, 'PR1b-2 Preview Smoke (search)', '서울', 'seoul',
        NULL, NULL, 'online', 'search', true, NOW(), NOW()
      )
    `,
    params: (id) => [id, SMOKE_SLUG],
    expectReject: false,
    keep: true,
  },
];

async function probeInsert(client, probe, id) {
  await client.query("BEGIN");
  try {
    const params = probe.params ? probe.params(id) : [id];
    await client.query(probe.sql, params);
    await client.query("ROLLBACK");
    return probe.expectReject
      ? { ok: false, error: "expected CHECK rejection but INSERT succeeded" }
      : { ok: true, rejected: false };
  } catch (e) {
    await client.query("ROLLBACK");
    const msg = e instanceof Error ? e.message : String(e);
    if (probe.expectReject) {
      const hit =
        msg.includes("check constraint") ||
        msg.includes("violates check") ||
        msg.includes(probe.constraint);
      return hit
        ? { ok: true, rejected: true, message: msg.slice(0, 240) }
        : { ok: false, error: `rejected but not CHECK: ${msg.slice(0, 240)}` };
    }
    return { ok: false, error: msg.slice(0, 240) };
  }
}

function runQuoteCalculatorSmoke() {
  const require = createRequire(import.meta.url);
  // tsx register when run via node --import tsx
  const { calculateQuote, QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE } =
    require("../../lib/quote-calculator.ts");
  try {
    calculateQuote({
      media: [
        {
          id: SMOKE_ID,
          name: "PR1b-2 Preview Smoke (search)",
          location: "서울",
          type: null,
          catalogChannel: "online",
          price: 0,
        },
      ],
      startDate: new Date("2025-06-01"),
      endDate: new Date("2025-06-30"),
    });
    return { ok: false, error: "calculateQuote succeeded (expected throw)" };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const hit = msg.includes(QUOTE_CALCULATOR_MISSING_DISPLAY_TYPE);
    return hit
      ? { ok: true, message: msg.slice(0, 280) }
      : { ok: false, error: msg.slice(0, 280) };
  }
}

async function fetchPreviewMediaDetail() {
  if (!previewUrl) return { skipped: true, reason: "PREVIEW_URL not set" };
  const res = await fetch(`${previewUrl}/ko/media/${SMOKE_SLUG}`, {
    redirect: "follow",
  });
  const text = await res.text();
  return {
    status: res.status,
    ok: res.ok,
    hasSearchLabel: text.includes("검색") || text.includes("search"),
    bodySnippet: text.slice(0, 400),
  };
}

async function fetchPreviewQuotePage() {
  if (!previewUrl) return { skipped: true, reason: "PREVIEW_URL not set" };
  const res = await fetch(`${previewUrl}/ko/quote`, { redirect: "follow" });
  return { status: res.status, ok: res.ok };
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const report = {
  at: new Date().toISOString(),
  smokeId: SMOKE_ID,
  previewUrl: previewUrl ?? null,
};

try {
  const constraints = await client.query(`
    SELECT conname FROM pg_constraint
    WHERE conrelid = 'media'::regclass
      AND conname IN (
        'media_online_type_null',
        'media_offline_type_not_null',
        'media_online_price_null',
        'media_offline_price_not_null'
      )
    ORDER BY conname
  `);
  report.checkConstraintsPresent = constraints.rows.map((r) => r.conname);
  report.allFourChecksPresent = report.checkConstraintsPresent.length === 4;

  const pre = await client.query(`
    SELECT COUNT(*)::int AS online FROM media WHERE catalog_channel = 'online'
  `);
  report.onlineCountBefore = pre.rows[0].online;

  report.checkProbes = {};
  for (const probe of CHECK_PROBES) {
    if (probe.keep) continue;
    report.checkProbes[probe.id] = {
      constraint: probe.constraint,
      ...(await probeInsert(client, probe, probe.id)),
    };
  }

  await client.query("DELETE FROM media WHERE id = $1", [SMOKE_ID]);

  report.smokeInsert = { ok: false };
  await client.query("BEGIN");
  try {
    const validProbe = CHECK_PROBES.find((p) => p.keep);
    await client.query(validProbe.sql, validProbe.params(SMOKE_ID));
    await client.query("COMMIT");
    report.smokeInsert = { ok: true, persisted: true };
  } catch (e) {
    await client.query("ROLLBACK");
    report.smokeInsert = {
      ok: false,
      error: e instanceof Error ? e.message.slice(0, 240) : String(e),
    };
  }

  const postInsert = await client.query(`
    SELECT id, catalog_channel, type, price, media_main_category, slug
    FROM media WHERE id = $1
  `, [SMOKE_ID]);
  report.smokeRow = postInsert.rows[0] ?? null;

  report.quoteCalculator = runQuoteCalculatorSmoke();
  report.previewHttp = {
    mediaDetail: await fetchPreviewMediaDetail(),
    quotePage: await fetchPreviewQuotePage(),
  };

  if (!keepSmoke) {
    const del = await client.query(
      "DELETE FROM media WHERE id = $1 RETURNING id",
      [SMOKE_ID],
    );
    report.smokeDeleted = del.rowCount === 1;
    const postDel = await client.query(`
      SELECT COUNT(*)::int AS online FROM media WHERE catalog_channel = 'online'
    `);
    report.onlineCountAfterDelete = postDel.rows[0].online;
    report.onlineZeroRestored = report.onlineCountAfterDelete === 0;
  } else {
    report.smokeDeleted = false;
    report.note = "Smoke row kept (--keep-smoke)";
  }

  report.pass =
    report.allFourChecksPresent &&
    Object.values(report.checkProbes).every((p) => p.ok) &&
    report.smokeRow?.catalog_channel === "online" &&
    report.smokeRow?.type === null &&
    report.smokeRow?.price === null &&
    report.quoteCalculator?.ok &&
    (keepSmoke || report.onlineZeroRestored);

  const outDir = join(root, "reports/pr1b2-preview");
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, "validation-report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log("wrote", outPath);
  process.exit(report.pass ? 0 : 1);
} finally {
  await client.end();
}
