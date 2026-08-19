/**
 * PR-3 Phase 4a-1 — coverage snapshot schema migrate dry-run (read-only, no DDL)
 * Phase 3-1 패턴: host 확인 → pending migration → 영향 범위 집계 → JSON 리포트
 *
 * Usage:
 *   npx tsx scripts/pr3-phase4a-41-schema-dry-run.mts
 *   DATABASE_URL=... npx tsx scripts/pr3-phase4a-41-schema-dry-run.mts
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

const PHASE4A = "20260820120000_pr3_phase4a_coverage_snapshot";

const COVERAGE_COLS = ["coverage_population", "coverage_dongs"] as const;

type MigrationRow = {
  migration_name: string;
  finished_at: Date | null;
  rolled_back_at: Date | null;
};

type ColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: string;
  column_default: string | null;
};

async function main() {
  const envPath = process.env.DATABASE_URL
    ? undefined
    : resolve(root, ".env.vercel.production");
  if (envPath) config({ path: envPath });

  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!url) throw new Error("DATABASE_URL required");

  const hostMatch = url.match(/@([^/]+)/);
  const host = hostMatch?.[1] ?? "unknown";
  const isProd = host.includes("ep-holy-cloud");
  const isPreview = host.includes("ep-shiny-sun");

  const pool = new Pool({ connectionString: url });
  const client = await pool.connect();

  try {
    const [{ count: computedTotal }] = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM media_computed_metrics`,
    ).then((r) => r.rows);

    const [{ count: mediaActive }] = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM media WHERE is_active = true`,
    ).then((r) => r.rows);

    const migrationRow = await client
      .query<MigrationRow>(
        `SELECT migration_name, finished_at, rolled_back_at
         FROM _prisma_migrations
         WHERE migration_name = $1`,
        [PHASE4A],
      )
      .then((r) => r.rows[0] ?? null);

    const coverageColumns = await client
      .query<ColumnRow>(
        `SELECT column_name, data_type, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'media_computed_metrics'
           AND column_name = ANY($1::text[])`,
        [COVERAGE_COLS],
      )
      .then((r) => r.rows);

    const colMap = new Map(coverageColumns.map((c) => [c.column_name, c]));

    const orphanOnMedia = await client
      .query<{ column_name: string }>(
        `SELECT column_name
         FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'media'
           AND column_name = ANY($1::text[])`,
        [COVERAGE_COLS],
      )
      .then((r) => r.rows.map((x) => x.column_name));

    const coverageNonNull = colMap.has("coverage_dongs")
      ? await client
          .query<{ col: string; cnt: string }>(
            `SELECT 'coverage_population' AS col,
                    COUNT(*) FILTER (WHERE coverage_population IS NOT NULL)::text AS cnt
             FROM media_computed_metrics
             UNION ALL
             SELECT 'coverage_dongs',
                    COUNT(*) FILTER (WHERE coverage_dongs IS NOT NULL)::text
             FROM media_computed_metrics`,
          )
          .then((r) => r.rows)
      : null;

    const phase4aApplied =
      migrationRow != null &&
      migrationRow.finished_at != null &&
      migrationRow.rolled_back_at == null;

    const coverageColsExist = COVERAGE_COLS.every((c) => colMap.has(c));
    const wouldApplyPhase4a = !phase4aApplied;

    const report = {
      generatedAt: new Date().toISOString(),
      host,
      isProd,
      isPreview,
      mode: "dry-run",
      scope: "schema-migrate-only",
      backfillIncluded: false,
      migrations: {
        phase4a: {
          name: PHASE4A,
          applied: phase4aApplied,
          wouldRunOnDeploy: wouldApplyPhase4a,
          ddl: [
            "ADD COLUMN IF NOT EXISTS coverage_population INTEGER",
            "ADD COLUMN IF NOT EXISTS coverage_dongs JSONB",
          ],
          expectedBehavior: phase4aApplied
            ? "skip (already in _prisma_migrations)"
            : coverageColsExist
              ? "apply migration file — columns exist, IF NOT EXISTS no-op expected"
              : "apply DDL — 2 nullable columns on media_computed_metrics",
        },
        pendingOnDeploy: wouldApplyPhase4a ? [PHASE4A] : [],
      },
      tables: {
        media_computed_metrics: {
          totalRows: Number(computedTotal),
          coverageColumns: Object.fromEntries(
            COVERAGE_COLS.map((c) => [
              c,
              {
                exists: colMap.has(c),
                ...(colMap.get(c)
                  ? {
                      dataType: colMap.get(c)!.data_type,
                      nullable: colMap.get(c)!.is_nullable === "YES",
                      default: colMap.get(c)!.column_default,
                    }
                  : { afterMigrate: "NULL" }),
              },
            ]),
          ),
          coverageNonNullCounts: coverageNonNull
            ? Object.fromEntries(coverageNonNull.map((r) => [r.col, Number(r.cnt)]))
            : "columns_not_yet_present",
        },
        media: {
          activeCount: Number(mediaActive),
          orphanCoverageColumns: orphanOnMedia,
        },
      },
      dataImpact: {
        updates: 0,
        deletes: 0,
        existingColumnChanges: 0,
        newColumnsOnly: COVERAGE_COLS.filter((c) => !colMap.has(c)),
        existingRowsAffected: wouldApplyPhase4a ? Number(computedTotal) : 0,
        impactSummary:
          "ADD COLUMN IF NOT EXISTS only — 기존 컬럼/값 변경 없음. 신규 coverage 컬럼은 NULL만 추가.",
        risks: [] as string[],
      },
      verdict: "pending" as "safe" | "blocked" | "pending",
    };

    if (orphanOnMedia.length > 0) {
      report.dataImpact.risks.push(
        `Preview orphan: media.${orphanOnMedia.join(",")} exists — Phase 4a targets media_computed_metrics only; no data copy planned`,
      );
    }
    if (coverageColsExist && wouldApplyPhase4a) {
      report.dataImpact.risks.push(
        "coverage columns already exist on media_computed_metrics — migrate should no-op via IF NOT EXISTS",
      );
    }
    if (!isProd && !isPreview) {
      report.dataImpact.risks.push("host is not known prod/preview — verify DATABASE_URL");
    }

    if (report.dataImpact.risks.length === 0 || report.dataImpact.risks.every((r) => r.includes("no-op") || r.includes("orphan"))) {
      report.verdict = "safe";
    }

    const suffix = isPreview
      ? "preview"
      : isProd
        ? "production"
        : host.replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
    const outPath = resolve(root, `reports/pr3-phase4a-41-dry-run-${suffix}.json`);
    writeFileSync(outPath, JSON.stringify(report, null, 2));

    console.log(JSON.stringify(report, null, 2));
    console.log(`\nWrote ${outPath}`);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
