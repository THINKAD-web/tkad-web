#!/usr/bin/env npx tsx
/**
 * PR3: media → media_fact_sheets + media_computed_metrics 백필
 *
 *   npx tsx scripts/backfill-media-layers.ts --mode=dry-run [--report=reports/...]
 *   npx tsx scripts/backfill-media-layers.ts --mode=execute --confirm=YES-BACKFILL-preview
 *   npx tsx scripts/backfill-media-layers.ts --mode=rollback --confirm=YES-ROLLBACK-preview
 *   npx tsx scripts/backfill-media-layers.ts --mode=verify
 */
import { execSync } from "node:child_process";
import { Pool, type PoolClient } from "pg";
import {
  BACKFILL_MODEL_VERSION,
  BATCH_ORDER,
  MEDIA_SELECT_COLUMNS,
  type BatchName,
  type MediaRow,
  toComputedMetric,
  toFactSheet,
} from "./lib/backfill-mapping";
import {
  emptyStats,
  renderReport,
  writeReport,
  type BackfillStats,
  type BatchResult,
} from "./lib/backfill-audit";

const ALLOWED_TABLES = [
  "media",
  "media_fact_sheets",
  "media_external_signals",
  "media_computed_metrics",
] as const;

const BATCH_SIZE = 50;

function getArg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit?.slice(name.length + 1);
}

function detectEnv(url: string): "production" | "preview" | "unknown" {
  const host = new URL(url).hostname;
  if (host.includes("holy-cloud")) return "production";
  // vercel-preview Neon endpoints (legacy noisy-bread, current shiny-sun)
  if (
    host.includes("noisy-bread") ||
    host.includes("shiny-sun") ||
    host.includes("preview")
  ) {
    return "preview";
  }
  return "unknown";
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function newId(): string {
  return `bf${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
}

function assertTable(name: string): void {
  if (!(ALLOWED_TABLES as readonly string[]).includes(name)) {
    throw new Error(`Table not whitelisted: ${name}`);
  }
}

async function loadMedia(pool: Pool, limit?: number): Promise<MediaRow[]> {
  assertTable("media");
  const cols = MEDIA_SELECT_COLUMNS.join(", ");
  const lim = limit && Number.isFinite(limit) ? ` LIMIT ${limit}` : "";
  const r = await pool.query(`SELECT ${cols} FROM media ORDER BY id${lim}`);
  return r.rows as MediaRow[];
}

function filterBatch(rows: MediaRow[], batchName?: BatchName): MediaRow[] {
  if (!batchName || batchName === "all") return rows;
  const def = BATCH_ORDER.find((b) => b.name === batchName);
  if (!def) throw new Error(`Unknown batch: ${batchName}`);
  return rows.filter(def.filter);
}

async function insertFactSheet(
  client: PoolClient,
  fact: NonNullable<ReturnType<typeof toFactSheet>>,
  dryRun: boolean,
): Promise<void> {
  assertTable("media_fact_sheets");
  if (dryRun) return;
  await client.query(
    `INSERT INTO media_fact_sheets (
      id, media_id, latitude, longitude, media_subtype,
      width_mm, height_mm, dimension_source,
      operating_start, operating_end, timezone,
      station_code, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'Asia/Seoul',$11,NOW(),NOW())
    ON CONFLICT (media_id) DO UPDATE SET
      latitude = EXCLUDED.latitude,
      longitude = EXCLUDED.longitude,
      media_subtype = EXCLUDED.media_subtype,
      width_mm = EXCLUDED.width_mm,
      height_mm = EXCLUDED.height_mm,
      dimension_source = EXCLUDED.dimension_source,
      operating_start = EXCLUDED.operating_start,
      operating_end = EXCLUDED.operating_end,
      station_code = EXCLUDED.station_code,
      updated_at = NOW()`,
    [
      newId(),
      fact.mediaId,
      fact.latitude,
      fact.longitude,
      fact.mediaSubtype,
      fact.widthMm,
      fact.heightMm,
      fact.dimensionSource,
      fact.operatingStart,
      fact.operatingEnd,
      fact.stationCode,
    ],
  );
}

async function insertComputed(
  client: PoolClient,
  computed: ReturnType<typeof toComputedMetric>,
  dryRun: boolean,
): Promise<void> {
  assertTable("media_computed_metrics");
  if (dryRun) return;
  await client.query(
    `INSERT INTO media_computed_metrics (
      id, media_id, daily_impressions, cpm, visibility_score,
      reliability_grade, model_version, computed_at, source_signal_ids,
      legacy_daily_impressions, legacy_cpm, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,NULL,$5,$6,$7,$8,$9,$10,NOW(),NOW())
    ON CONFLICT (media_id) DO UPDATE SET
      daily_impressions = EXCLUDED.daily_impressions,
      cpm = EXCLUDED.cpm,
      reliability_grade = EXCLUDED.reliability_grade,
      model_version = EXCLUDED.model_version,
      computed_at = EXCLUDED.computed_at,
      legacy_daily_impressions = EXCLUDED.legacy_daily_impressions,
      legacy_cpm = EXCLUDED.legacy_cpm,
      updated_at = NOW()`,
    [
      newId(),
      computed.mediaId,
      computed.dailyImpressions,
      computed.cpm,
      computed.reliabilityGrade,
      computed.modelVersion,
      computed.computedAt,
      [],
      computed.legacyDailyImpressions,
      computed.legacyCpm,
    ],
  );
}

async function runBackfill(
  pool: Pool,
  dryRun: boolean,
  batchFilter?: BatchName,
  limit?: number,
): Promise<BackfillStats> {
  const url = process.env.DATABASE_URL!;
  const env = detectEnv(url);
  const stats = emptyStats(
    env,
    dryRun ? "dry-run" : "execute",
    new URL(url).hostname.split(".")[0],
    execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
  );

  const allRows = await loadMedia(pool, limit);
  stats.totalMediaRows = allRows.length;

  for (const row of allRows) {
    if (row.latitude == null) stats.nullSummary.latitude++;
    if (row.longitude == null) stats.nullSummary.longitude++;
  }

  const batches =
    batchFilter && batchFilter !== "all"
      ? BATCH_ORDER.filter((b) => b.name === batchFilter)
      : BATCH_ORDER;

  for (const batchDef of batches) {
    const rows = filterBatch(allRows, batchDef.name);
    const batchResult: BatchResult = {
      name: batchDef.name,
      target: rows.length,
      success: 0,
      failed: 0,
      skipped: 0,
      failures: [],
    };

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      const client = await pool.connect();
      try {
        if (!dryRun) await client.query("BEGIN");
        for (const row of chunk) {
          try {
            const fact = toFactSheet(row);
            const computed = toComputedMetric(row);
            stats.computedPlanned++;
            stats.reliabilityGrade.C = (stats.reliabilityGrade.C ?? 0) + 1;

            if (fact) {
              stats.factSheetPlanned++;
              const ds = fact.dimensionSource ?? "null";
              stats.dimensionSource[ds === "null" ? "null" : ds]++;
              await insertFactSheet(client, fact, dryRun);
            } else {
              stats.factSheetSkippedNoCoords++;
              batchResult.skipped++;
            }

            await insertComputed(client, computed, dryRun);
            batchResult.success++;
          } catch (e) {
            batchResult.failed++;
            batchResult.failures.push({
              mediaId: String(row.id),
              error: e instanceof Error ? e.message : String(e),
            });
            if (!dryRun) throw e;
          }
        }
        if (!dryRun) await client.query("COMMIT");
      } catch {
        if (!dryRun) await client.query("ROLLBACK");
      } finally {
        client.release();
      }
    }

    stats.batches.push(batchResult);
  }

  stats.skippedRules.push(
    "Production 71-col SELECT whitelist (Preview orphan 23 cols excluded)",
    "installHeightM/bearing/viewDistanceM: media 원본 없음 → skip",
    "stationCode: RAW_COPY → nearby_stations 텍스트 (§16.2 미확정)",
  );
  stats.endedAt = new Date().toISOString();
  return stats;
}

async function runRollback(pool: Pool): Promise<void> {
  assertTable("media_computed_metrics");
  assertTable("media_fact_sheets");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const cm = await client.query(
      `DELETE FROM media_computed_metrics WHERE model_version = $1`,
      [BACKFILL_MODEL_VERSION],
    );
    const fs = await client.query(`DELETE FROM media_fact_sheets`);
    await client.query("COMMIT");
    console.log(
      `Rollback: deleted ${cm.rowCount} computed, ${fs.rowCount} fact_sheets`,
    );
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

async function runVerify(pool: Pool): Promise<void> {
  const checks = [
    ["fact_sheets count", "SELECT COUNT(*)::int AS n FROM media_fact_sheets"],
    [
      "computed count",
      "SELECT COUNT(*)::int AS n FROM media_computed_metrics",
    ],
    [
      "reliability_grade",
      "SELECT reliability_grade, COUNT(*)::int AS n FROM media_computed_metrics GROUP BY 1",
    ],
    [
      "dimension_source",
      "SELECT COALESCE(dimension_source::text,'null') ds, COUNT(*)::int n FROM media_fact_sheets GROUP BY 1",
    ],
    [
      "legacy daily mismatch",
      `SELECT COUNT(*)::int n FROM media m JOIN media_computed_metrics cm ON cm.media_id=m.id
       WHERE m.daily_footfall IS NOT NULL AND cm.legacy_daily_impressions IS DISTINCT FROM m.daily_footfall`,
    ],
    [
      "coord mismatch",
      `SELECT COUNT(*)::int n FROM media m JOIN media_fact_sheets fs ON fs.media_id=m.id
       WHERE m.latitude IS DISTINCT FROM fs.latitude OR m.longitude IS DISTINCT FROM fs.longitude`,
    ],
    [
      "orphan fact",
      `SELECT COUNT(*)::int n FROM media_fact_sheets fs LEFT JOIN media m ON m.id=fs.media_id WHERE m.id IS NULL`,
    ],
  ];
  console.log("\n=== VERIFY ===\n");
  for (const [label, sql] of checks) {
    const r = await pool.query(sql);
    console.log(`--- ${label} ---`);
    console.table(r.rows);
  }
}

async function main(): Promise<void> {
  const mode = getArg("--mode") ?? "dry-run";
  const confirm = getArg("--confirm");
  const batch = getArg("--batch") as BatchName | undefined;
  const limitRaw = getArg("--limit");
  const limit = limitRaw ? parseInt(limitRaw, 10) : undefined;
  const reportPath = getArg("--report");

  const databaseUrl = process.env.DATABASE_URL?.trim();
  if (!databaseUrl) {
    console.error("DATABASE_URL not set");
    process.exit(1);
  }

  const env = detectEnv(databaseUrl);
  if (env === "unknown") {
    console.error("환경 판정 실패");
    process.exit(1);
  }

  console.log(`\n환경: ${env.toUpperCase()}\n`);

  if (mode === "execute") {
    const expected =
      env === "production"
        ? "YES-BACKFILL-production"
        : "YES-BACKFILL-preview";
    if (confirm !== expected) {
      console.error(`--confirm=${expected} 필요`);
      process.exit(1);
    }
    if (env === "production") {
      console.log("Production — 5초 대기…");
      await sleep(5000);
    }
  }

  if (mode === "rollback") {
    const expected =
      env === "production"
        ? "YES-ROLLBACK-production"
        : "YES-ROLLBACK-preview";
    if (confirm !== expected) {
      console.error(`--confirm=${expected} 필요`);
      process.exit(1);
    }
  }

  const pool = new Pool({ connectionString: databaseUrl, max: 5 });
  try {
    if (mode === "verify") {
      await runVerify(pool);
      return;
    }
    if (mode === "rollback") {
      await runRollback(pool);
      return;
    }
    if (mode !== "dry-run" && mode !== "execute") {
      console.error(`Unknown mode: ${mode}`);
      process.exit(1);
    }

    const stats = await runBackfill(pool, mode === "dry-run", batch, limit);
    const md = renderReport(stats);
    console.log(md);
    if (reportPath) writeReport(reportPath, stats);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
