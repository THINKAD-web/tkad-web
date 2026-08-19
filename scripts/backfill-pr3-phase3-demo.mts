#!/usr/bin/env npx tsx
/**
 * PR-3 Phase 3-2 — demo snapshot backfill (dry-run / execute).
 *
 * Usage:
 *   npx tsx scripts/backfill-pr3-phase3-demo.mts
 *   DATABASE_URL=... npx tsx scripts/backfill-pr3-phase3-demo.mts --execute --allow-prod
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
  resolveDemoAgeSplitWithBasis,
  resolveDemoGenderSplitWithBasis,
  type MetricBasis,
  type MediaDemoSource,
} from "../lib/metrics/defaults.ts";
import { classifyMedia } from "../lib/metrics/classify.ts";
import type { MediaMetricClass } from "../lib/metrics/types.ts";
import { parseTargetAge } from "../lib/planner/parse-target-age.ts";
import { targetAgeToAgeSplit } from "../lib/metrics/demo-age-bridge.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production") });

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

function demoSourceFromRow(row: {
  type: string;
  mediaSubCategory: string | null;
  mediaMainCategory: string | null;
  name: string;
  widthM: number | null;
  heightM: number | null;
  targetAge: string | null;
  demoGenderSplit: unknown;
  demoAgeSplit: unknown;
}): MediaDemoSource {
  return {
    type: row.type,
    subCategory: row.mediaSubCategory,
    mainCategory: row.mediaMainCategory,
    name: row.name,
    widthM: row.widthM,
    heightM: row.heightM,
    targetAge: row.targetAge,
    demoGenderSplit: row.demoGenderSplit as MediaDemoSource["demoGenderSplit"],
    demoAgeSplit: row.demoAgeSplit as MediaDemoSource["demoAgeSplit"],
  };
}

function bump(map: Record<string, number>, key: string, n = 1) {
  map[key] = (map[key] ?? 0) + n;
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

  const rows = await db.mediaComputedMetric.findMany({
    select: {
      id: true,
      mediaId: true,
      demoGenderSplit: true,
      demoAgeSplit: true,
      media: {
        select: {
          name: true,
          type: true,
          mediaSubCategory: true,
          mediaMainCategory: true,
          widthM: true,
          heightM: true,
          targetAge: true,
          isActive: true,
        },
      },
    },
  });

  const genderBasis: Record<MetricBasis, number> = {
    measured: 0,
    derived: 0,
    parsed: 0,
    default: 0,
  };
  const ageBasis: Record<MetricBasis, number> = {
    measured: 0,
    derived: 0,
    parsed: 0,
    default: 0,
  };
  const byClassGender: Record<string, Record<MetricBasis, number>> = {};
  const byClassAge: Record<string, Record<MetricBasis, number>> = {};
  const classTotals: Record<string, number> = {};

  let skipExisting = 0;
  let wouldWrite = 0;
  let targetAgeNonEmpty = 0;
  let parseRange = 0;
  let bridgeParsed = 0;
  let parseFallback = 0;
  let parseEmpty = 0;

  const plans: {
    computedId: string;
    mediaId: string;
    name: string;
    mediaClass: MediaMetricClass;
    genderBasis: MetricBasis;
    ageBasis: MetricBasis;
    genderSplit: { male: number; female: number };
    ageSplit: Record<string, number>;
    skipped: boolean;
  }[] = [];

  for (const row of rows) {
    const m = row.media;
    const source = demoSourceFromRow({
      type: m.type,
      mediaSubCategory: m.mediaSubCategory,
      mediaMainCategory: m.mediaMainCategory,
      name: m.name,
      widthM: m.widthM,
      heightM: m.heightM,
      targetAge: m.targetAge,
      demoGenderSplit: row.demoGenderSplit,
      demoAgeSplit: row.demoAgeSplit,
    });

    const mediaClass = classifyMedia({
      type: m.type,
      subCategory: m.mediaSubCategory,
      mainCategory: m.mediaMainCategory,
      name: m.name,
      widthM: m.widthM,
      heightM: m.heightM,
    });

    bump(classTotals, mediaClass);

    const ta = m.targetAge?.trim() ?? "";
    if (ta) targetAgeNonEmpty++;
    const parsed = parseTargetAge(m.targetAge);
    if (parsed.kind === "range") parseRange++;
    else if (parsed.source === "empty") parseEmpty++;
    else parseFallback++;

    if (targetAgeToAgeSplit(m.targetAge)) bridgeParsed++;

    const genderRes = resolveDemoGenderSplitWithBasis(source);
    const ageRes = resolveDemoAgeSplitWithBasis(source);

    genderBasis[genderRes.basis]++;
    ageBasis[ageRes.basis]++;

    if (!byClassGender[mediaClass]) {
      byClassGender[mediaClass] = { measured: 0, derived: 0, parsed: 0, default: 0 };
    }
    if (!byClassAge[mediaClass]) {
      byClassAge[mediaClass] = { measured: 0, derived: 0, parsed: 0, default: 0 };
    }
    byClassGender[mediaClass][genderRes.basis]++;
    byClassAge[mediaClass][ageRes.basis]++;

    const hasExisting =
      row.demoGenderSplit != null && row.demoAgeSplit != null;
    if (hasExisting) {
      skipExisting++;
    } else {
      wouldWrite++;
    }

    plans.push({
      computedId: row.id,
      mediaId: row.mediaId,
      name: m.name,
      mediaClass,
      genderBasis: genderRes.basis,
      ageBasis: ageRes.basis,
      genderSplit: genderRes.value,
      ageSplit: ageRes.value,
      skipped: hasExisting,
    });
  }

  if (execute) {
    let written = 0;
    for (const plan of plans) {
      if (plan.skipped) continue;
      await db.mediaComputedMetric.update({
        where: { id: plan.computedId },
        data: {
          demoGenderSplit: plan.genderSplit,
          demoAgeSplit: plan.ageSplit,
          demoSourceSignalIds: [],
        },
      });
      written++;
    }
    console.log(`Execute complete: ${written} rows updated`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    host,
    isProd,
    mode: execute ? "execute" : "dry-run",
    totals: {
      computedRows: rows.length,
      wouldWrite,
      skipExisting,
      activeMediaWithComputed: rows.filter((r) => r.media.isActive).length,
    },
    genderBasis,
    ageBasis,
    targetAgeProbe: {
      nonEmpty: targetAgeNonEmpty,
      parseTargetAgeRange: parseRange,
      parseTargetAgeFallback: parseFallback,
      parseTargetAgeEmpty: parseEmpty,
      targetAgeToAgeSplitHits: bridgeParsed,
      priorSurvey804: { parseRange: 742, ratio: "742/804" },
      currentRatio: `${bridgeParsed}/${rows.length}`,
    },
    byClass: Object.fromEntries(
      Object.keys(classTotals)
        .sort()
        .map((cls) => [
          cls,
          {
            total: classTotals[cls],
            genderBasis: byClassGender[cls],
            ageBasis: byClassAge[cls],
          },
        ]),
    ),
    sampleParsed: plans
      .filter((p) => p.ageBasis === "parsed" && !p.skipped)
      .slice(0, 5)
      .map((p) => ({
        name: p.name,
        mediaClass: p.mediaClass,
        ageSplit: p.ageSplit,
      })),
    sampleDefault: plans
      .filter((p) => p.ageBasis === "default" && !p.skipped)
      .slice(0, 3)
      .map((p) => ({
        name: p.name,
        mediaClass: p.mediaClass,
        ageSplit: p.ageSplit,
      })),
  };

  const reportsDir = resolve(root, "reports");
  if (!existsSync(reportsDir)) mkdirSync(reportsDir, { recursive: true });

  const suffix = execute ? "execute-production" : "dry-run-production";
  const outPath = resolve(reportsDir, `pr3-phase3-32-${suffix}.json`);
  writeFileSync(outPath, JSON.stringify(report, null, 2));

  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${outPath}`);

  await db.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
