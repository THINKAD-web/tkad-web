#!/usr/bin/env npx tsx
/**
 * P1 매칭 검증 리포트 — 업종 Strong 비율, Jaehan TOP10, 자동 믹스.
 * Usage: npx tsx scripts/report-brief-matching-p1.mts
 */
import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });
(globalThis as { require?: NodeRequire }).require = createRequire(import.meta.url);

import { fetchPublicMediaCatalog } from "../lib/public-media-catalog.ts";
import type { MediaItem } from "../lib/media-data.ts";
import { getPrimaryMediaImageUrl } from "../lib/media-data.ts";
import { filterBriefCatalogByRegion } from "../lib/planner/brief/regions.ts";
import {
  buildRecommendedMix,
  scoreMediaCandidates,
  type ScoredMedia,
} from "../lib/planner/brief/scoring.ts";
import { countIndustryTiers } from "../lib/planner/brief/industry-bonus.ts";
import { scoreMediaIndustryMatch } from "../lib/matching-engine.ts";
import { briefIndustryToPlanner } from "../lib/planner/brief/brief-integrated-adapters.ts";
import { PLANNER_INDUSTRY_TO_MATCHING } from "../lib/planner/industry-match.ts";
import type { BriefIndustry, CampaignBriefInput } from "../lib/planner/brief/types.ts";
import { BRIEF_INDUSTRIES } from "../lib/planner/brief/types.ts";
import { durationToFlight } from "../lib/planner/brief/natural-language.ts";

const outDir = resolve(root, "scripts/.diagnose-brief-matching-regression");

function legacyIndustryAxisScore(
  media: MediaItem,
  industry: BriefIndustry,
): number {
  const plannerKey = briefIndustryToPlanner(industry);
  const matchingIndustry = PLANNER_INDUSTRY_TO_MATCHING[plannerKey];
  const pts = scoreMediaIndustryMatch(media, matchingIndustry);
  return Math.min(100, Math.max(0, Math.round((pts / 20) * 100)));
}

/** P1 이전: 4축 평균 (업종 포함), 페널티·보너스 분리 없음 */
function scoreLegacyP0(candidates: readonly MediaItem[], brief: CampaignBriefInput, days: number): ScoredMedia[] {
  const current = scoreMediaCandidates({ candidates, brief, days, isKo: true });
  return current.map((row) => {
    const axes = row.axes.filter((a) => a.key !== "industry");
    if (brief.industry && brief.industry !== "other") {
      const legacyIndustry = legacyIndustryAxisScore(row.media, brief.industry);
      axes.push({
        key: "industry",
        score: legacyIndustry,
        rationale: "legacy",
      });
    }
    const total =
      axes.length > 0
        ? Math.round(axes.reduce((s, a) => s + a.score, 0) / axes.length)
        : 0;
    return { ...row, axes, total, baseTotal: total, industryBonus: 0, budgetPenalty: 0 };
  }).sort((a, b) => b.total - a.total);
}

function buildLegacyMix(scored: readonly ScoredMedia[], days: number, budgetWon: number) {
  const out: { mediaId: string; units: number }[] = [];
  let spent = 0;
  for (const s of scored) {
    if (out.length >= 5) break;
    const cost = s.lineCostWon;
    if (cost == null || cost <= 0) continue;
    if (spent + cost > budgetWon) continue;
    out.push({ mediaId: s.media.id, units: 1 });
    spent += cost;
  }
  return out;
}

function top10(scored: ScoredMedia[]) {
  return scored.slice(0, 10).map((s, i) => ({
    rank: i + 1,
    id: s.media.id,
    name: s.media.name,
    district: s.media.district ?? null,
    type: s.media.type,
    total: s.total,
    industryBonus: s.industryBonus,
    overBudget: s.overBudget,
  }));
}

function districtCounts(rows: ReturnType<typeof top10>) {
  const m = new Map<string, number>();
  for (const r of rows) {
    const d = r.district ?? "unknown";
    m.set(d, (m.get(d) ?? 0) + 1);
  }
  return Object.fromEntries(m);
}

const catalog = await fetchPublicMediaCatalog();
const active = catalog.filter((m) => m.isActive !== false);

const industryStrongTable = BRIEF_INDUSTRIES.filter((i) => i !== "other").map(
  (industry) => {
    const candidates = filterBriefCatalogByRegion(active, []);
    const legacyStrong = candidates.filter(
      (m) => legacyIndustryAxisScore(m, industry) >= 85,
    ).length;
    const legacyPct = ((legacyStrong / candidates.length) * 100).toFixed(1);
    const tiers = countIndustryTiers(candidates, industry);
    return {
      industry,
      beforePct: legacyPct,
      afterPct: tiers.strongPct,
      beforeStrong: legacyStrong,
      afterStrong: tiers.strong,
      total: tiers.total,
    };
  },
);

const { flightStart, flightEnd } = durationToFlight(14);
const jaehanBrief: CampaignBriefInput = {
  budgetInputWon: 30_000_000,
  budgetMode: "total",
  regionCodes: ["11", "41"],
  genders: ["female"],
  ageBands: ["20s", "30s"],
  goal: "awareness",
  industry: "fb",
  freeText: "",
  flightStart,
  flightEnd,
};
const jaehanCandidates = filterBriefCatalogByRegion(
  active,
  jaehanBrief.regionCodes,
);
const legacyScored = scoreLegacyP0(jaehanCandidates, jaehanBrief, 14);
const p1Scored = scoreMediaCandidates({
  candidates: jaehanCandidates,
  brief: jaehanBrief,
  days: 14,
  isKo: true,
});

const legacyMix = buildLegacyMix(legacyScored, 14, 30_000_000);
const p1Mix = buildRecommendedMix({
  scored: p1Scored,
  days: 14,
  budgetWon: 30_000_000,
});

const report = {
  generatedAt: new Date().toISOString(),
  industryStrongTable,
  jaehanScenario: {
    brief: "F&B / 서울·경기 / 3천만 / 2030 여 / 14일",
    top10Before: top10(legacyScored),
    top10After: top10(p1Scored),
    top10Overlap: top10(legacyScored).filter((b) =>
      top10(p1Scored).some((a) => a.id === b.id),
    ).length,
    districtTop10Before: districtCounts(top10(legacyScored)),
    districtTop10After: districtCounts(top10(p1Scored)),
    mixBefore: legacyMix.map((l) => {
      const m = active.find((x) => x.id === l.mediaId);
      return { id: l.mediaId, name: m?.name, district: m?.district, type: m?.type };
    }),
    mixAfter: p1Mix.map((l) => {
      const m = active.find((x) => x.id === l.mediaId);
      return { id: l.mediaId, name: m?.name, district: m?.district, type: m?.type };
    }),
    mixDistrictBefore: legacyMix.map((l) => active.find((x) => x.id === l.mediaId)?.district),
    mixDistrictAfter: p1Mix.map((l) => active.find((x) => x.id === l.mediaId)?.district),
  },
};

mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, "p1-verification-report.json");
writeFileSync(outPath, JSON.stringify(report, null, 2));

console.log("=== Industry Strong % (before → after) ===");
for (const row of industryStrongTable) {
  console.log(
    `${row.industry.padEnd(8)} ${row.beforePct}% → ${row.afterPct}% (${row.afterStrong}/${row.total})`,
  );
}
console.log("\n=== Jaehan TOP10 overlap ===", report.jaehanScenario.top10Overlap, "/10");
console.log("BEFORE:", report.jaehanScenario.top10Before.map((r) => r.name).join(" | "));
console.log("AFTER: ", report.jaehanScenario.top10After.map((r) => r.name).join(" | "));
console.log("\nMix BEFORE districts:", report.jaehanScenario.mixDistrictBefore);
console.log("Mix AFTER districts: ", report.jaehanScenario.mixDistrictAfter);
console.log(`\nWrote ${outPath}`);
