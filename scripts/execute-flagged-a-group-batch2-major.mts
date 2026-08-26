#!/usr/bin/env npx tsx
/**
 * A-group Batch 2 — major-station T2 execute (17건).
 *
 * Usage:
 *   npx tsx scripts/execute-flagged-a-group-batch2-major.mts           # dry-run
 *   npx tsx scripts/execute-flagged-a-group-batch2-major.mts --execute
 */
import { config } from "dotenv";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { classifyMedia } from "../lib/metrics/classify.ts";
import {
  CPM_BOUNDS,
  MIN_IMPRESSIONS_FOR_CPM,
} from "../lib/metrics/constants.ts";
import {
  resolveContactRateWithBasis,
  resolveSovShareWithBasis,
} from "../lib/metrics/defaults.ts";
import { calcImpressions } from "../lib/metrics/impressions.ts";
import { catalogPriceFieldToWon } from "../lib/media-price-format.ts";
import { recomputeOneMedia } from "../lib/media/engine/recompute-one.ts";
import {
  BATCH_MEDIA_METRIC_SELECT,
  batchReportMeta,
  snapshotBatchMediaMetrics,
  writeBatchExecuteReport,
} from "./lib/batch-execute-report.mts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

const EXECUTE = process.argv.includes("--execute");

const PREMIUM_STATION =
  /(강남|홍대|잠실|교대|삼성|선릉|역삼|건대|신도림|사당|고속터미널|신사|압구정|양재|명동|여의도|종로|시청|서울역|동대문|합정|영등포|광화문|마포|을지로)/;
const PACKAGE = /(전체역사|All in One|턴키)/i;

type Row = {
  id: string;
  name: string;
  type: string;
  subCategory: string | null;
  mediaMainCategory: string | null;
  mediaSubCategory: string | null;
  dailyFootfall: number | null;
  impressions: number | null;
  price: number;
  factSheet: {
    spotDurationSec: number | null;
    loopDurationSec: number | null;
    playsPerHour: number | null;
    forceLoopSov: boolean | null;
  } | null;
};

function simRow(m: Row) {
  const mediaClass = classifyMedia({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory,
    mainCategory: m.mediaMainCategory,
    name: m.name,
  });
  const contact = resolveContactRateWithBasis({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory ?? undefined,
    mainCategory: m.mediaMainCategory ?? undefined,
    name: m.name,
  });
  const sov = resolveSovShareWithBasis({
    type: m.type,
    subCategory: m.subCategory ?? m.mediaSubCategory ?? undefined,
    mainCategory: m.mediaMainCategory ?? undefined,
    name: m.name,
    forceLoopSov: m.factSheet?.forceLoopSov ?? undefined,
    spotDuration: m.factSheet?.spotDurationSec ?? undefined,
    loopDuration: m.factSheet?.loopDurationSec ?? undefined,
    playsPerHour: m.factSheet?.playsPerHour ?? undefined,
  });
  const { totalImpressions } = calcImpressions({
    dailyTraffic: m.dailyFootfall ?? 0,
    contactRate: contact.value,
    sovShare: sov.value,
    units: 1,
    days: 30,
  });
  const priceWon = catalogPriceFieldToWon(m.price);
  let simCpm: number | null = null;
  if (priceWon > 0 && totalImpressions >= MIN_IMPRESSIONS_FOR_CPM) {
    simCpm = Math.round((priceWon / totalImpressions) * 1000);
  }
  const [cpmMin, cpmMax] = CPM_BOUNDS[mediaClass];
  const flags: string[] = [];
  if (simCpm != null && (simCpm < cpmMin || simCpm > cpmMax)) {
    flags.push("cpm_out_of_bounds");
  }
  return { simMonthlyImpressions: totalImpressions, simCpm, flags, priceWon };
}

function isBatch2Major(name: string, flags: string[]): boolean {
  if (PACKAGE.test(name)) return false;
  if (!/엔스퀘|맥스비전/i.test(name)) return false;
  if (!flags.includes("cpm_out_of_bounds")) return false;
  return PREMIUM_STATION.test(name);
}

async function main() {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  try {
    const flagged = await db.media.findMany({
      where: { isActive: true, reviewStatus: "flagged" },
      select: {
        id: true,
        name: true,
        type: true,
        subCategory: true,
        mediaMainCategory: true,
        mediaSubCategory: true,
        dailyFootfall: true,
        impressions: true,
        price: true,
        reviewReason: true,
        factSheet: {
          select: {
            spotDurationSec: true,
            loopDurationSec: true,
            playsPerHour: true,
            forceLoopSov: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const batch2 = flagged
      .filter(
        (m) =>
          (m.dailyFootfall ?? 0) > 0 &&
          !(m.impressions != null && m.impressions > 0),
      )
      .map((m) => {
        const sim = simRow(m);
        return { id: m.id, name: m.name, reviewReason: m.reviewReason, ...sim };
      })
      .filter((r) => isBatch2Major(r.name, r.flags));

    const results: Array<Record<string, unknown>> = [];

    for (const row of batch2) {
      if (!EXECUTE) {
        results.push({
          id: row.id,
          name: row.name,
          simMonthlyImpressions: row.simMonthlyImpressions,
          simCpm: row.simCpm,
          dryRun: true,
        });
        continue;
      }

      const beforeRow = await db.media.findUnique({
        where: { id: row.id },
        select: BATCH_MEDIA_METRIC_SELECT,
      });
      const result = await recomputeOneMedia(db, row.id, { markReviewed: true });
      const after = await db.media.findUnique({
        where: { id: row.id },
        select: BATCH_MEDIA_METRIC_SELECT,
      });
      results.push({
        id: row.id,
        name: row.name,
        expectedMonthly: row.simMonthlyImpressions,
        expectedCpm: row.simCpm,
        ...result,
        mediaBefore: beforeRow ? snapshotBatchMediaMetrics(beforeRow) : null,
        mediaAfter: after ? snapshotBatchMediaMetrics(after) : null,
      });
    }

    const report = {
      ...batchReportMeta("scripts/execute-flagged-a-group-batch2-major.mts"),
      mode: EXECUTE ? "execute" : "dry-run",
      batch2MajorCount: batch2.length,
      results,
    };

    const outPath = writeBatchExecuteReport(
      root,
      "reports/flagged-a-group-batch2-major-execute.json",
      report,
    );
    console.log(
      JSON.stringify(
        { outPath, batch2MajorCount: batch2.length, mode: report.mode },
        null,
        2,
      ),
    );
  } finally {
    await db.$disconnect();
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
