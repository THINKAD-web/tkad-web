#!/usr/bin/env npx tsx
/**
 * region_main 불일치 7건 정정 — 플래너 지역 필터 정확도
 *
 * Usage:
 *   npx tsx scripts/backfill-pr3-region-main-mismatch-fix.mts
 *   npx tsx scripts/backfill-pr3-region-main-mismatch-fix.mts --execute --allow-prod
 *   npx tsx scripts/backfill-pr3-region-main-mismatch-fix.mts --execute --allow-prod --with-coverage
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { REGION_MAIN_MISMATCH_CORRECTIONS } from "../lib/media/region-main-corrections.ts";
import {
  buildMoisPopulationIndex,
  isRegionMainMismatch,
  resolveMediaCoverage,
} from "../lib/metrics/coverage-map.ts";
import type { MoisSigunguRow } from "../lib/metrics/mois-population.ts";
import { matchesPlannerRegion } from "../lib/planner/planner-regions.ts";
import type { MediaItem } from "../lib/media-data.ts";

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
  const withCoverage = hasFlag("with-coverage");

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

  const ids = REGION_MAIN_MISMATCH_CORRECTIONS.map((c) => c.id);
  const medias = await db.media.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      regionMain: true,
      regionSub: true,
      region: true,
      city: true,
      district: true,
      isActive: true,
      computedMetric: {
        select: {
          id: true,
          coverageDongs: true,
          coveragePopulation: true,
        },
      },
    },
  });

  const byId = new Map(medias.map((m) => [m.id, m]));
  const rows: Array<Record<string, unknown>> = [];
  let wouldUpdate = 0;
  let skipAlreadyCorrect = 0;
  let skipNotFound = 0;
  let skipFromMismatch = 0;

  for (const fix of REGION_MAIN_MISMATCH_CORRECTIONS) {
    const m = byId.get(fix.id);
    if (!m) {
      skipNotFound += 1;
      rows.push({ ...fix, status: "not_found" });
      continue;
    }

    const currentMain = m.regionMain?.trim().toLowerCase() ?? "";
    if (currentMain !== fix.fromRegionMain) {
      skipFromMismatch += 1;
      rows.push({
        id: fix.id,
        name: m.name,
        status: "from_region_main_changed",
        expectedFrom: fix.fromRegionMain,
        actualFrom: currentMain,
      });
      continue;
    }

    const alreadyCorrect =
      currentMain === fix.toRegionMain &&
      (m.regionSub ?? null) === fix.toRegionSub;
    if (alreadyCorrect) {
      skipAlreadyCorrect += 1;
      rows.push({ id: fix.id, name: m.name, status: "already_correct" });
      continue;
    }

    const afterMedia = {
      regionMain: fix.toRegionMain,
      regionSub: fix.toRegionSub,
      district: m.district,
      city: m.city,
    };

    const coverageAfter = resolveMediaCoverage(afterMedia, moisRows, index);
    const stillMismatch = isRegionMainMismatch({
      regionMain: fix.toRegionMain,
      city: m.city,
      district: m.district,
      region: m.region,
    });

    const asMediaItem: MediaItem = {
      id: m.id,
      name: m.name,
      region: m.region ?? undefined,
      regionMain: fix.toRegionMain,
      regionSub: fix.toRegionSub ?? undefined,
      city: m.city ?? undefined,
      district: m.district ?? undefined,
    };

    const plannerFilter = {
      matchesSeoul: matchesPlannerRegion(asMediaItem, "seoul"),
      matchesGyeonggi: matchesPlannerRegion(asMediaItem, "gyeonggi"),
      matchesIncheon: matchesPlannerRegion(asMediaItem, "incheon"),
      matchesDaegu: matchesPlannerRegion(asMediaItem, "daegu"),
    };

    wouldUpdate += 1;
    rows.push({
      id: fix.id,
      name: m.name,
      status: "would_update",
      before: {
        regionMain: m.regionMain,
        regionSub: m.regionSub,
        region: m.region,
      },
      after: {
        regionMain: fix.toRegionMain,
        regionSub: fix.toRegionSub,
      },
      plannerFilterAfter: plannerFilter,
      coverageAfter: coverageAfter.ok
        ? {
            ok: true,
            method: coverageAfter.method,
            coveragePopulation: coverageAfter.coveragePopulation,
            sigunguNames: coverageAfter.sigunguNames,
          }
        : { ok: false, reason: coverageAfter.reason },
      regionMainMismatchAfter: stillMismatch,
      rationale: fix.rationale,
    });
  }

  let executeUpdated = 0;
  let coverageUpdated = 0;

  if (execute) {
    for (const fix of REGION_MAIN_MISMATCH_CORRECTIONS) {
      const m = byId.get(fix.id);
      if (!m) continue;
      const currentMain = m.regionMain?.trim().toLowerCase() ?? "";
      if (currentMain !== fix.fromRegionMain) continue;

      await db.media.update({
        where: { id: fix.id },
        data: {
          regionMain: fix.toRegionMain,
          regionSub: fix.toRegionSub,
        },
      });
      executeUpdated += 1;

      if (
        withCoverage &&
        m.computedMetric &&
        m.computedMetric.coverageDongs == null &&
        (fix.toRegionMain === "seoul" || fix.toRegionMain === "gyeonggi")
      ) {
        const result = resolveMediaCoverage(
          {
            regionMain: fix.toRegionMain,
            regionSub: fix.toRegionSub,
            district: m.district,
            city: m.city,
          },
          moisRows,
          index,
        );
        if (result.ok) {
          await db.mediaComputedMetric.update({
            where: { id: m.computedMetric.id },
            data: {
              coverageDongs: result.coverageDongs,
              coveragePopulation: result.coveragePopulation,
            },
          });
          coverageUpdated += 1;
        }
      }
    }
  }

  // 전수 재점검 — seoul/gyeonggi active 중 mismatch 잔존
  const remaining = await db.media.findMany({
    where: { isActive: true, regionMain: { in: ["seoul", "gyeonggi"] } },
    select: {
      id: true,
      name: true,
      regionMain: true,
      city: true,
      district: true,
      region: true,
    },
  });
  const remainingMismatches = remaining.filter((m) =>
    isRegionMainMismatch({
      regionMain: m.regionMain,
      city: m.city,
      district: m.district,
      region: m.region,
    }).mismatch,
  );

  const report = {
    generatedAt: new Date().toISOString(),
    host,
    isProd,
    mode: execute ? "execute" : "dry-run",
    purpose: "planner region filter accuracy (not reach calc primary)",
    corrections: REGION_MAIN_MISMATCH_CORRECTIONS.length,
    summary: {
      wouldUpdate,
      skipAlreadyCorrect,
      skipNotFound,
      skipFromMismatch,
      executeUpdated: execute ? executeUpdated : undefined,
      coverageUpdated: execute && withCoverage ? coverageUpdated : undefined,
    },
    coverageEligibilityAfterFix: {
      gyeonggiWouldMap: rows.filter(
        (r) =>
          r.status === "would_update" &&
          (r.after as { regionMain: string })?.regionMain === "gyeonggi" &&
          (r.coverageAfter as { ok: boolean })?.ok,
      ).length,
      incheonDaeguStillNull: rows.filter(
        (r) =>
          r.status === "would_update" &&
          ["incheon", "daegu"].includes(
            (r.after as { regionMain: string })?.regionMain ?? "",
          ) &&
          !(r.coverageAfter as { ok: boolean })?.ok,
      ).length,
      note: "인천·대구는 4a seoul/gyeonggi 범위 밖 → coverage NULL 정상",
    },
    rows,
    remainingMismatches: {
      count: remainingMismatches.length,
      cases: remainingMismatches.map((m) => ({
        id: m.id,
        name: m.name,
        regionMain: m.regionMain,
        city: m.city,
        district: m.district,
        expected: isRegionMainMismatch({
          regionMain: m.regionMain,
          city: m.city,
          district: m.district,
          region: m.region,
        }).expected,
      })),
    },
    executeFlags: {
      withCoverage:
        "경기 3건 coverage backfill (--with-coverage, execute 시 gyeonggi만)",
    },
    verdict:
      wouldUpdate === REGION_MAIN_MISMATCH_CORRECTIONS.length &&
      remainingMismatches.length ===
        (execute ? 0 : REGION_MAIN_MISMATCH_CORRECTIONS.length)
        ? execute
          ? remainingMismatches.length === 0
            ? "pass"
            : "review"
          : "ready"
        : "review",
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

  const outPath = resolve(reportsDir, `pr3-region-main-fix-${suffix}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
