#!/usr/bin/env npx tsx
/**
 * Phase 4a-4 — Reach 배선 검증 (production/preview DB + 엔진)
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { fetchMoisPopulationIndex } from "../lib/metrics/mois-population-index.ts";
import {
  prismaMediaToMediaItem,
  type MediaWithAdvertiserExecutions,
} from "../lib/public-media-catalog.ts";
import { calcMixMetrics } from "../lib/planner/brief/mix-metrics.ts";
import { briefToTargetSpec } from "../lib/planner/brief/reach-adapter.ts";
import type { MediaItem } from "../lib/media-data.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

const BRIEF = {
  budgetInputWon: 30_000_000,
  budgetMode: "total" as const,
  regionCodes: ["11", "41"] as const,
  genders: ["female"] as const,
  ageBands: ["20s", "30s"] as const,
  goal: null,
  industry: null,
  flightStart: "2026-08-01",
  flightEnd: "2026-08-14",
  freeText: "3천만원 서울경기 2030 여성 2주",
};

function createPrisma(url: string): PrismaClient {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 3,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL required");

  const host = url.match(/@([^/]+)/)?.[1] ?? "unknown";
  const isProd = host.includes("ep-holy-cloud");
  const db = createPrisma(url);

  const popIndex = await fetchMoisPopulationIndex(db);
  const rows = await db.media.findMany({
    where: {
      isActive: true,
      country: "KR",
      regionMain: { in: ["seoul", "gyeonggi"] },
    },
    include: {
      computedMetric: {
        select: {
          demoGenderSplit: true,
          demoAgeSplit: true,
          demoSourceSignalIds: true,
          coverageDongs: true,
          coveragePopulation: true,
        },
      },
    },
    orderBy: { dailyFootfall: "desc" },
    take: 200,
  });

  const catalog: MediaItem[] = rows.map((r) =>
    prismaMediaToMediaItem(r as MediaWithAdvertiserExecutions, popIndex),
  );

  const withCoverage = catalog.filter((m) => (m.coverageDongs?.length ?? 0) > 0);
  const days = 14;
  const target = briefToTargetSpec(BRIEF);

  const pick = withCoverage.slice(0, 10);
  const lines1 = pick.slice(0, 1).map((m) => ({ media: m, units: 1 }));
  const lines10 = pick.slice(0, 10).map((m) => ({ media: m, units: 1 }));

  const gangnam = withCoverage.filter((m) => m.district?.includes("강남"));
  const sameGuLines = gangnam.slice(0, 2).map((m) => ({ media: m, units: 1 }));
  const multiGuLines = [
    ...gangnam.slice(0, 1),
    ...withCoverage.filter((m) => m.district?.includes("서초")).slice(0, 1),
    ...withCoverage.filter((m) => m.district?.includes("마포")).slice(0, 1),
  ].map((m) => ({ media: m, units: 1 }));

  const m1 = calcMixMetrics({ lines: lines1, days, budgetWon: BRIEF.budgetInputWon, target });
  const m10 = calcMixMetrics({ lines: lines10, days, budgetWon: BRIEF.budgetInputWon, target });
  const mSame = calcMixMetrics({ lines: sameGuLines, days, budgetWon: BRIEF.budgetInputWon, target });
  const mMulti = calcMixMetrics({ lines: multiGuLines, days, budgetWon: BRIEF.budgetInputWon, target });

  const partialLines = [
    ...(lines1.length ? lines1 : []),
    {
      media: {
        ...pick[0]!,
        id: "no-cov-fixture",
        coverageDongs: undefined,
        coveragePopulation: undefined,
      },
      units: 1,
    },
  ];
  const mPartial = calcMixMetrics({
    lines: partialLines,
    days,
    budgetWon: BRIEF.budgetInputWon,
    target,
  });

  const report = {
    generatedAt: new Date().toISOString(),
    host,
    isProd,
    scenario: "3천만원 서울·경기 2030 여성 2주",
    catalog: {
      seoulGyeonggiSampled: catalog.length,
      withCoverage: withCoverage.length,
      moisSignals: popIndex.size,
    },
    briefScenario: {
      mediaCount: lines10.length,
      days,
      netReach: m10.netReach?.value ?? null,
      reachRate: m10.reachRate?.value ?? null,
      reachRatePct: m10.reachRate ? (m10.reachRate.value * 100).toFixed(2) : null,
      frequency: m10.frequency?.value ?? null,
      grp: m10.grp?.value ?? null,
      basis: m10.netReach?.basis ?? null,
      reachRateLe1: m10.reachRate ? m10.reachRate.value <= 1 : null,
      excludedCount: m10.reachMeta?.excludedCount ?? 0,
      allFourMetricsPresent:
        m10.netReach != null &&
        m10.reachRate != null &&
        m10.frequency != null &&
        m10.grp != null,
    },
    patterns: {
      oneVsTen: {
        reach1: m1.netReach?.value ?? null,
        reach10: m10.netReach?.value ?? null,
        reachIncreases: (m10.netReach?.value ?? 0) > (m1.netReach?.value ?? 0),
        reachSublinear:
          (m10.netReach?.value ?? 0) < (m1.netReach?.value ?? 0) * 10,
        freq1: m1.frequency?.value ?? null,
        freq10: m10.frequency?.value ?? null,
        frequencyIncreases:
          (m10.frequency?.value ?? 0) > (m1.frequency?.value ?? 0),
      },
      sameGuVsMultiGu: {
        sameGuReach: mSame.netReach?.value ?? null,
        multiGuReach: mMulti.netReach?.value ?? null,
        multiGuHigher:
          (mMulti.netReach?.value ?? 0) > (mSame.netReach?.value ?? 0),
        sameGuCount: sameGuLines.length,
        multiGuCount: multiGuLines.length,
      },
      partialCoverageMix: {
        excludedCount: mPartial.reachMeta?.excludedCount ?? 0,
        stillHasReach: mPartial.netReach != null,
        excludedNotice: (mPartial.reachMeta?.excludedCount ?? 0) > 0,
      },
    },
    verdict:
      m10.netReach != null &&
      (m10.reachRate?.value ?? 2) <= 1 &&
      (m10.reachRate?.value ?? 0) > 0
        ? "pass"
        : "review",
  };

  await db.$disconnect();

  const outPath = resolve(
    root,
    `reports/pr3-phase4a-44-verify-${isProd ? "production" : "preview"}.json`,
  );
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
