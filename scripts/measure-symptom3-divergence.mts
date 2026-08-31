/**
 * SYMPTOM3 — 카드(raw) vs 플래너(SOV 보정) 노출 divergence 실측.
 * 읽기 전용. DB에 쓰지 않는다.
 *
 * Usage:
 *   npx tsx scripts/measure-symptom3-divergence.mts
 *   npx tsx scripts/measure-symptom3-divergence.mts --out=reports/symptom3-divergence.json
 */
import { config } from "dotenv";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { calcImpressions } from "../lib/metrics/impressions.ts";
import { classifyMedia } from "../lib/metrics/classify.ts";
import {
  resolveContactRateWithBasis,
  resolveSovShareWithBasis,
} from "../lib/metrics/defaults.ts";
import { resolveMonthlyImpressions } from "../lib/media-metrics.ts";
import type { MediaItem } from "../lib/media-data.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

function parseArgs() {
  const outArg = process.argv.find((a) => a.startsWith("--out="));
  return {
    out: outArg ? outArg.slice("--out=".length) : "reports/symptom3-divergence.json",
  };
}

function resolveRawDaily(m: MediaItem): number {
  if (m.dailyFootTraffic != null && m.dailyFootTraffic > 0) {
    return m.dailyFootTraffic;
  }
  const monthly = resolveMonthlyImpressions(m);
  if (monthly > 0) return Math.round(monthly / 30);
  return 0;
}

function resolvePlannerDaily(m: MediaItem, units = 1): number {
  const contact = resolveContactRateWithBasis({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory,
    mainCategory: m.mediaCategory?.[0],
    name: m.name,
  });
  const sov = resolveSovShareWithBasis({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory,
    mainCategory: m.mediaCategory?.[0],
    name: m.name,
    forceLoopSov: m.forceLoopSov,
    spotDuration: m.spotDurationSec,
    loopDuration: m.loopDurationSec,
    playsPerHour: m.playsPerHour,
  });
  const { totalImpressions } = calcImpressions({
    dailyTraffic: m.dailyFootTraffic ?? 0,
    contactRate: contact.value,
    sovShare: sov.value,
    units,
    days: 1,
  });
  return totalImpressions;
}

function ratioBucket(ratio: number): string {
  if (ratio >= 10) return "10x+";
  if (ratio >= 5) return "5x-10x";
  if (ratio >= 2) return "2x-5x";
  if (ratio >= 1.5) return "1.5x-2x";
  if (ratio >= 1.01) return "1.01x-1.5x";
  if (ratio <= 0.67) return "0.67x-1x (planner higher)";
  return "≈1x";
}

async function main() {
  const { out } = parseArgs();
  const dbUrl = normalizePgDatabaseUrl(process.env.DATABASE_URL);
  if (!dbUrl) {
    console.error("DATABASE_URL required");
    process.exit(1);
  }

  const pool = new Pool({ connectionString: dbUrl });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await prisma.media.findMany({
    where: { isActive: true },
    include: {
      factSheet: true,
      computedMetric: true,
    },
  });

  type Row = {
    id: string;
    slug: string | null;
    name: string;
    type: string;
    mediaClass: string;
    subCategory: string | null;
    rawDaily: number;
    cardMonthly: number;
    plannerDaily: number;
    ratio: number | null;
    bucket: string;
    sovBasis: string;
    contactBasis: string;
  };

  const measured: Row[] = [];
  let skippedNoTraffic = 0;
  let skippedNoPlanner = 0;

  for (const row of rows) {
    const m = {
      ...(row as unknown as MediaItem),
      dailyFootTraffic:
        (row as { dailyFootfall?: number | null }).dailyFootfall ??
        (row as unknown as MediaItem).dailyFootTraffic ??
        0,
      subCategory: row.subCategory ?? row.mediaSubCategory,
      spotDurationSec: row.factSheet?.spotDurationSec,
      loopDurationSec: row.factSheet?.loopDurationSec,
      playsPerHour: row.factSheet?.playsPerHour,
      forceLoopSov: row.factSheet?.forceLoopSov ?? undefined,
    } satisfies MediaItem;
    const rawDaily = resolveRawDaily(m);
    const cardMonthly = resolveMonthlyImpressions(m);
    const plannerDaily = resolvePlannerDaily(m);

    if (rawDaily <= 0 && cardMonthly <= 0) {
      skippedNoTraffic++;
      continue;
    }
    if (plannerDaily <= 0) {
      skippedNoPlanner++;
    }

    const effectiveRaw = rawDaily > 0 ? rawDaily : Math.round(cardMonthly / 30);
    const ratio =
      effectiveRaw > 0 && plannerDaily > 0
        ? effectiveRaw / plannerDaily
        : null;

    const contact = resolveContactRateWithBasis({
      type: m.type,
      subCategory: m.subCategory ?? m.mediaSubCategory,
      mainCategory: m.mediaCategory?.[0],
      name: m.name,
    });
    const sov = resolveSovShareWithBasis({
      type: m.type,
      subCategory: m.subCategory ?? m.mediaSubCategory,
      mainCategory: m.mediaCategory?.[0],
      name: m.name,
      forceLoopSov: m.forceLoopSov,
      spotDuration: m.spotDurationSec,
      loopDuration: m.loopDurationSec,
      playsPerHour: m.playsPerHour,
    });

    measured.push({
      id: row.id,
      slug: row.slug,
      name: row.name,
      type: row.type ?? "unknown",
      mediaClass: classifyMedia({
        type: row.type ?? "",
        subCategory: row.subCategory ?? undefined,
        mainCategory: row.mainCategory ?? undefined,
        name: row.name,
      }),
      subCategory: row.subCategory,
      rawDaily: effectiveRaw,
      cardMonthly,
      plannerDaily,
      ratio,
      bucket: ratio != null ? ratioBucket(ratio) : "n/a",
      sovBasis: sov.basis,
      contactBasis: contact.basis,
    });
  }

  const withRatio = measured.filter((r) => r.ratio != null) as (Row & {
    ratio: number;
  })[];

  const buckets: Record<string, number> = {};
  for (const r of withRatio) {
    buckets[r.bucket] = (buckets[r.bucket] ?? 0) + 1;
  }

  const byType: Record<string, { total: number; gte2x: number; gte5x: number; gte10x: number }> =
    {};
  for (const r of withRatio) {
    const t = byType[r.type] ?? { total: 0, gte2x: 0, gte5x: 0, gte10x: 0 };
    t.total++;
    if (r.ratio >= 2) t.gte2x++;
    if (r.ratio >= 5) t.gte5x++;
    if (r.ratio >= 10) t.gte10x++;
    byType[r.type] = t;
  }

  const byClass: Record<string, { total: number; gte2x: number }> = {};
  for (const r of withRatio) {
    const c = byClass[r.mediaClass] ?? { total: 0, gte2x: 0 };
    c.total++;
    if (r.ratio >= 2) c.gte2x++;
    byClass[r.mediaClass] = c;
  }

  const topDivergent = [...withRatio]
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, 25)
    .map((r) => ({
      slug: r.slug,
      name: r.name.slice(0, 50),
      type: r.type,
      mediaClass: r.mediaClass,
      rawDaily: r.rawDaily,
      plannerDaily: r.plannerDaily,
      ratio: Math.round(r.ratio * 100) / 100,
      cardMonthly: r.cardMonthly,
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    totalActive: rows.length,
    measured: measured.length,
    skippedNoTraffic,
    skippedNoPlanner,
    withComparableRatio: withRatio.length,
    bucketCounts: buckets,
    thresholdCounts: {
      gte1_5x: withRatio.filter((r) => r.ratio >= 1.5).length,
      gte2x: withRatio.filter((r) => r.ratio >= 2).length,
      gte5x: withRatio.filter((r) => r.ratio >= 5).length,
      gte10x: withRatio.filter((r) => r.ratio >= 10).length,
      gte15x: withRatio.filter((r) => r.ratio >= 15).length,
    },
    byType,
    byClass,
    topDivergent,
    medianRatio:
      withRatio.length > 0
        ? withRatio.map((r) => r.ratio).sort((a, b) => a - b)[
            Math.floor(withRatio.length / 2)
          ]
        : null,
  };

  mkdirSync(dirname(resolve(root, out)), { recursive: true });
  writeFileSync(resolve(root, out), JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
