#!/usr/bin/env npx tsx
/**
 * PR5: 전 매체 metric 재계산 배치 (v0 fallback pass-through).
 *
 *   npx tsx scripts/recompute-all-media.ts --mode=dry-run
 *   npx tsx scripts/recompute-all-media.ts --mode=execute --confirm=YES-RECOMPUTE-preview
 *   npx tsx scripts/recompute-all-media.ts --mode=execute --confirm=YES-RECOMPUTE-production --only-stale --stale-days=30
 *   npx tsx scripts/recompute-all-media.ts --mode=verify
 */
import { execSync } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Pool, type PoolClient } from "pg";
import { config as loadEnv } from "dotenv";
import { computeMetric } from "../lib/media/engine/compute";
import { MODEL_VERSIONS } from "../lib/media/engine/constants";
import type { EngineInput } from "../lib/media/engine/types";

loadEnv({ path: ".env.local" });
loadEnv({ path: ".env" });

const ALLOWED_TABLES = [
  "media",
  "media_fact_sheets",
  "media_external_signals",
  "media_computed_metrics",
] as const;

const BATCH_SIZE = 50;

type Row = {
  media_id: string;
  daily_impressions: number;
  cpm: number;
  legacy_daily_impressions: number | null;
  legacy_cpm: number | null;
  model_version: string;
  computed_at: Date;
};

type Stats = {
  env: string;
  mode: string;
  host: string;
  gitSha: string;
  scope: string;
  planned: number;
  processed: number;
  promoted: number;
  valueChanges: number;
  failures: { mediaId: string; error: string }[];
  skipped: number;
};

function getArg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`${name}=`));
  return hit?.slice(name.length + 1);
}

function hasFlag(name: string): boolean {
  return process.argv.includes(name);
}

function detectEnv(url: string): "production" | "preview" | "unknown" {
  const host = new URL(url).hostname;
  if (host.includes("holy-cloud")) return "production";
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

function assertTable(name: string): void {
  if (!(ALLOWED_TABLES as readonly string[]).includes(name)) {
    throw new Error(`Table not whitelisted: ${name}`);
  }
}

function buildInput(row: Row): EngineInput {
  return {
    mediaId: row.media_id,
    fact: null,
    signals: [],
    legacy: {
      dailyImpressions: row.legacy_daily_impressions,
      cpm: row.legacy_cpm,
    },
    current: {
      dailyImpressions: row.daily_impressions,
      cpm: row.cpm,
    },
  };
}

async function loadTargets(
  pool: Pool,
  opts: { onlyStale: boolean; staleDays: number; scopeAll: boolean },
): Promise<Row[]> {
  assertTable("media_computed_metrics");
  assertTable("media");
  const clauses: string[] = ["1=1"];
  if (!opts.scopeAll) {
    clauses.push(`cm.model_version = '${MODEL_VERSIONS.LEGACY_MIGRATION_V1}'`);
  }
  if (opts.onlyStale) {
    clauses.push(
      `cm.computed_at < NOW() - INTERVAL '${Math.max(1, opts.staleDays)} days'`,
    );
  }
  const sql = `
    SELECT
      cm.media_id,
      cm.daily_impressions,
      cm.cpm,
      cm.legacy_daily_impressions,
      cm.legacy_cpm,
      cm.model_version,
      cm.computed_at
    FROM media_computed_metrics cm
    JOIN media m ON m.id = cm.media_id
    WHERE ${clauses.join(" AND ")}
    ORDER BY cm.media_id
  `;
  const r = await pool.query(sql);
  return r.rows as Row[];
}

async function applyUpdate(
  client: PoolClient,
  row: Row,
  dryRun: boolean,
  stats: Stats,
): Promise<void> {
  const input = buildInput(row);
  const { output, engineVersion } = computeMetric(input);

  const dailyChanged = row.daily_impressions !== output.dailyImpressions;
  const cpmChanged = row.cpm !== output.cpm;
  if (dailyChanged || cpmChanged) {
    stats.valueChanges++;
  }
  if (row.model_version !== engineVersion) {
    stats.promoted++;
  }

  if (dryRun) return;

  assertTable("media_computed_metrics");
  await client.query(
    `UPDATE media_computed_metrics SET
      daily_impressions = $1,
      cpm = $2,
      hourly_impressions = NULL,
      visibility_score = NULL,
      reliability_grade = 'C',
      model_version = $3,
      computed_at = $4,
      source_signal_ids = $5,
      updated_at = NOW()
    WHERE media_id = $6`,
    [
      output.dailyImpressions,
      output.cpm,
      engineVersion,
      output.computedAt,
      output.sourceSignalIds,
      row.media_id,
    ],
  );
}

function renderReport(stats: Stats): string {
  const lines = [
    `# PR5 engine v0 batch recompute (${stats.mode})`,
    "",
    `**Environment**: ${stats.env} (${stats.host})`,
    `**Git SHA**: ${stats.gitSha}`,
    `**Scope**: ${stats.scope}`,
    `**Engine**: ${MODEL_VERSIONS.V0_FALLBACK}`,
    "",
    "## Summary",
    "",
    `| Metric | Count |`,
    `|--------|------:|`,
    `| Planned | ${stats.planned} |`,
    `| Processed | ${stats.processed} |`,
    `| modelVersion promotion | ${stats.promoted} |`,
    `| Value changes (should be 0 for v0) | ${stats.valueChanges} |`,
    `| Skipped | ${stats.skipped} |`,
    `| Failures | ${stats.failures.length} |`,
    "",
  ];
  if (stats.failures.length > 0) {
    lines.push("## Failures", "");
    for (const f of stats.failures) {
      lines.push(`- \`${f.mediaId}\`: ${f.error}`);
    }
    lines.push("");
  }
  if (stats.valueChanges > 0) {
    lines.push(
      "> ⚠️ v0 pass-through expects **0 value changes**. Investigate before execute.",
      "",
    );
  }
  return lines.join("\n");
}

type VerifyResult = {
  modelVersions: { model_version: string; c: number }[];
  dailyMismatch: number;
  knownExceptionCount: number;
  cpmMismatch: number;
  grades: { reliability_grade: string; c: number }[];
  maxComputedAt: Date | null;
  pass: boolean;
};

async function runVerify(pool: Pool): Promise<VerifyResult> {
  assertTable("media_computed_metrics");

  const modelVersions = (
    await pool.query(
      `SELECT model_version, COUNT(*)::int AS c FROM media_computed_metrics GROUP BY model_version ORDER BY 1`,
    )
  ).rows as { model_version: string; c: number }[];

  const dailyMismatch = (
    await pool.query(
      `SELECT COUNT(*)::int AS c FROM media_computed_metrics
       WHERE daily_impressions != COALESCE(legacy_daily_impressions, 0)
         AND NOT (
           legacy_daily_impressions IS NULL
           AND daily_impressions > 0
         )`,
    )
  ).rows[0].c as number;

  const knownExceptionCount = (
    await pool.query(
      `SELECT COUNT(*)::int AS c FROM media_computed_metrics
       WHERE legacy_daily_impressions IS NULL AND daily_impressions > 0`,
    )
  ).rows[0].c as number;

  const cpmMismatch = (
    await pool.query(
      `SELECT COUNT(*)::int AS c FROM media_computed_metrics
       WHERE cpm != COALESCE(legacy_cpm, 0)`,
    )
  ).rows[0].c as number;

  const grades = (
    await pool.query(
      `SELECT reliability_grade, COUNT(*)::int AS c FROM media_computed_metrics GROUP BY reliability_grade ORDER BY 1`,
    )
  ).rows as { reliability_grade: string; c: number }[];

  const maxComputedAt = (
    await pool.query(`SELECT MAX(computed_at) AS max FROM media_computed_metrics`)
  ).rows[0].max as Date | null;

  const pass = dailyMismatch === 0 && cpmMismatch === 0;

  return {
    modelVersions,
    dailyMismatch,
    knownExceptionCount,
    cpmMismatch,
    grades,
    maxComputedAt,
    pass,
  };
}

function renderVerifyReport(env: string, host: string, verify: VerifyResult): string {
  const lines = [
    `# PR5 engine v0 verify SQL`,
    "",
    `**Environment**: ${env} (${host})`,
    "",
    "## Results",
    "",
    "| Check | Expected | Actual | Pass |",
    "|-------|----------|--------|:----:|",
  ];

  const v0 = verify.modelVersions.find((r) => r.model_version === MODEL_VERSIONS.V0_FALLBACK)?.c ?? 0;
  const legacy = verify.modelVersions.find((r) => r.model_version === MODEL_VERSIONS.LEGACY_MIGRATION_V1)?.c ?? 0;
  lines.push(`| v0-fallback count | 821 | ${v0} | ${v0 === 821 ? "✓" : "✗"} |`);
  lines.push(`| legacy-migration-v1 count | 0 | ${legacy} | ${legacy === 0 ? "✓" : "✗"} |`);
  lines.push(
    `| daily_impressions mismatch (edge excluded) | 0 | ${verify.dailyMismatch} | ${verify.dailyMismatch === 0 ? "✓" : "✗"} |`,
  );
  lines.push(
    `| known exception (legacy NULL, daily > 0) | 1 | ${verify.knownExceptionCount} | ${verify.knownExceptionCount === 1 ? "✓" : "✗"} |`,
  );
  lines.push(
    `| cpm mismatch | 0 | ${verify.cpmMismatch} | ${verify.cpmMismatch === 0 ? "✓" : "✗"} |`,
  );
  const gradeC = verify.grades.find((g) => g.reliability_grade === "C")?.c ?? 0;
  lines.push(`| grade C | 821 | ${gradeC} | ${gradeC === 821 ? "✓" : "✗"} |`);
  lines.push(
    `| max(computed_at) | recent | ${verify.maxComputedAt?.toISOString() ?? "null"} | — |`,
  );
  lines.push("", `**Overall**: ${verify.pass ? "PASS" : "FAIL"}`, "");
  lines.push(
    "## Known Exception (PR3 백필 유래)",
    "",
    "- 1건: `mediaId=cmp3cfdsy000004jo3v38d9f4`, name=\"헤스티아 (익스클루시브) 버스 외부 LED 전광판\"",
    "- `legacy_daily_impressions=NULL`, `daily_impressions=1,733,333`",
    "- 원인: `daily_footfall` NULL이지만 `impressions=52,000,000` 존재",
    "- 백필 스크립트 `toComputedMetric()` (impressions/30 fallback)에 의해 저장",
    "- v0 pass-through는 이 값 유지 (변경 없음)",
    "- 향후 v1에서도 동일 규칙 적용 예정",
    "",
  );
  return lines.join("\n");
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL required");

  const modeRaw = getArg("--mode") ?? "dry-run";
  const mode =
    modeRaw === "execute"
      ? "execute"
      : modeRaw === "verify"
        ? "verify"
        : "dry-run";
  const env = detectEnv(url);
  const host = new URL(url).hostname.split(".")[0];

  if (mode === "verify") {
    const pool = new Pool({ connectionString: url });
    try {
      const verify = await runVerify(pool);
      const report = renderVerifyReport(env, host, verify);
      console.log(report);
      const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 13);
      const outPath = join(
        process.cwd(),
        "reports",
        `pr5-engine-v0-${env === "production" ? "prod" : "preview"}-verify-${ts}.md`,
      );
      mkdirSync(join(process.cwd(), "reports"), { recursive: true });
      writeFileSync(outPath, report);
      console.log(`\nWrote ${outPath}`);
      if (!verify.pass) process.exitCode = 1;
    } finally {
      await pool.end();
    }
    return;
  }
  const confirm = getArg("--confirm");
  const expectedConfirm = `YES-RECOMPUTE-${env === "production" ? "production" : "preview"}`;

  if (mode === "execute") {
    if (confirm !== expectedConfirm) {
      throw new Error(
        `Execute requires --confirm=${expectedConfirm} (got ${confirm ?? "none"})`,
      );
    }
    if (env === "production") {
      console.log("Production execute in 5 seconds… Ctrl+C to abort");
      await sleep(5000);
    }
  }

  const onlyStale = hasFlag("--only-stale");
  const staleDays = Number(getArg("--stale-days") ?? "30") || 30;
  const scopeAll = hasFlag("--scope=all");

  const pool = new Pool({ connectionString: url });
  const stats: Stats = {
    env,
    mode,
    host,
    gitSha: execSync("git rev-parse HEAD", { encoding: "utf8" }).trim(),
    scope: scopeAll
      ? "all"
      : onlyStale
        ? `stale>${staleDays}d`
        : `model_version=${MODEL_VERSIONS.LEGACY_MIGRATION_V1}`,
    planned: 0,
    processed: 0,
    promoted: 0,
    valueChanges: 0,
    failures: [],
    skipped: 0,
  };

  try {
    const rows = await loadTargets(pool, { onlyStale, staleDays, scopeAll });
    stats.planned = rows.length;

    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const client = await pool.connect();
      try {
        if (mode === "execute") await client.query("BEGIN");
        for (const row of batch) {
          try {
            await applyUpdate(client, row, mode === "dry-run", stats);
            stats.processed++;
          } catch (e) {
            stats.failures.push({
              mediaId: row.media_id,
              error: e instanceof Error ? e.message : String(e),
            });
          }
        }
        if (mode === "execute") await client.query("COMMIT");
      } catch (e) {
        if (mode === "execute") await client.query("ROLLBACK");
        throw e;
      } finally {
        client.release();
      }
    }
  } finally {
    await pool.end();
  }

  const report = renderReport(stats);
  console.log(report);

  const ts = new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .slice(0, 13);
  const reportsDir = join(process.cwd(), "reports");
  mkdirSync(reportsDir, { recursive: true });
  const suffix = mode === "dry-run" ? "dryrun" : "execute";
  const envLabel = env === "production" ? "prod" : "preview";
  const outPath = join(
    reportsDir,
    `pr5-engine-v0-${envLabel}-${suffix}-${ts}.md`,
  );
  writeFileSync(outPath, report);
  console.log(`\nWrote ${outPath}`);

  if (stats.failures.length > 0 || stats.valueChanges > 0) {
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
