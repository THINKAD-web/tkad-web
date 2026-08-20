#!/usr/bin/env npx tsx
/**
 * Phase 4a-5 — LTS / impressions 분리 dry-run
 *
 *   npx tsx scripts/dry-run-pr3-phase4a-5-lts-split.mts
 *
 * 3단계 검증:
 *   1. wrap-only mix → reach·frequency 변화 0
 *   2. loop-only mix → reach ↑(legacy 대비), frequency ↓, impressions 동일
 *   3. 4a-4 10매체 mix → freq ~11 (hybrid counterfactual)
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
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
import { calcMixMetrics, tryCalcReach } from "../lib/planner/brief/mix-metrics.ts";
import {
  briefToTargetSpec,
  buildCoverageByMediaId,
  buildDongProfilesFromLines,
} from "../lib/planner/brief/reach-adapter.ts";
import { calcImpressions } from "../lib/metrics/impressions.ts";
import { resolveContactRateWithBasis, resolveSovShareWithBasis } from "../lib/metrics/defaults.ts";
import { calcNetReach } from "../lib/metrics/reach.ts";
import { DONG_CORRELATION_RHO } from "../lib/metrics/constants.ts";
import type { PlannedMedia } from "../lib/metrics/types.ts";
import {
  PHASE1B_EXECUTE_MEDIA_IDS,
  PHASE4A44_MIX_MEDIA_IDS,
} from "../lib/metrics/phase1b-min-ids.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

const DAYS = 14;
const BRIEF = {
  genders: ["female"] as const,
  ageBands: ["20s", "30s"] as const,
  budgetInputWon: 100_000_000,
  budgetMode: "total" as const,
  regionCodes: [] as const,
  goal: null,
  industry: null,
  flightStart: "2026-08-01",
  flightEnd: "2026-08-14",
  freeText: "",
};

function loadWrapSample(): string[] {
  const audit = JSON.parse(
    readFileSync(
      resolve(root, "reports/pr3-bus-sov-classification-audit.json"),
      "utf8",
    ),
  );
  return (audit.busRelated?.wrap?.ids ?? []).slice(0, 10) as string[];
}

function mediaSovSource(media: {
  type?: string;
  subCategory?: string | null;
  mediaCategory?: string[];
  name?: string;
  forceLoopSov?: boolean;
  spotDurationSec?: number | null;
  loopDurationSec?: number | null;
  playsPerHour?: number | null;
}) {
  return {
    type: media.type,
    subCategory: media.subCategory ?? undefined,
    mainCategory: media.mediaCategory?.[0],
    name: media.name,
    forceLoopSov: media.forceLoopSov,
    spotDuration: media.spotDurationSec ?? undefined,
    loopDuration: media.loopDurationSec ?? undefined,
    playsPerHour: media.playsPerHour ?? undefined,
  };
}

function linesToPlannedMedias(
  lines: { media: ReturnType<typeof prismaMediaToMediaItem>; units: number }[],
  days: number,
): PlannedMedia[] {
  return lines
    .map((l) => {
      const cov = l.media.coverageDongs;
      if (!cov?.length) return null;
      const contact = resolveContactRateWithBasis({
        type: l.media.type,
        subCategory: l.media.subCategory,
        name: l.media.name,
      }).value;
      const sov = resolveSovShareWithBasis(mediaSovSource(l.media)).value;
      const { dailyLtsContacts, dailyImpressions, totalImpressions } =
        calcImpressions({
          dailyTraffic: l.media.dailyFootTraffic ?? 0,
          contactRate: contact,
          sovShare: sov,
          units: l.units,
          days,
        });
      return {
        mediaId: l.media.id,
        dailyLtsContacts,
        dailyImpressions,
        totalImpressions,
        coverageDongs: cov.map((d) => ({ code: d.code, weight: d.weight })),
      };
    })
    .filter((m): m is PlannedMedia => m != null);
}

function calcReachLegacy(
  medias: PlannedMedia[],
  dongs: ReturnType<typeof buildDongProfilesFromLines>,
  target: ReturnType<typeof briefToTargetSpec>,
  days: number,
) {
  const legacyMedias = medias.map((m) => ({
    ...m,
    dailyLtsContacts: m.dailyImpressions,
  }));
  return calcNetReach({
    medias: legacyMedias,
    dongs,
    target,
    days,
    rho: DONG_CORRELATION_RHO,
  });
}

function nearlyEqual(a: number, b: number, rel = 1e-9): boolean {
  if (a === b) return true;
  const denom = Math.max(Math.abs(a), Math.abs(b), 1);
  return Math.abs(a - b) / denom <= rel;
}

async function main() {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const popIndex = await fetchMoisPopulationIndex(db);
  const target = briefToTargetSpec(BRIEF);

  const catalogInclude = {
    computedMetric: {
      select: {
        demoGenderSplit: true,
        demoAgeSplit: true,
        demoSourceSignalIds: true,
        coverageDongs: true,
        coveragePopulation: true,
        contactRate: true,
        sovShare: true,
      },
    },
    factSheet: {
      select: {
        forceLoopSov: true,
        spotDurationSec: true,
        loopDurationSec: true,
        playsPerHour: true,
      },
    },
  };

  const wrapIds = loadWrapSample();
  const loopIds = [...PHASE1B_EXECUTE_MEDIA_IDS];
  const mixIds = [...PHASE4A44_MIX_MEDIA_IDS];

  const rows = await db.media.findMany({
    where: {
      id: { in: [...new Set([...wrapIds, ...loopIds, ...mixIds])] },
    },
    include: catalogInclude,
  });
  await db.$disconnect();
  await pool.end();

  const byId = new Map(
    rows.map((r) => [
      r.id,
      prismaMediaToMediaItem(r as MediaWithAdvertiserExecutions, popIndex),
    ]),
  );

  function buildLines(ids: string[]) {
    return ids
      .map((id) => byId.get(id))
      .filter((m): m is NonNullable<typeof m> => m != null)
      .map((media) => ({ media, units: 1 }));
  }

  const scenarios = [
    { key: "wrapOnly", label: "wrap-only (10)", ids: wrapIds },
    { key: "loopOnly", label: "loop-only (1b execute 10)", ids: loopIds },
    { key: "mix4a44", label: "4a-4 mix (10)", ids: mixIds },
  ] as const;

  const results: Record<string, unknown> = {
    generatedAt: new Date().toISOString(),
    days: DAYS,
    brief: BRIEF,
    hybridCounterfactualFreq: 11.3,
    scenarios: {} as Record<string, unknown>,
    allPass: true,
  };

  for (const sc of scenarios) {
    const lines = buildLines(sc.ids);
    const coverage = buildCoverageByMediaId(lines);
    const dongs = buildDongProfilesFromLines(lines, coverage, popIndex);
    const medias = linesToPlannedMedias(lines, DAYS);

    const legacy = calcReachLegacy(medias, dongs, target, DAYS);
    const current = calcNetReach({
      medias,
      dongs,
      target,
      days: DAYS,
      rho: DONG_CORRELATION_RHO,
    });

    const mix = calcMixMetrics({
      lines,
      days: DAYS,
      budgetWon: BRIEF.budgetInputWon,
      target,
    });

    const reachWrap = tryCalcReach({
      lines,
      days: DAYS,
      target,
      dongs,
      coverageByMediaId: coverage,
    });

    const coveragePopCap = lines.reduce(
      (sum, l) => sum + (l.media.coveragePopulation ?? 0),
      0,
    );

    let pass = true;
    const checks: Record<string, boolean | string> = {};

    if (sc.key === "wrapOnly") {
      checks.reachUnchanged = nearlyEqual(current.netReach, legacy.netReach);
      checks.frequencyUnchanged = nearlyEqual(
        current.frequency,
        legacy.frequency,
      );
      checks.impressionsUnchanged = nearlyEqual(
        current.totalImpressions,
        legacy.totalImpressions,
      );
      pass =
        checks.reachUnchanged === true &&
        checks.frequencyUnchanged === true &&
        checks.impressionsUnchanged === true;
    } else if (sc.key === "loopOnly") {
      checks.impressionsUnchanged = nearlyEqual(
        current.totalImpressions,
        legacy.totalImpressions,
      );
      checks.reachIncreased = current.netReach > legacy.netReach;
      checks.frequencyDecreased = current.frequency < legacy.frequency;
      pass =
        checks.impressionsUnchanged === true &&
        checks.reachIncreased === true &&
        checks.frequencyDecreased === true;
    } else {
      checks.freqNearHybrid =
        current.frequency >= 10.5 && current.frequency <= 12.0;
      checks.reachRestored = current.netReach > legacy.netReach;
      pass = checks.freqNearHybrid === true && checks.reachRestored === true;
    }

    checks.reachRateLe1 = current.reachRate <= 1.0001;
    checks.netReachLeTarget = current.netReach <= current.targetPopulation + 1;
    checks.netReachLeCoverage =
      coveragePopCap <= 0 ||
      current.netReach <= coveragePopCap * 1.01 + 1;
    checks.tryCalcReachOk = reachWrap != null;
    checks.rho = DONG_CORRELATION_RHO;

    pass =
      pass &&
      checks.reachRateLe1 === true &&
      checks.netReachLeTarget === true &&
      checks.netReachLeCoverage === true &&
      checks.tryCalcReachOk === true;

    if (!pass) results.allPass = false;

    (results.scenarios as Record<string, unknown>)[sc.key] = {
      label: sc.label,
      mediaCount: lines.length,
      legacy: {
        netReach: legacy.netReach,
        frequency: legacy.frequency,
        totalImpressions: legacy.totalImpressions,
        reachRate: legacy.reachRate,
      },
      current: {
        netReach: current.netReach,
        frequency: current.frequency,
        totalImpressions: current.totalImpressions,
        reachRate: current.reachRate,
      },
      mixPanelFrequency: mix.frequency?.value ?? null,
      coveragePopulationSum: coveragePopCap,
      checks,
      pass,
    };
  }

  mkdirSync(resolve(root, "reports"), { recursive: true });
  const jsonPath = resolve(root, "reports/pr3-phase4a-5-lts-split-dry-run.json");
  writeFileSync(jsonPath, JSON.stringify(results, null, 2));

  const md = `# Phase 4a-5 LTS/impressions split — dry-run

생성: ${results.generatedAt}

## Overall
**${results.allPass ? "✅ PASS" : "❌ FAIL"}**

## 1. wrap-only (회귀 없음)
${formatScenario(results.scenarios as Record<string, { pass: boolean; checks: Record<string, boolean> }>, "wrapOnly")}

## 2. loop-only (reach ↑, frequency ↓)
${formatScenario(results.scenarios as Record<string, { pass: boolean; checks: Record<string, boolean> }>, "loopOnly")}

## 3. 4a-4 mix (freq ~11)
${formatScenario(results.scenarios as Record<string, { pass: boolean; checks: Record<string, boolean> }>, "mix4a44")}

JSON: \`reports/pr3-phase4a-5-lts-split-dry-run.json\`
`;

  const mdPath = resolve(root, "reports/pr3-phase4a-5-lts-split-dry-run.md");
  writeFileSync(mdPath, md);

  console.log(JSON.stringify(results, null, 2));
  console.log(`\nWrote ${jsonPath}\nWrote ${mdPath}`);
  process.exit(results.allPass ? 0 : 1);
}

function formatScenario(
  scenarios: Record<
    string,
    {
      pass: boolean;
      legacy: { netReach: number; frequency: number; totalImpressions: number };
      current: { netReach: number; frequency: number; totalImpressions: number };
      checks: Record<string, boolean>;
    }
  >,
  key: string,
): string {
  const s = scenarios[key];
  if (!s) return "(missing)";
  return `| | legacy | current |
|---|-----:|--------:|
| netReach | ${Math.round(s.legacy.netReach).toLocaleString()} | ${Math.round(s.current.netReach).toLocaleString()} |
| frequency | ${s.legacy.frequency.toFixed(2)} | ${s.current.frequency.toFixed(2)} |
| impressions | ${s.legacy.totalImpressions.toLocaleString()} | ${s.current.totalImpressions.toLocaleString()} |

checks: ${Object.entries(s.checks)
    .map(([k, v]) => `${k}=${v ? "✅" : "❌"}`)
    .join(", ")}

**${s.pass ? "PASS" : "FAIL"}**`;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
