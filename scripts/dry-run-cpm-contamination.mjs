/**
 * Commit 2 dry-run — stored CPM vs SSOT recalculation (no writes).
 *
 * Run: npx tsx scripts/dry-run-cpm-contamination.mjs
 * Out: scripts/.dry-run-cpm-contamination/report.json
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

config({ path: ".env.local" });
config({ path: ".env" });

const outDir = join("scripts", ".dry-run-cpm-contamination");
mkdirSync(outDir, { recursive: true });

const databaseUrl =
  process.env.DATABASE_URL?.trim() ||
  process.env.DATABASE_URL_UNPOOLED?.trim();

function nearEqual(a, b, rel = 0.01) {
  if (a === 0 && b === 0) return true;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / denom <= rel;
}

function classifyRatio(stored, recalc) {
  if (!(recalc > 0) || !(stored > 0)) return "uncomputable";
  const ratio = stored / recalc;
  if (ratio >= 0.85 && ratio <= 1.15) return "within_15pct";
  if (ratio < 0.85) return "understored";
  return "overstored";
}

/** Detect common unit-error multiples (stored = recalc / N or ×N) */
function detectExactMultiple(stored, recalc) {
  if (!(recalc > 0) || !(stored > 0)) return null;
  const candidates = [10, 100, 1000, 30, 31];
  for (const n of candidates) {
    if (nearEqual(stored * n, recalc, 0.02)) return `stored≈recalc/${n}`;
    if (nearEqual(recalc * n, stored, 0.02)) return `stored≈recalc×${n}`;
  }
  return null;
}

async function main() {
  if (!databaseUrl) {
    console.error("DATABASE_URL not set (.env.local)");
    process.exit(1);
  }

  const { estimateCatalogCpmWon, resolveMonthlyImpressions } = await import(
    "../lib/media-metrics.ts"
  );

  const pool = new Pool({ connectionString: databaseUrl });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      price: true,
      cpm: true,
      impressions: true,
      dailyFootfall: true,
    },
    orderBy: { name: "asc" },
  });

  const activeTotal = rows.length;
  const withStoredCpm = [];
  const diffs = [];

  for (const row of rows) {
    const stored =
      typeof row.cpm === "number" && Number.isFinite(row.cpm) && row.cpm > 0
        ? row.cpm
        : null;
    if (stored == null) continue;

    const metricsInput = {
      price: row.price,
      cpm: stored,
      impressions: row.impressions,
      monthlyFootTraffic: undefined,
      dailyFootTraffic: row.dailyFootfall,
    };
    const recalcRaw = estimateCatalogCpmWon(metricsInput);
    const recalc =
      recalcRaw != null && Number.isFinite(recalcRaw) && recalcRaw > 0
        ? Math.round(recalcRaw)
        : null;
    const monthlyImp = resolveMonthlyImpressions(metricsInput);
    const bucket = classifyRatio(stored, recalc ?? 0);
    const multiple =
      recalc != null ? detectExactMultiple(stored, recalc) : null;
    const ratio = recalc != null && recalc > 0 ? stored / recalc : null;

    const entry = {
      id: row.id,
      name: row.name,
      storedCpm: stored,
      recalcCpm: recalc,
      ratio,
      bucket,
      multiple,
      price: row.price,
      impressions: row.impressions,
      dailyFootfall: row.dailyFootfall,
      monthlyImpressionsResolved: monthlyImp,
    };
    withStoredCpm.push(entry);
    if (bucket !== "within_15pct" && bucket !== "uncomputable") {
      diffs.push(entry);
    } else if (bucket === "uncomputable") {
      diffs.push(entry);
    }
  }

  const buckets = {
    within_15pct: withStoredCpm.filter((e) => e.bucket === "within_15pct")
      .length,
    understored: withStoredCpm.filter((e) => e.bucket === "understored")
      .length,
    overstored: withStoredCpm.filter((e) => e.bucket === "overstored").length,
    uncomputable: withStoredCpm.filter((e) => e.bucket === "uncomputable")
      .length,
  };

  const multipleCounts = {};
  for (const e of withStoredCpm) {
    if (!e.multiple) continue;
    multipleCounts[e.multiple] = (multipleCounts[e.multiple] ?? 0) + 1;
  }

  const under = withStoredCpm
    .filter((e) => e.bucket === "understored" && e.recalcCpm != null)
    .sort((a, b) => (a.ratio ?? 1) - (b.ratio ?? 1));
  const over = withStoredCpm
    .filter((e) => e.bucket === "overstored" && e.recalcCpm != null)
    .sort((a, b) => (b.ratio ?? 1) - (a.ratio ?? 1));

  const report = {
    generatedAt: new Date().toISOString(),
    dryRun: true,
    writes: false,
    activeMediaTotal: activeTotal,
    activeWithStoredCpm: withStoredCpm.length,
    activeWithoutStoredCpm: activeTotal - withStoredCpm.length,
    buckets,
    multiplePatternCounts: multipleCounts,
    note:
      "within_15pct matches PR1 trust band. understored = stored < 0.85×recalc. No DB writes performed.",
    samples: {
      understoredWorst20: under.slice(0, 20),
      overstoredWorst20: over.slice(0, 20),
      within15Sample10: withStoredCpm
        .filter((e) => e.bucket === "within_15pct")
        .slice(0, 10),
      uncomputableSample10: withStoredCpm
        .filter((e) => e.bucket === "uncomputable")
        .slice(0, 10),
    },
    allDiffIds: diffs.map((e) => ({
      id: e.id,
      name: e.name,
      storedCpm: e.storedCpm,
      recalcCpm: e.recalcCpm,
      ratio: e.ratio,
      bucket: e.bucket,
      multiple: e.multiple,
    })),
  };

  const outPath = join(outDir, "report.json");
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log("=== CPM contamination dry-run (no writes) ===");
  console.log(`active media: ${activeTotal}`);
  console.log(`with stored cpm: ${withStoredCpm.length}`);
  console.log(`buckets:`, buckets);
  console.log(`multiple patterns:`, multipleCounts);
  console.log(`report: ${outPath}`);
  console.log("\nWorst understored (sample 8):");
  for (const e of under.slice(0, 8)) {
    console.log(
      `  ${e.name} | stored=${Math.round(e.storedCpm)} recalc=${e.recalcCpm} ratio=${e.ratio?.toFixed(4)} ${e.multiple ?? ""}`,
    );
  }
  if (over.length) {
    console.log("\nWorst overstored (sample 5):");
    for (const e of over.slice(0, 5)) {
      console.log(
        `  ${e.name} | stored=${Math.round(e.storedCpm)} recalc=${e.recalcCpm} ratio=${e.ratio?.toFixed(2)} ${e.multiple ?? ""}`,
      );
    }
  }

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
