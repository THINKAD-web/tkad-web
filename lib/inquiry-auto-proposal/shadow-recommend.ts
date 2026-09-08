import { resolveMonthlyListPriceWon } from "@/lib/media-metrics";
import type { MediaItem } from "@/lib/media-data";
import { buildAiRecommendInputFromFreetextRaw } from "@/lib/recommend/build-freetext-recommend-input";
import { resolveAiRecommendPlannerRegionIds } from "@/lib/recommend/recommend-region-filter";
import { runRecommendation } from "@/lib/recommendation-service";
import { aiInputToMatching } from "@/lib/recommendation-adapters";
import {
  evaluateProposalCandidate,
  type ProposalExcludeReason,
} from "./candidate-filter";
import {
  matchInquiryMedia,
  type MatchedProposalMedia,
  type ProposalCatalogRow,
} from "./match-and-options";
import type { ParsedInquiryProposal } from "./parse-inquiry-text";
import { parseInquiryProposalText } from "./parse-inquiry-text";
import {
  isDesignatedInquiryMatch,
  selectInquiryBodyMix,
  type InquiryMixSelection,
} from "./select-inquiry-mix";
import type { InquiryAutoProposalDryRun } from "./run-dry-run";

export type InquiryShadowDiffCategory =
  | "nearly_identical"
  | "both_reasonable"
  | "shadow_better"
  | "shadow_problematic";

export type InquiryShadowRecommendPick = {
  id: string;
  name: string;
  score: number;
  rank: number;
  eligible: boolean;
  reasons: ProposalExcludeReason[];
};

export type InquiryShadowNamedLockIn = {
  needle: string;
  matchedIds: string[];
  matchedNames: string[];
  inLegacyDesignated: boolean;
  inShadowDesignated: boolean;
  inLegacyMix: boolean;
  inShadowMix: boolean;
};

export type InquiryShadowRunResult = {
  ok: boolean;
  error?: string;
  aiInputBuilt: boolean;
  recommendCount: number;
  recommendTop: InquiryShadowRecommendPick[];
  namedLockIns: InquiryShadowNamedLockIn[];
  legacyDesignatedIds: string[];
  shadowDesignatedIds: string[];
  shadowMix: InquiryMixSelection;
  shadowMixIds: string[];
};

export type InquiryShadowDiffReport = {
  sampleId?: string;
  label?: string;
  textPreview: string;
  category: InquiryShadowDiffCategory;
  mixJaccard: number;
  legacyMixIds: string[];
  shadowMixIds: string[];
  legacyMixTotalWon: number;
  shadowMixTotalWon: number;
  namedLockInSurvivalRate: number;
  namedLockIns: InquiryShadowNamedLockIn[];
  legacyDesignatedCount: number;
  shadowDesignatedCount: number;
  recommendTopIds: string[];
  notes: string[];
  shadow: InquiryShadowRunResult;
};

const SHADOW_RECOMMEND_LIMIT = 30;

/** inquiry proposal catalog → recommend engine 입력 (동일 KR active pool) */
function proposalCatalogToRecommendItems(
  rows: readonly ProposalCatalogRow[],
): MediaItem[] {
  return rows.map((r) => r.item);
}

function jaccard(a: readonly string[], b: readonly string[]): number {
  const setA = new Set(a);
  const setB = new Set(b);
  if (setA.size === 0 && setB.size === 0) return 1;
  let inter = 0;
  for (const id of setA) {
    if (setB.has(id)) inter++;
  }
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 1 : inter / union;
}

function catalogRowToMatched(
  row: ProposalCatalogRow,
  matchKind: MatchedProposalMedia["matchKind"],
): MatchedProposalMedia {
  const decision = evaluateProposalCandidate(row);
  return {
    id: row.id,
    name: row.name,
    monthlyWon: resolveMonthlyListPriceWon(row.item),
    matchKind,
    eligible: decision.eligible,
    reasons: decision.reasons,
    sellingUnitUndeclared: decision.sellingUnitUndeclared,
    cpmWon: decision.cpmWon,
    mediaClass: decision.mediaClass,
  };
}

function buildNamedLockInReport(args: {
  parsed: ParsedInquiryProposal;
  rows: readonly ProposalCatalogRow[];
  legacyDry: InquiryAutoProposalDryRun;
  shadowDesignatedIds: readonly string[];
  shadowMixIds: readonly string[];
}): InquiryShadowNamedLockIn[] {
  const legacyDesignatedIds = new Set(args.legacyDry.designated.map((m) => m.id));
  const legacyMixIds = new Set(Object.keys(args.legacyDry.mixUnits));
  const shadowDesignatedIds = new Set(args.shadowDesignatedIds);
  const shadowMixIds = new Set(args.shadowMixIds);

  const needles =
    args.parsed.namedNeedles.length > 0
      ? args.parsed.namedNeedles
      : args.legacyDry.designated
          .filter((m) => m.matchKind === "named")
          .map((m) => m.name);

  return needles.map((needle) => {
    const needleNorm = needle.replace(/\s+/g, "").replace(/광고$/, "").toLowerCase();
    const hits = args.rows.filter((row) => {
      const nameNorm = row.name.replace(/\s+/g, "").replace(/광고$/, "").toLowerCase();
      return nameNorm.includes(needleNorm) || needleNorm.includes(nameNorm);
    });
    const matchedIds = hits.map((h) => h.id);
    return {
      needle,
      matchedIds,
      matchedNames: hits.map((h) => h.name),
      inLegacyDesignated: matchedIds.some((id) => legacyDesignatedIds.has(id)),
      inShadowDesignated: matchedIds.some((id) => shadowDesignatedIds.has(id)),
      inLegacyMix: matchedIds.some((id) => legacyMixIds.has(id)),
      inShadowMix: matchedIds.some((id) => shadowMixIds.has(id)),
    };
  });
}

/** SSOT recommend + named lock-in constraint + CPM greedy (전환 예정 post-process) */
export async function runInquiryShadowRecommend(args: {
  text: string;
  parsed?: ParsedInquiryProposal;
  proposalCatalog: readonly ProposalCatalogRow[];
  legacyDry: InquiryAutoProposalDryRun;
}): Promise<InquiryShadowRunResult> {
  const parsed = args.parsed ?? parseInquiryProposalText(args.text);
  const catalogById = new Map(args.proposalCatalog.map((r) => [r.id, r]));

  const aiInput = buildAiRecommendInputFromFreetextRaw(args.text, true);
  if (!aiInput) {
    return {
      ok: false,
      error: "ai_input_build_failed",
      aiInputBuilt: false,
      recommendCount: 0,
      recommendTop: [],
      namedLockIns: [],
      legacyDesignatedIds: args.legacyDry.designated.map((m) => m.id),
      shadowDesignatedIds: [],
      shadowMix: { mixUnits: {}, selectedIds: [], bodyTotalWon: 0 },
      shadowMixIds: [],
    };
  }

  const matchingInput = aiInputToMatching(aiInput, 0);
  const plannerRegionIds = resolveAiRecommendPlannerRegionIds(aiInput);
  const catalogOverride = proposalCatalogToRecommendItems(args.proposalCatalog);

  let recommendTop: InquiryShadowRecommendPick[] = [];
  try {
    const { recommendations } = await runRecommendation({
      input: matchingInput,
      source: "recommend",
      limit: SHADOW_RECOMMEND_LIMIT,
      useClaude: false,
      excludeNetwork: true,
      skipCache: true,
      isKo: true,
      plannerRegionIds,
      aiRecommendInput: aiInput,
      catalogOverride,
    });

    recommendTop = recommendations.map((rec, index) => {
      const row = catalogById.get(rec.media.id);
      const decision = row
        ? evaluateProposalCandidate(row)
        : {
            eligible: false,
            reasons: ["inactive" as ProposalExcludeReason],
            sellingUnitUndeclared: false,
            mediaClass: "static_other" as const,
            cpmWon: null,
            bounds: [0, 0] as const,
          };
      return {
        id: rec.media.id,
        name: rec.media.name,
        score: rec.score,
        rank: index + 1,
        eligible: decision.eligible,
        reasons: decision.reasons,
      };
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      error: `runRecommendation_failed:${msg}`,
      aiInputBuilt: true,
      recommendCount: 0,
      recommendTop: [],
      namedLockIns: [],
      legacyDesignatedIds: args.legacyDry.designated.map((m) => m.id),
      shadowDesignatedIds: [],
      shadowMix: { mixUnits: {}, selectedIds: [], bodyTotalWon: 0 },
      shadowMixIds: [],
    };
  }

  const legacyNamed = matchInquiryMedia(args.proposalCatalog, parsed).filter(
    isDesignatedInquiryMatch,
  );

  const recommendDesignated: MatchedProposalMedia[] = [];
  for (const pick of recommendTop) {
    const row = catalogById.get(pick.id);
    if (!row) continue;
    recommendDesignated.push(catalogRowToMatched(row, "category"));
  }

  const shadowDesignatedById = new Map<string, MatchedProposalMedia>();
  for (const m of legacyNamed) {
    shadowDesignatedById.set(m.id, m);
  }
  for (const m of recommendDesignated) {
    if (!shadowDesignatedById.has(m.id)) {
      shadowDesignatedById.set(m.id, m);
    }
  }

  const shadowDesignated = [...shadowDesignatedById.values()];
  const namedForceIds = new Set(
    legacyNamed.filter((m) => m.eligible).map((m) => m.id),
  );
  const shadowMix = selectInquiryBodyMix({
    designated: shadowDesignated,
    budgetWon: parsed.budgetWon,
    months: parsed.months,
    forceIncludeIds: namedForceIds,
  });

  const shadowDesignatedIds = shadowDesignated.map((m) => m.id);
  const shadowMixIds = Object.keys(shadowMix.mixUnits);
  const namedLockIns = buildNamedLockInReport({
    parsed,
    rows: args.proposalCatalog,
    legacyDry: args.legacyDry,
    shadowDesignatedIds,
    shadowMixIds,
  });

  return {
    ok: true,
    aiInputBuilt: true,
    recommendCount: recommendTop.length,
    recommendTop,
    namedLockIns,
    legacyDesignatedIds: args.legacyDry.designated.map((m) => m.id),
    shadowDesignatedIds,
    shadowMix,
    shadowMixIds,
  };
}

export function classifyInquiryShadowDiff(args: {
  legacyDry: InquiryAutoProposalDryRun;
  shadow: InquiryShadowRunResult;
  mixJaccard: number;
}): { category: InquiryShadowDiffCategory; notes: string[] } {
  const notes: string[] = [];
  const legacyMixIds = Object.keys(args.legacyDry.mixUnits);
  const shadowMixIds = args.shadow.shadowMixIds;

  if (!args.shadow.ok) {
    notes.push(`shadow 실행 실패: ${args.shadow.error ?? "unknown"}`);
    return { category: "shadow_problematic", notes };
  }

  if (!args.shadow.aiInputBuilt) {
    notes.push("자유문장 → recommend 입력 변환 실패");
    return { category: "shadow_problematic", notes };
  }

  const lockIns = args.shadow.namedLockIns;
  const lockInTotal = lockIns.length;
  const lockInShadowDesignated = lockIns.filter((l) => l.inShadowDesignated).length;
  const lockInShadowMix = lockIns.filter((l) => l.inShadowMix).length;
  const survivalRate =
    lockInTotal === 0 ? 1 : lockInShadowDesignated / lockInTotal;

  if (lockInTotal > 0 && lockInShadowDesignated < lockInTotal) {
    notes.push(
      `named lock-in ${lockInTotal}건 중 shadow designated ${lockInShadowDesignated}건만 반영`,
    );
  }
  if (lockInTotal > 0 && lockInShadowMix < lockInTotal && legacyMixIds.length > 0) {
    notes.push(
      `named lock-in ${lockInTotal}건 중 shadow mix에 ${lockInShadowMix}건만 포함 (예산·CPM 제약)`,
    );
  }

  if (legacyMixIds.length > 0 && shadowMixIds.length === 0) {
    notes.push("legacy mix는 있으나 shadow mix가 비어 있음");
    return { category: "shadow_problematic", notes };
  }

  if (lockInTotal > 0 && survivalRate < 0.5) {
    notes.push("named lock-in 생존율 50% 미만");
    return { category: "shadow_problematic", notes };
  }

  if (args.mixJaccard >= 0.9) {
    notes.push(`mix Jaccard ${(args.mixJaccard * 100).toFixed(0)}% — 구성 거의 동일`);
    return { category: "nearly_identical", notes };
  }

  const legacyOnlyCategory =
    args.legacyDry.matched.some((m) => m.matchKind === "category") &&
    args.legacyDry.designated.every(isDesignatedInquiryMatch) === false;

  const shadowHasRecommendPicks = shadowMixIds.some(
    (id) => !args.legacyDry.designated.some((d) => d.id === id),
  );

  if (
    legacyOnlyCategory &&
    shadowHasRecommendPicks &&
    shadowMixIds.length >= legacyMixIds.length
  ) {
    notes.push(
      "legacy는 카테고리 substring만, shadow는 recommend region/category 스코어 반영",
    );
    return { category: "shadow_better", notes };
  }

  if (
    args.legacyDry.parsed.raw.match(/\[.+?\]|서울|부산|대구|인천/u) &&
    shadowMixIds.length > legacyMixIds.length &&
    args.mixJaccard < 0.9
  ) {
    notes.push("다지역·지역 키워드 문의에서 shadow가 더 많은 eligible mix 제안");
    return { category: "shadow_better", notes };
  }

  if (args.mixJaccard >= 0.5) {
    notes.push(
      `mix Jaccard ${(args.mixJaccard * 100).toFixed(0)}% — 스코어링 차이로 일부 교체`,
    );
  } else {
    notes.push(
      `mix Jaccard ${(args.mixJaccard * 100).toFixed(0)}% — 구성 차이 큼, shadow recommend top 확인 필요`,
    );
  }

  return { category: "both_reasonable", notes };
}

export async function buildInquiryShadowDiffReport(args: {
  text: string;
  legacyDry: InquiryAutoProposalDryRun;
  proposalCatalog: readonly ProposalCatalogRow[];
  sampleId?: string;
  label?: string;
}): Promise<InquiryShadowDiffReport> {
  const shadow = await runInquiryShadowRecommend({
    text: args.text,
    parsed: args.legacyDry.parsed,
    proposalCatalog: args.proposalCatalog,
    legacyDry: args.legacyDry,
  });

  const legacyMixIds = Object.keys(args.legacyDry.mixUnits);
  const mixJaccard = jaccard(legacyMixIds, shadow.shadowMixIds);
  const { category, notes } = classifyInquiryShadowDiff({
    legacyDry: args.legacyDry,
    shadow,
    mixJaccard,
  });

  const lockInTotal = shadow.namedLockIns.length;
  const lockInSurvival =
    lockInTotal === 0
      ? 1
      : shadow.namedLockIns.filter((l) => l.inShadowDesignated).length / lockInTotal;

  return {
    sampleId: args.sampleId,
    label: args.label,
    textPreview: args.text.trim().slice(0, 120).replace(/\s+/g, " "),
    category,
    mixJaccard,
    legacyMixIds,
    shadowMixIds: shadow.shadowMixIds,
    legacyMixTotalWon: args.legacyDry.bodyTotalWon,
    shadowMixTotalWon: shadow.shadowMix.bodyTotalWon,
    namedLockInSurvivalRate: lockInSurvival,
    namedLockIns: shadow.namedLockIns,
    legacyDesignatedCount: args.legacyDry.designated.length,
    shadowDesignatedCount: shadow.shadowDesignatedIds.length,
    recommendTopIds: shadow.recommendTop.slice(0, 10).map((r) => r.id),
    notes,
    shadow,
  };
}

export function summarizeInquiryShadowReports(
  reports: readonly InquiryShadowDiffReport[],
): {
  total: number;
  byCategory: Record<InquiryShadowDiffCategory, number>;
  canPromoteToPrimary: boolean;
  promotionBlockers: string[];
} {
  const byCategory: Record<InquiryShadowDiffCategory, number> = {
    nearly_identical: 0,
    both_reasonable: 0,
    shadow_better: 0,
    shadow_problematic: 0,
  };
  for (const r of reports) {
    byCategory[r.category]++;
  }

  const promotionBlockers: string[] = [];
  if (byCategory.shadow_problematic > 0) {
    promotionBlockers.push(
      `shadow_problematic ${byCategory.shadow_problematic}건 — 원인 보완 후 재검증 필요`,
    );
  }

  const problematic = reports.filter((r) => r.category === "shadow_problematic");
  for (const p of problematic) {
    promotionBlockers.push(`${p.sampleId ?? "case"}: ${p.notes.join("; ")}`);
  }

  const canPromoteToPrimary =
    byCategory.shadow_problematic === 0 &&
    reports.length > 0 &&
    byCategory.nearly_identical + byCategory.both_reasonable + byCategory.shadow_better ===
      reports.length;

  return {
    total: reports.length,
    byCategory,
    canPromoteToPrimary,
    promotionBlockers,
  };
}

/** dry-run API — fire-and-forget shadow log (응답 본문에는 포함하지 않음) */
export function logInquiryShadowDiffAsync(args: {
  text: string;
  legacyDry: InquiryAutoProposalDryRun;
  proposalCatalog: readonly ProposalCatalogRow[];
}): void {
  void buildInquiryShadowDiffReport({
    text: args.text,
    legacyDry: args.legacyDry,
    proposalCatalog: args.proposalCatalog,
  })
    .then((report) => {
      console.info("[inquiry-shadow]", JSON.stringify({
        category: report.category,
        mixJaccard: report.mixJaccard,
        legacyMixIds: report.legacyMixIds,
        shadowMixIds: report.shadowMixIds,
        namedLockInSurvivalRate: report.namedLockInSurvivalRate,
        notes: report.notes,
        textPreview: report.textPreview,
      }));
    })
    .catch((e) => {
      console.warn("[inquiry-shadow] failed", e);
    });
}
