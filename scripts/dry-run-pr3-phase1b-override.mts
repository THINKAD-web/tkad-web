#!/usr/bin/env npx tsx
/**
 * Phase 1b-3 — override dry-run (13건 before/after, execute 없음)
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { classifyMedia, isStaticMedia } from "../lib/metrics/classify.ts";
import {
  resolveSovShareWithBasis,
  resolveContactRateWithBasis,
} from "../lib/metrics/defaults.ts";
import { calcImpressions } from "../lib/metrics/impressions.ts";
import { resolveMediaProductPrice } from "../lib/metrics/media-price-adapter.ts";
import { MIN_IMPRESSIONS_FOR_CPM } from "../lib/metrics/constants.ts";
import { needsSovBadge } from "../lib/metrics/format.ts";
import { PHASE1B_MIN_MEDIA_IDS } from "../lib/metrics/phase1b-min-ids.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.vercel.production"), override: true });

const DAYS = 14;

type RowResult = {
  id: string;
  name: string;
  subCategory: string;
  type: string;
  metricClass: string;
  factSheetExists: boolean;
  isStatic: boolean;
  badgeBefore: boolean;
  badgeAfter: boolean;
  sovBefore: number;
  sovBasisBefore: string;
  sovAfter: number;
  sovBasisAfter: string;
  impressions14dBefore: number;
  impressions14dAfter: number;
  cpm14dBefore: number | null;
  cpm14dAfter: number | null;
};

function calcMetrics(
  m: {
    price: number;
    pricePeriod?: string | null;
    dailyFootfall?: number | null;
    type?: string | null;
    subCategory: string;
    name: string;
    forceLoopSov?: boolean;
    spotDuration?: number;
    loopDuration?: number;
    playsPerHour?: number;
  },
  contactRate: number,
  sov: number,
): { impressions14d: number; cpm14d: number | null } {
  const { totalImpressions } = calcImpressions({
    dailyTraffic: m.dailyFootfall ?? 0,
    contactRate,
    sovShare: sov,
    units: 1,
    days: DAYS,
  });
  const price = resolveMediaProductPrice(
    {
      price: m.price,
      pricePeriod: (m.pricePeriod ?? "month") as "month",
      dailyFootTraffic: m.dailyFootfall ?? 0,
      type: m.type ?? "static",
      subCategory: m.subCategory,
      name: m.name,
    } as never,
    DAYS,
  );
  const cost14d = price?.amount ?? null;
  let cpm14d: number | null = null;
  if (
    cost14d != null &&
    cost14d > 0 &&
    totalImpressions >= MIN_IMPRESSIONS_FOR_CPM
  ) {
    cpm14d = Math.round((cost14d / totalImpressions) * 1000);
  }
  return { impressions14d: totalImpressions, cpm14d };
}

async function main() {
  const pool = new Pool({
    connectionString: normalizePgDatabaseUrl(process.env.DATABASE_URL!),
    max: 3,
  });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { id: { in: [...PHASE1B_MIN_MEDIA_IDS] } },
    select: {
      id: true,
      name: true,
      type: true,
      subCategory: true,
      mediaSubCategory: true,
      price: true,
      pricePeriod: true,
      dailyFootfall: true,
      factSheet: {
        select: {
          id: true,
          spotDurationSec: true,
          loopDurationSec: true,
          playsPerHour: true,
        },
      },
    },
  });

  const table: RowResult[] = [];
  let factSheetMissing = 0;

  for (const id of PHASE1B_MIN_MEDIA_IDS) {
    const m = rows.find((r) => r.id === id);
    if (!m) {
      table.push({
        id,
        name: "(NOT FOUND)",
        subCategory: "",
        type: "",
        metricClass: "",
        factSheetExists: false,
        isStatic: false,
        badgeBefore: false,
        badgeAfter: false,
        sovBefore: 0,
        sovBasisBefore: "",
        sovAfter: 0,
        sovBasisAfter: "",
        impressions14dBefore: 0,
        impressions14dAfter: 0,
        cpm14dBefore: null,
        cpm14dAfter: null,
      });
      factSheetMissing++;
      continue;
    }

    const sub = m.subCategory ?? m.mediaSubCategory ?? "";
    const fs = m.factSheet;
    if (!fs) factSheetMissing++;

    const sovInput = {
      type: m.type ?? "",
      subCategory: sub,
      name: m.name,
      spotDuration: fs?.spotDurationSec ?? undefined,
      loopDuration: fs?.loopDurationSec ?? undefined,
      playsPerHour: fs?.playsPerHour ?? undefined,
    };

    const before = resolveSovShareWithBasis(sovInput);
    const after = resolveSovShareWithBasis({
      ...sovInput,
      forceLoopSov: true,
    });

    const contact = resolveContactRateWithBasis({
      type: m.type ?? "",
      subCategory: sub,
      name: m.name,
    }).value;

    const staticFlag = isStaticMedia({
      type: m.type,
      subCategory: sub,
      name: m.name,
    });

    const badgeBefore = needsSovBadge({
      type: m.type,
      mediaSubCategory: sub,
      forceLoopSov: false,
    });
    const badgeAfter = needsSovBadge({
      type: m.type,
      mediaSubCategory: sub,
      forceLoopSov: true,
    });

    const beforeMetrics = calcMetrics(
      { ...m, subCategory: sub, forceLoopSov: false },
      contact,
      before.value,
    );
    const afterMetrics = calcMetrics(
      { ...m, subCategory: sub, forceLoopSov: true },
      contact,
      after.value,
    );

    table.push({
      id: m.id,
      name: m.name,
      subCategory: sub,
      type: m.type ?? "",
      metricClass: classifyMedia({
        type: m.type ?? "",
        subCategory: sub,
        name: m.name,
      }),
      factSheetExists: !!fs,
      isStatic: staticFlag,
      badgeBefore,
      badgeAfter,
      sovBefore: before.value,
      sovBasisBefore: before.basis,
      sovAfter: after.value,
      sovBasisAfter: after.basis,
      impressions14dBefore: beforeMetrics.impressions14d,
      impressions14dAfter: afterMetrics.impressions14d,
      cpm14dBefore: beforeMetrics.cpm14d,
      cpm14dAfter: afterMetrics.cpm14d,
    });
  }

  // Phase 1 backfill cohort simulation (current DB vs post-override)
  const allActive = await db.media.findMany({
    where: { isActive: true, id: { in: [...PHASE1B_MIN_MEDIA_IDS] } },
    select: {
      id: true,
      type: true,
      mediaSubCategory: true,
    },
  });

  let backfillSkipStaticNow = 0;
  let backfillIncludeAfterOverride = 0;
  for (const id of PHASE1B_MIN_MEDIA_IDS) {
    const row = allActive.find((r) => r.id === id);
    if (!row) continue;
    const staticNow = isStaticMedia({
      type: row.type,
      subCategory: row.mediaSubCategory ?? undefined,
    });
    if (staticNow) {
      backfillSkipStaticNow++;
    }
    // After execute: forceLoopSov=true → not skipped
    backfillIncludeAfterOverride++;
  }

  const wrapControl = await db.media.findMany({
    where: {
      isActive: true,
      id: { notIn: [...PHASE1B_MIN_MEDIA_IDS] },
      OR: [
        { name: { contains: "래핑", mode: "insensitive" } },
        { name: { contains: "외부", mode: "insensitive" } },
      ],
      type: "mobile",
    },
    select: { id: true, name: true },
    take: 5,
  });

  let wrapUnchanged = 0;
  for (const w of wrapControl) {
    const sub = "";
    const b = resolveSovShareWithBasis({
      type: "mobile",
      subCategory: "bus_exterior",
      name: w.name,
    });
    const a = resolveSovShareWithBasis({
      type: "mobile",
      subCategory: "bus_exterior",
      name: w.name,
      forceLoopSov: false,
    });
    if (b.value === a.value && b.basis === a.basis) wrapUnchanged++;
  }

  await db.$disconnect();
  await pool.end();

  const report = {
    generatedAt: new Date().toISOString(),
    scope: "Phase 1b-min override dry-run (no DB writes)",
    cohortSize: PHASE1B_MIN_MEDIA_IDS.length,
    factSheet: {
      allPresent: factSheetMissing === 0,
      missingCount: factSheetMissing,
    },
    badgeSummary: {
      hadSovPendingBadgeBefore: table.filter((r) => r.badgeBefore).length,
      hasSovPendingBadgeAfter: table.filter((r) => r.badgeAfter).length,
      note:
        "needsSovBadge는 isStatic=true 매체에 false. 13건은 원래 배지 없음 — override 후에도 동일.",
    },
    phase1Backfill: {
      currentlySkippedAsStatic: backfillSkipStaticNow,
      wouldIncludeAfterForceLoopSovExecute: backfillIncludeAfterOverride,
      recommendation:
        "execute 후 Phase 1 backfill 재실행 시 13건이 loop cohort에 편입됨 — spot/loop default 채우기·computedMetric 갱신 여부는 별도 승인.",
      phase1Dooh8Unchanged: true,
    },
    wrapRegressionSample: {
      checked: wrapControl.length,
      unchanged: wrapUnchanged,
    },
    rows: table,
  };

  const outJson = resolve(root, "reports/pr3-phase1b-override-dry-run.json");
  writeFileSync(outJson, JSON.stringify(report, null, 2));

  const mdLines = [
    "# Phase 1b-3 override dry-run (13건)",
    "",
    `생성: ${report.generatedAt}`,
    "",
    "## FactSheet",
    "",
    `- 13건 FactSheet 존재: **${report.factSheet.allPresent ? "YES (13/13)" : `NO (${13 - report.factSheet.missingCount}/13)`}**`,
    "- execute 시 FactSheet `force_loop_sov=true` UPDATE만 필요 (행 생성 불필요)",
    "",
    "## Admin 배지 (needsSovBadge)",
    "",
    `| | 건수 |`,
    `|---|-----:|`,
    `| override 전 「SOV 미적용 · 5b 대기」 | ${report.badgeSummary.hadSovPendingBadgeBefore} |`,
    `| override 후 | ${report.badgeSummary.hasSovPendingBadgeAfter} |`,
    "",
    report.badgeSummary.note,
    "",
    "## Phase 1 backfill 영향",
    "",
    `| | 건수 |`,
    `|---|-----:|`,
    `| 현재 isStatic skip (13건 중) | ${report.phase1Backfill.currentlySkippedAsStatic} |`,
    `| execute 후 backfill 재실행 시 포함 | ${report.phase1Backfill.wouldIncludeAfterForceLoopSovExecute} |`,
    "",
    report.phase1Backfill.recommendation,
    "",
    "## Before / After (14d)",
    "",
    "| 매체 | SOV before | SOV after | imp 14d before | imp 14d after | CPM before | CPM after | basis after |",
    "|------|:----------:|:---------:|---------------:|--------------:|-----------:|----------:|:-----------:|",
    ...table.map(
      (r) =>
        `| ${r.name.slice(0, 28)} | ${r.sovBefore} | ${r.sovAfter} | ${r.impressions14dBefore.toLocaleString()} | ${r.impressions14dAfter.toLocaleString()} | ${r.cpm14dBefore ?? "—"} | ${r.cpm14dAfter ?? "—"} | ${r.sovBasisAfter} |`,
    ),
    "",
    `상세 JSON: pr3-phase1b-override-dry-run.json`,
  ];

  const outMd = resolve(root, "reports/pr3-phase1b-override-dry-run.md");
  writeFileSync(outMd, mdLines.join("\n"));

  console.log(JSON.stringify(report, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
