#!/usr/bin/env npx tsx
/**
 * PR-3 Phase 4a-3 — 매체 → 시·군·구 coverageDongs / coveragePopulation backfill
 *
 * Usage:
 *   npx tsx scripts/backfill-pr3-phase4a-43-coverage.mts
 *   DATABASE_URL=... npx tsx scripts/backfill-pr3-phase4a-43-coverage.mts --execute --allow-prod
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import {
  buildMoisPopulationIndex,
  isRegionMainMismatch,
  resolveMediaCoverage,
  type CoverageMapResult,
} from "../lib/metrics/coverage-map.ts";
import type { MoisSigunguRow } from "../lib/metrics/mois-population.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production") });

const SOURCE_TYPE = "population_demographics";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function dbHostLabel(url: string): string {
  try {
    return new URL(url.replace(/^postgresql:/, "postgres:")).hostname;
  } catch {
    return url.slice(0, 40);
  }
}

function createPrisma(url: string): PrismaClient {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(url),
    max: 3,
  });
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

function rawToMoisRow(
  sourceKey: string,
  raw: Record<string, unknown>,
): MoisSigunguRow {
  return {
    regionCode: sourceKey,
    regionName: String(raw.regionName ?? ""),
    sidoName: String(raw.sidoName ?? ""),
    sigunguName: String(raw.sigunguName ?? ""),
    population: Number(raw.population ?? 0),
    referenceMonth: String(raw.referenceMonth ?? ""),
  };
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL required");

  const host = dbHostLabel(url);
  const isProd = host.includes("ep-holy-cloud");
  const execute = hasFlag("execute");

  if (isProd && execute && !hasFlag("allow-prod")) {
    throw new Error("Production execute requires --allow-prod");
  }

  const db = createPrisma(url);

  const signals = await db.mediaExternalSignal.findMany({
    where: { sourceType: SOURCE_TYPE },
    select: { sourceKey: true, rawValue: true },
  });

  const moisRows = signals.map((s) =>
    rawToMoisRow(s.sourceKey, s.rawValue as Record<string, unknown>),
  );
  const index = buildMoisPopulationIndex(moisRows);

  const medias = await db.media.findMany({
    where: {
      isActive: true,
      regionMain: { in: ["seoul", "gyeonggi"] },
    },
    select: {
      id: true,
      name: true,
      regionMain: true,
      regionSub: true,
      district: true,
      city: true,
      region: true,
      computedMetric: {
        select: {
          id: true,
          coverageDongs: true,
          coveragePopulation: true,
        },
      },
      factSheet: { select: { latitude: true, longitude: true } },
    },
  });

  const regionMismatches: Array<{
    id: string;
    name: string;
    regionMain: string | null;
    regionSub: string | null;
    city: string | null;
    district: string | null;
    expected: string | null;
  }> = [];

  for (const m of medias) {
    const { mismatch, expected } = isRegionMainMismatch({
      regionMain: m.regionMain,
      city: m.city,
      district: m.district,
      region: m.region,
    });
    if (mismatch) {
      regionMismatches.push({
        id: m.id,
        name: m.name,
        regionMain: m.regionMain,
        regionSub: m.regionSub,
        city: m.city,
        district: m.district,
        expected,
      });
    }
  }

  const byMethod: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  const bySigungu: Record<string, number> = {};
  const mappedSamples: Array<{
    mediaId: string;
    name: string;
    method: string;
    sigunguNames: string[];
    coveragePopulation: number;
  }> = [];
  const failedSamples: Array<{ mediaId: string; name: string; reason: string }> = [];

  let wouldUpdate = 0;
  let skipNoComputed = 0;
  let alreadyFilled = 0;

  const sanityChecks: Array<{
    sigunguName: string;
    signalPopulation: number;
    mediaCount: number;
    sampleMedia?: string;
  }> = [];

  for (const m of medias) {
    if (!m.computedMetric) {
      skipNoComputed += 1;
      continue;
    }
    if (m.computedMetric.coverageDongs != null) {
      alreadyFilled += 1;
      continue;
    }

    const result: CoverageMapResult = resolveMediaCoverage(
      {
        regionMain: m.regionMain,
        regionSub: m.regionSub,
        district: m.district,
        city: m.city,
        latitude: m.factSheet?.latitude,
        longitude: m.factSheet?.longitude,
      },
      moisRows,
      index,
    );

    if (result.ok) {
      wouldUpdate += 1;
      byMethod[result.method] = (byMethod[result.method] ?? 0) + 1;
      for (const name of result.sigunguNames) {
        bySigungu[name] = (bySigungu[name] ?? 0) + 1;
      }
      if (mappedSamples.length < 12) {
        mappedSamples.push({
          mediaId: m.id,
          name: m.name,
          method: result.method,
          sigunguNames: result.sigunguNames,
          coveragePopulation: result.coveragePopulation,
        });
      }
    } else {
      byReason[result.reason] = (byReason[result.reason] ?? 0) + 1;
      if (failedSamples.length < 15) {
        failedSamples.push({ mediaId: m.id, name: m.name, reason: result.reason });
      }
    }
  }

  // 강남구 sanity — signal pop vs mapped media count
  const gangnamSignal = moisRows.find((r) => r.sigunguName === "강남구");
  if (gangnamSignal) {
    sanityChecks.push({
      sigunguName: "강남구",
      signalPopulation: gangnamSignal.population,
      mediaCount: bySigungu["강남구"] ?? 0,
    });
  }
  for (const name of ["서초구", "마포구", "성남시 분당구"]) {
    const row = moisRows.find((r) => r.sigunguName === name);
    if (row) {
      sanityChecks.push({
        sigunguName: name,
        signalPopulation: row.population,
        mediaCount: bySigungu[name] ?? 0,
      });
    }
  }

  const bySigunguSorted = Object.entries(bySigungu)
    .sort((a, b) => b[1] - a[1])
    .map(([sigunguName, mediaCount]) => {
      const row = moisRows.find((r) => r.sigunguName === sigunguName);
      return {
        sigunguName,
        mediaCount,
        signalPopulation: row?.population ?? null,
      };
    });

  let executeUpdated = 0;
  if (execute) {
    for (const m of medias) {
      if (!m.computedMetric || m.computedMetric.coverageDongs != null) continue;
      const result = resolveMediaCoverage(
        {
          regionMain: m.regionMain,
          regionSub: m.regionSub,
          district: m.district,
          city: m.city,
          latitude: m.factSheet?.latitude,
          longitude: m.factSheet?.longitude,
        },
        moisRows,
        index,
      );
      if (!result.ok) continue;
      await db.mediaComputedMetric.update({
        where: { id: m.computedMetric.id },
        data: {
          coverageDongs: result.coverageDongs,
          coveragePopulation: result.coveragePopulation,
        },
      });
      executeUpdated += 1;
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    host,
    isProd,
    mode: execute ? "execute" : "dry-run",
    signalsLoaded: signals.length,
    media: {
      seoulGyeonggiActive: medias.length,
      skipNoComputed,
      alreadyFilled,
      wouldUpdate,
      wouldFail: medias.length - skipNoComputed - alreadyFilled - wouldUpdate,
    },
    mappingDesign: {
      priority: [
        "1. district direct (single gu)",
        "2. district broad (서울/경기 전역, · 구 목록) → equal weight multi-dong",
        "3. regionSub cluster → equal weight multi-dong",
        "4. fail → NULL",
      ],
      skipped9Policy: {
        "서울 전역*": "broad_seoul_equal — 25구 균등 weight",
        "경기도 전역": "broad_gyeonggi_equal — 47 unit 균등",
        "강남·서초·분당·영통": "district_dot_list_equal — 명시 구 4개 균등",
        "강남구 등 / 다수 / X 외 다수": "regionSub cluster if available; else ambiguous → NULL",
        recommendation:
          "복수 구 **균등 배분** (calcNetReach 구조와 일치). 대표 1구만 쓰면 광역 매체 도달이 과소.",
      },
    },
    regionMainMismatch: {
      count: regionMismatches.length,
      cases: regionMismatches,
    },
    results: {
      byMethod,
      byReason,
      mappedSamples,
      failedSamples,
    },
    bySigungu: bySigunguSorted,
    sanityChecks,
    phaseBaselineNote: "execute 시 contact_rate/demo/coverage 외 컬럼 untouched",
    executeUpdated: execute ? executeUpdated : undefined,
    verdict:
      regionMismatches.length <= 2 && wouldUpdate > 0 ? "ready" : "review",
  };

  await db.$disconnect();

  const reportsDir = resolve(root, "reports");
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const suffix = execute
    ? isProd
      ? "execute-production"
      : "execute-preview"
    : isProd
      ? "dry-run-production"
      : "dry-run-preview";

  const outPath = resolve(reportsDir, `pr3-phase4a-43-${suffix}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  if (regionMismatches.length > 0) {
    writeFileSync(
      resolve(reportsDir, "pr3-phase4a-43-region-mismatch-audit.json"),
      JSON.stringify(
        { generatedAt: report.generatedAt, count: regionMismatches.length, cases: regionMismatches },
        null,
        2,
      ),
    );
  }

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
