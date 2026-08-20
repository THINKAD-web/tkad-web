#!/usr/bin/env npx tsx
/**
 * Phase 1b-4 — execute 후 prod 검증
 *
 * - 10건 SOV override 반영
 * - deferred 3 + wrap 샘플 무변화
 * - 4a-4 동일 10매체 mix 빈도 ~5
 * - 서울 택시 상단 formatCPM 가드
 */
import { readFileSync, writeFileSync } from "node:fs";
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
import { resolveSovShareWithBasis } from "../lib/metrics/defaults.ts";
import { isStaticMedia } from "../lib/metrics/classify.ts";
import { formatCPM } from "../lib/metrics/format.ts";
import {
  PHASE1B_EXECUTE_MEDIA_IDS,
  PHASE1B_DEFERRED_MEDIA_IDS,
  PHASE4A44_MIX_MEDIA_IDS,
} from "../lib/metrics/phase1b-min-ids.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

const BRIEF = {
  genders: ["female"] as const,
  ageBands: ["20s", "30s"] as const,
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

async function main() {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });
  const popIndex = await fetchMoisPopulationIndex(db);

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

  const executeRows = await db.media.findMany({
    where: { id: { in: [...PHASE1B_EXECUTE_MEDIA_IDS] } },
    include: catalogInclude,
  });

  const deferredRows = await db.media.findMany({
    where: { id: { in: [...PHASE1B_DEFERRED_MEDIA_IDS] } },
    include: catalogInclude,
  });

  const wrapIds = loadWrapSample();
  const wrapRows = await db.media.findMany({
    where: { id: { in: wrapIds } },
    include: catalogInclude,
  });

  const doohMixIds = PHASE4A44_MIX_MEDIA_IDS.filter(
    (id) =>
      !PHASE1B_EXECUTE_MEDIA_IDS.includes(
        id as (typeof PHASE1B_EXECUTE_MEDIA_IDS)[number],
      ),
  ).filter((id) =>
    ["cmnzdtqyf000204lbz82w6ipv", "cmp02e0n7000a04jx1rze9gst", "cmp0flm3o000804l25v8pmo4x", "cmr0p4wk6000004ky6mjvw3qb"].includes(id),
  );

  const doohRows = await db.media.findMany({
    where: { id: { in: doohMixIds } },
    include: catalogInclude,
  });

  type SovCheck = {
    id: string;
    name: string;
    forceLoopSov: boolean | null;
    sovValue: number;
    sovBasis: string;
    pass: boolean;
  };

  const executeChecks: SovCheck[] = executeRows.map((m) => {
    const item = prismaMediaToMediaItem(
      m as MediaWithAdvertiserExecutions,
      popIndex,
    );
    const sub = m.subCategory ?? m.mediaSubCategory ?? "";
    const sov = resolveSovShareWithBasis({
      type: m.type ?? "",
      subCategory: sub,
      name: m.name,
      forceLoopSov: item.forceLoopSov,
      spotDuration: item.spotDurationSec,
      loopDuration: item.loopDurationSec,
      playsPerHour: item.playsPerHour,
    });
    return {
      id: m.id,
      name: m.name,
      forceLoopSov: m.factSheet?.forceLoopSov ?? null,
      sovValue: sov.value,
      sovBasis: sov.basis,
      pass:
        m.factSheet?.forceLoopSov === true &&
        sov.basis === "override" &&
        sov.value === 0.1,
    };
  });

  const deferredChecks: SovCheck[] = deferredRows.map((m) => {
    const item = prismaMediaToMediaItem(
      m as MediaWithAdvertiserExecutions,
      popIndex,
    );
    const sub = m.subCategory ?? m.mediaSubCategory ?? "";
    const sov = resolveSovShareWithBasis({
      type: m.type ?? "",
      subCategory: sub,
      name: m.name,
      forceLoopSov: item.forceLoopSov,
    });
    return {
      id: m.id,
      name: m.name,
      forceLoopSov: m.factSheet?.forceLoopSov ?? null,
      sovValue: sov.value,
      sovBasis: sov.basis,
      pass:
        m.factSheet?.forceLoopSov !== true &&
        sov.value === 1 &&
        isStaticMedia({ type: m.type, subCategory: sub, name: m.name }),
    };
  });

  const wrapChecks = wrapRows.map((m) => {
    const item = prismaMediaToMediaItem(
      m as MediaWithAdvertiserExecutions,
      popIndex,
    );
    const sub = m.subCategory ?? m.mediaSubCategory ?? "";
    const sov = resolveSovShareWithBasis({
      type: m.type ?? "",
      subCategory: sub,
      name: m.name,
      forceLoopSov: item.forceLoopSov,
    });
    return {
      id: m.id,
      name: m.name,
      sovValue: sov.value,
      pass: sov.value === 1 && item.forceLoopSov !== true,
    };
  });

  const doohChecks = doohRows.map((m) => {
    const item = prismaMediaToMediaItem(
      m as MediaWithAdvertiserExecutions,
      popIndex,
    );
    const sub = m.subCategory ?? m.mediaSubCategory ?? "";
    const sov = resolveSovShareWithBasis({
      type: m.type ?? "",
      subCategory: sub,
      name: m.name,
      forceLoopSov: item.forceLoopSov,
    });
    return {
      id: m.id,
      name: m.name,
      sovValue: sov.value,
      sovBasis: sov.basis,
      pass: item.forceLoopSov !== true && sov.value < 1,
    };
  });

  const mixRows = await db.media.findMany({
    where: { id: { in: [...PHASE4A44_MIX_MEDIA_IDS] } },
    include: catalogInclude,
  });
  const catalog = mixRows.map((r) =>
    prismaMediaToMediaItem(r as MediaWithAdvertiserExecutions, popIndex),
  );
  const lines = PHASE4A44_MIX_MEDIA_IDS.map((id) => {
    const media = catalog.find((m) => m.id === id);
    if (!media) throw new Error(`mix media missing: ${id}`);
    return { media, units: 1 };
  });

  const target = briefToTargetSpec({
    ...BRIEF,
    budgetInputWon: 30_000_000,
    budgetMode: "total",
    regionCodes: ["11", "41"],
    goal: null,
    industry: null,
    flightStart: null,
    flightEnd: null,
    freeText: "",
  });

  const mix = calcMixMetrics({
    lines,
    days: 14,
    budgetWon: 30_000_000,
    target,
  });

  const reachWrap = (await import("../lib/planner/brief/mix-metrics.ts")).tryCalcReach({
    lines,
    days: 14,
    target,
    dongs: buildDongProfilesFromLines(lines),
    coverageByMediaId: buildCoverageByMediaId(lines),
  });

  const taxiRow = executeRows.find((r) => r.id === "cmq9cpmym000204jltw5crun4");
  let taxiCpmDisplay: string | null = null;
  let taxiRawCpm: number | null = null;
  if (taxiRow) {
    const taxiItem = prismaMediaToMediaItem(
      taxiRow as MediaWithAdvertiserExecutions,
      popIndex,
    );
    const line = calcMixMetrics({
      lines: [{ media: taxiItem, units: 1 }],
      days: 14,
      budgetWon: taxiItem.price,
      target,
    });
    taxiRawCpm = line.mixCpmWon.value;
    taxiCpmDisplay = formatCPM(line.mixCpmWon.value);
  }

  await db.$disconnect();
  await pool.end();

  const frequency = reachWrap?.result.frequency ?? mix.frequency?.value ?? null;

  const report = {
    generatedAt: new Date().toISOString(),
    execute: {
      total: executeChecks.length,
      pass: executeChecks.filter((c) => c.pass).length,
      rows: executeChecks,
    },
    deferred: {
      total: deferredChecks.length,
      pass: deferredChecks.filter((c) => c.pass).length,
      rows: deferredChecks,
    },
    wrapSample: {
      total: wrapChecks.length,
      pass: wrapChecks.filter((c) => c.pass).length,
      rows: wrapChecks,
    },
    doohMixUnchanged: {
      total: doohChecks.length,
      pass: doohChecks.filter((c) => c.pass).length,
      rows: doohChecks,
    },
    mix4a44: {
      mediaIds: [...PHASE4A44_MIX_MEDIA_IDS],
      frequencyBefore: 19.6,
      frequencyNow: frequency,
      frequencyPass: frequency != null && frequency >= 4 && frequency <= 7,
      totalImpressions: mix.totalImpressions.value,
      netReach: mix.netReach?.value ?? null,
    },
    taxiTopCpmGuard: {
      rawCpm: taxiRawCpm,
      formatCPM: taxiCpmDisplay,
      pass: taxiCpmDisplay === "CPM 산정 중",
    },
    allPass:
      executeChecks.every((c) => c.pass) &&
      deferredChecks.every((c) => c.pass) &&
      wrapChecks.every((c) => c.pass) &&
      doohChecks.every((c) => c.pass) &&
      (frequency != null && frequency >= 4 && frequency <= 7) &&
      taxiCpmDisplay === "CPM 산정 중",
  };

  const outJson = resolve(root, "reports/pr3-phase1b-execute-verify-production.json");
  writeFileSync(outJson, JSON.stringify(report, null, 2));

  const md = `# Phase 1b-4 execute verify (production)

생성: ${report.generatedAt}

## Execute 10건
- PASS: **${report.execute.pass}/${report.execute.total}**

## Deferred 3건 (무변화)
- PASS: **${report.deferred.pass}/${report.deferred.total}**

## Wrap 샘플
- PASS: **${report.wrapSample.pass}/${report.wrapSample.total}**

## DOOH mix (4a-4 내 비버스)
- PASS: **${report.doohMixUnchanged.pass}/${report.doohMixUnchanged.total}**

## 4a-4 mix 빈도
| | 값 |
|---|-----:|
| before | 19.6 |
| after | ${frequency ?? "null"} |
| PASS (4~7) | ${report.mix4a44.frequencyPass ? "✅" : "❌"} |

## 서울 택시 상단 formatCPM
- raw CPM: ${taxiRawCpm ?? "—"}
- display: **${taxiCpmDisplay ?? "—"}**
- PASS: ${report.taxiTopCpmGuard.pass ? "✅" : "❌"}

## Overall
**${report.allPass ? "✅ ALL PASS" : "❌ FAIL — see JSON"}**

JSON: pr3-phase1b-execute-verify-production.json
`;

  writeFileSync(
    resolve(root, "reports/pr3-phase1b-execute-verify-production.md"),
    md,
  );

  console.log(JSON.stringify(report, null, 2));
  process.exit(report.allPass ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
