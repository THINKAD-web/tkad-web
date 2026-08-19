#!/usr/bin/env npx tsx
/**
 * PR-3 Phase 3-3 — scoring verification (read-only).
 * "3천만원 서울경기 2030 여성 2주" 브리프 시나리오.
 */
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { normalizePgDatabaseUrl } from "../lib/normalize-pg-database-url.ts";
import { prismaMediaToMediaItem } from "../lib/public-media-catalog.ts";
import { scoreMediaCandidates } from "../lib/planner/brief/scoring.ts";
import { classifyMedia } from "../lib/metrics/classify.ts";
import {
  DEFAULT_DEMO_AGE,
  DEFAULT_DEMO_GENDER,
  targetAudienceShare,
} from "../lib/metrics/defaults.ts";
import { sidoCodesToBrowseMainIds } from "../lib/planner/brief/regions.ts";
import type { CampaignBriefInput } from "../lib/planner/brief/types.ts";
import { EMPTY_BRIEF } from "../lib/planner/brief/types.ts";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env.local") });

const BASE_BRIEF: CampaignBriefInput = {
  ...EMPTY_BRIEF,
  budgetInputWon: 30_000_000,
  budgetMode: "total",
  regionCodes: ["11", "41"],
  flightStart: "2026-09-01",
  flightEnd: "2026-09-14",
};

function topNames(
  scored: ReturnType<typeof scoreMediaCandidates>,
  n = 10,
): string[] {
  return scored.slice(0, n).map((s) => s.media.name);
}

async function main() {
  const url = normalizePgDatabaseUrl(process.env.DATABASE_URL ?? "");
  if (!url) throw new Error("DATABASE_URL required");
  const host = url.match(/@([^/]+)/)?.[1] ?? "unknown";

  const pool = new Pool({ connectionString: url, max: 3 });
  const db = new PrismaClient({ adapter: new PrismaPg(pool) });

  const rows = await db.media.findMany({
    where: { isActive: true, country: "KR" },
    include: {
      advertiserExecutions: {
        select: { advertiserName: true },
        orderBy: { createdAt: "desc" },
      },
      computedMetric: {
        select: {
          demoGenderSplit: true,
          demoAgeSplit: true,
          demoSourceSignalIds: true,
        },
      },
    },
  });

  const catalog = rows.map((row) => prismaMediaToMediaItem(row));
  const wanted = new Set(sidoCodesToBrowseMainIds(["11", "41"]));
  const candidates = catalog.filter(
    (m) =>
      !m.regionMain ||
      wanted.has(m.regionMain) ||
      m.regionMain === "national",
  );

  const withDemo = catalog.filter(
    (m) => m.demoGenderSplit && m.demoAgeSplit,
  ).length;

  const female2030 = scoreMediaCandidates({
    candidates,
    brief: {
      ...BASE_BRIEF,
      genders: ["female"],
      ageBands: ["20s", "30s"],
    },
    days: 14,
  });
  const male2030 = scoreMediaCandidates({
    candidates,
    brief: {
      ...BASE_BRIEF,
      genders: ["male"],
      ageBands: ["20s", "30s"],
    },
    days: 14,
  });
  const female50 = scoreMediaCandidates({
    candidates,
    brief: {
      ...BASE_BRIEF,
      genders: ["female"],
      ageBands: ["50s+"],
    },
    days: 14,
  });

  const withTargetAxis = female2030.filter((s) =>
    s.axes.some((a) => a.key === "target"),
  ).length;

  const classShare2030Female = Object.fromEntries(
    (
      [
        "subway_psd",
        "dooh_mid",
        "bus_exterior",
        "subway_light",
        "airport",
        "static_other",
      ] as const
    ).map((cls) => [
      cls,
      Math.round(
        targetAudienceShare(
          DEFAULT_DEMO_GENDER[cls],
          DEFAULT_DEMO_AGE[cls],
          { genders: ["female"], ageBands: ["20s", "30s"] },
        ) * 1000,
      ) / 10,
    ]),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    host,
    catalog: {
      activeKr: catalog.length,
      seoulGyeonggiCandidates: candidates.length,
      withDemoSnapshot: withDemo,
    },
    brief: "30M KRW · Seoul+Gyeonggi · 2030 female · 14 days",
    checks: {
      withTargetAxis,
      sameFemaleMaleTop10:
        topNames(female2030).join("|") === topNames(male2030).join("|"),
      same2030vs50Top10:
        topNames(female2030).join("|") === topNames(female50).join("|"),
      femaleVsMaleTop10Differs:
        topNames(female2030).join("|") !== topNames(male2030).join("|"),
      age2030vs50Top10Differs:
        topNames(female2030).join("|") !== topNames(female50).join("|"),
    },
    top10: {
      female2030: topNames(female2030),
      male2030: topNames(male2030),
      female50plus: topNames(female50),
    },
    classShare2030FemalePct: classShare2030Female,
    subwayPsdRankFemale2030:
      female2030.findIndex(
        (s) =>
          classifyMedia({
            type: s.media.type,
            subCategory: s.media.subCategory ?? s.media.mediaSubCategory,
            mainCategory: s.media.mediaCategory?.[0] ?? s.media.mediaMainCategory,
            name: s.media.name,
          }) === "subway_psd",
      ) + 1,
    priorInvestigation: {
      sameFemaleMale: true,
      withTargetAxis: 0,
    },
  };

  const out = resolve(root, "reports/pr3-phase3-33-scoring-verify-preview.json");
  writeFileSync(out, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`\nWrote ${out}`);

  await db.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
