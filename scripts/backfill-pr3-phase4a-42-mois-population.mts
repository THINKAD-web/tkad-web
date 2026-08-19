#!/usr/bin/env npx tsx
/**
 * PR-3 Phase 4a-2 — MOIS 시·군·구 인구 → MediaExternalSignal (population_demographics)
 *
 * Usage:
 *   npx tsx scripts/backfill-pr3-phase4a-42-mois-population.mts
 *   npx tsx scripts/backfill-pr3-phase4a-42-mois-population.mts --year 2026 --month 7
 *   DATABASE_URL=... npx tsx scripts/backfill-pr3-phase4a-42-mois-population.mts --execute --allow-prod
 */
import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { auditDistrictMappings } from "../lib/metrics/district-mois-map.ts";
import {
  fetchSeoulGyeonggiPopulation,
  type MoisSigunguRow,
} from "../lib/metrics/mois-population.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production") });

const SOURCE_TYPE = "population_demographics";
const SOURCE_URL = "https://jumin.mois.go.kr/statMonth.do";

function hasFlag(name: string): boolean {
  return process.argv.includes(`--${name}`);
}

function flagValue(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
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

function signalRawValue(row: MoisSigunguRow) {
  return {
    regionCode: row.regionCode,
    regionName: row.regionName,
    sigunguName: row.sigunguName,
    sidoName: row.sidoName,
    population: row.population,
    referenceMonth: row.referenceMonth,
    method: "mois_jumin_csv",
  };
}

async function findAnchorMediaId(
  db: PrismaClient,
  row: MoisSigunguRow,
): Promise<{ mediaId: string | null; method: string }> {
  const guTail = row.sigunguName.match(/([가-힣]+구)$/)?.[1] ?? row.sigunguName;

  const exact = await db.media.findFirst({
    where: {
      isActive: true,
      OR: [
        { district: row.sigunguName },
        { district: guTail },
        { district: { contains: guTail } },
      ],
      regionMain: row.sidoName === "서울특별시" ? "seoul" : "gyeonggi",
    },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (exact) return { mediaId: exact.id, method: "district_anchor" };

  const sido = row.sidoName === "서울특별시" ? "seoul" : "gyeonggi";
  const any = await db.media.findFirst({
    where: { isActive: true, regionMain: sido },
    select: { id: true },
    orderBy: { id: "asc" },
  });
  if (any) return { mediaId: any.id, method: "sido_fallback_anchor" };

  return { mediaId: null, method: "no_anchor" };
}

async function main() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new Error("DATABASE_URL required");

  const host = dbHostLabel(url);
  const isProd = host.includes("ep-holy-cloud");
  const execute = hasFlag("execute");
  const year = Number(flagValue("year", "2026"));
  const month = Number(flagValue("month", "7"));

  if (isProd && execute && !hasFlag("allow-prod")) {
    throw new Error("Production execute requires --allow-prod");
  }

  console.log(`[4a-2] Fetching MOIS CSV ${year}-${String(month).padStart(2, "0")}…`);
  const moisRows = await fetchSeoulGyeonggiPopulation({ year, month });
  console.log(`[4a-2] MOIS leaf sigungu rows (서울·경기): ${moisRows.length}`);

  const db = createPrisma(url);

  const existing = await db.mediaExternalSignal.count({
    where: { sourceType: SOURCE_TYPE },
  });

  const mediaDistricts = await db.media.findMany({
    where: {
      isActive: true,
      regionMain: { in: ["seoul", "gyeonggi"] },
    },
    select: { district: true },
    distinct: ["district"],
  });

  const districtList = mediaDistricts
    .map((m) => m.district?.trim())
    .filter((d): d is string => Boolean(d));

  const districtAudit = auditDistrictMappings(districtList, moisRows);

  const seoulGyeonggiMedia = await db.media.count({
    where: { isActive: true, regionMain: { in: ["seoul", "gyeonggi"] } },
  });

  const signalsToCreate: Array<{
    sourceKey: string;
    row: MoisSigunguRow;
    anchorMediaId: string | null;
    anchorMethod: string;
  }> = [];

  for (const row of moisRows) {
    const existingSignal = await db.mediaExternalSignal.findFirst({
      where: { sourceType: SOURCE_TYPE, sourceKey: row.regionCode },
      select: { id: true },
    });
    if (existingSignal) continue;

    const anchor = await findAnchorMediaId(db, row);
    signalsToCreate.push({
      sourceKey: row.regionCode,
      row,
      anchorMediaId: anchor.mediaId,
      anchorMethod: anchor.method,
    });
  }

  const validFrom = new Date(Date.UTC(year, month - 1, 1));
  const collectedAt = new Date();

  const report = {
    generatedAt: new Date().toISOString(),
    host,
    isProd,
    mode: execute ? "execute" : "dry-run",
    apiKeyRequired: false,
    dataSource: {
      method: "mois_csv_post",
      url: SOURCE_URL,
      referenceMonth: `${year}-${String(month).padStart(2, "0")}`,
      loginRequired: false,
    },
    mois: {
      leafSigunguCount: moisRows.length,
      seoulCount: moisRows.filter((r) => r.sidoName === "서울특별시").length,
      gyeonggiCount: moisRows.filter((r) => r.sidoName === "경기도").length,
      sample: moisRows.slice(0, 5).map((r) => ({
        regionCode: r.regionCode,
        sigunguName: r.sigunguName,
        population: r.population,
      })),
    },
    media: {
      seoulGyeonggiActive: seoulGyeonggiMedia,
      distinctDistricts: districtList.length,
    },
    districtMapping: {
      mapped: districtAudit.mapped.length,
      failed: districtAudit.failed,
      skipped: districtAudit.skipped,
    },
    signals: {
      existingPopulationDemographics: existing,
      wouldCreate: signalsToCreate.length,
      noAnchorMedia: signalsToCreate.filter((s) => !s.anchorMediaId).length,
      anchorMethods: signalsToCreate.reduce<Record<string, number>>((acc, s) => {
        acc[s.anchorMethod] = (acc[s.anchorMethod] ?? 0) + 1;
        return acc;
      }, {}),
      preview: signalsToCreate.slice(0, 8).map((s) => ({
        sourceKey: s.sourceKey,
        sigunguName: s.row.sigunguName,
        population: s.row.population,
        anchorMethod: s.anchorMethod,
        hasAnchor: Boolean(s.anchorMediaId),
      })),
    },
    executePlan: {
      sourceType: SOURCE_TYPE,
      sourceUrl: SOURCE_URL,
      rawValueShape: [
        "regionCode",
        "regionName",
        "sigunguName",
        "sidoName",
        "population",
        "referenceMonth",
        "method",
      ],
      note:
        "Signal은 sourceType+sourceKey(행정기관코드)로 조회. mediaId는 FK 충족용 anchor(해당 구 district 매체 1건).",
    },
    verdict: districtAudit.failed.length === 0 ? "ready" : "review_mapping_failures",
  };

  if (execute) {
    let created = 0;
    for (const s of signalsToCreate) {
      if (!s.anchorMediaId) continue;
      await db.mediaExternalSignal.create({
        data: {
          mediaId: s.anchorMediaId,
          sourceType: SOURCE_TYPE,
          sourceKey: s.sourceKey,
          rawValue: signalRawValue(s.row),
          sourceUrl: SOURCE_URL,
          collectedAt,
          validFrom,
        },
      });
      created += 1;
    }
    report.signals = { ...report.signals, created } as typeof report.signals & {
      created: number;
    };
    (report as { mode: string }).mode = "execute";
  }

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
  const outPath = resolve(reportsDir, `pr3-phase4a-42-${suffix}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
