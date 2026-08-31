import type { PlannerExportAppendixMediaSpec } from "@/lib/planner-report-export/types";
import { formatExportBudgetWonLabel } from "@/lib/planner-report-export/format-export-money";
import { MEDIA_REVIEW_STATUS } from "@/lib/media-review-status";
import type { ProposalExcludeReason } from "./candidate-filter";
import type { MatchedProposalMedia, ProposalCatalogRow } from "./match-and-options";

/** 문의 본문·부록 대상 — 이름/pilot 지정만 (카테고리 확장 제외) */
export function isDesignatedInquiryMatch(m: MatchedProposalMedia): boolean {
  return m.matchKind === "named" || m.matchKind === "pilot";
}

export type InquiryMixSelection = {
  mixUnits: Record<string, number>;
  selectedIds: string[];
  bodyTotalWon: number;
};

/** CPM 오름차순 그리디 — 예산을 넘기지 않는 선까지 본문 mixUnits */
export function selectInquiryBodyMix(args: {
  designated: readonly MatchedProposalMedia[];
  budgetWon: number;
  months: number;
}): InquiryMixSelection {
  const months = Math.max(1, Math.round(args.months));
  const eligible = args.designated
    .filter((m) => m.eligible)
    .sort((a, b) => {
      const cpmA = a.cpmWon ?? Number.POSITIVE_INFINITY;
      const cpmB = b.cpmWon ?? Number.POSITIVE_INFINITY;
      if (cpmA !== cpmB) return cpmA - cpmB;
      return a.monthlyWon - b.monthlyWon;
    });

  const mixUnits: Record<string, number> = {};
  let bodyTotalWon = 0;
  for (const m of eligible) {
    const periodCost = m.monthlyWon * months;
    if (bodyTotalWon + periodCost > args.budgetWon) continue;
    mixUnits[m.id] = 1;
    bodyTotalWon += periodCost;
  }
  return {
    mixUnits,
    selectedIds: Object.keys(mixUnits),
    bodyTotalWon,
  };
}

function normalizeName(s: string): string {
  return s.replace(/\s+/g, "").replace(/광고$/, "").toLowerCase();
}

export function sortDesignatedByNamedNeedles(
  designated: MatchedProposalMedia[],
  namedNeedles: readonly string[],
): MatchedProposalMedia[] {
  const order = new Map(namedNeedles.map((n, i) => [normalizeName(n), i]));
  return [...designated].sort((a, b) => {
    const ai = order.get(normalizeName(a.name)) ?? 999;
    const bi = order.get(normalizeName(b.name)) ?? 999;
    if (ai !== bi) return ai - bi;
    return a.name.localeCompare(b.name, "ko");
  });
}

const FILTER_REASON_KO: Record<ProposalExcludeReason, string> = {
  inactive: "비활성",
  network_catalog: "네트워크 카탈로그",
  flagged: "검토 필요(flagged)",
  cpm_uncomputable: "CPM 산출 불가",
  cpm_class_bounds: "CPM 기준 이탈",
};

function reviewStatusLabel(
  status: string | null | undefined,
  isKo: boolean,
): string {
  if (!isKo) return status ?? "—";
  if (status === MEDIA_REVIEW_STATUS.flagged) return "검토 필요";
  if (status === "reviewed") return "검토 완료";
  return "정상";
}

/** 부록 스펙표 — 지정 매체 전체, 본문 포함 여부·제외 사유 */
export function buildInquiryAppendixMediaSpecs(args: {
  designated: readonly MatchedProposalMedia[];
  selectedIds: ReadonlySet<string>;
  catalogById: ReadonlyMap<string, ProposalCatalogRow>;
  namedNeedles: readonly string[];
  isKo: boolean;
}): PlannerExportAppendixMediaSpec[] {
  const sorted = sortDesignatedByNamedNeedles(
    [...args.designated],
    args.namedNeedles,
  );
  return sorted.map((m) => {
    const row = args.catalogById.get(m.id);
    const inBody = args.selectedIds.has(m.id);
    let statusNote: string;
    if (!m.eligible) {
      statusNote = m.reasons.map((r) => FILTER_REASON_KO[r]).join(", ");
    } else if (inBody) {
      statusNote = "—";
    } else {
      statusNote = args.isKo ? "예산 내 포함 불가" : "Not included — exceeds budget";
    }
    if (m.sellingUnitUndeclared && !inBody) {
      statusNote +=
        statusNote === "—"
          ? args.isKo
            ? "확인 후 회신"
            : "Confirm selling unit"
          : args.isKo
            ? " · 확인 후 회신"
            : " · confirm selling unit";
    }
    const cpmLabel =
      m.cpmWon != null && m.cpmWon > 0
        ? `₩${Math.round(m.cpmWon).toLocaleString(args.isKo ? "ko-KR" : "en-US")}`
        : "—";
    return {
      id: m.id,
      name: m.name,
      priceLabel: formatExportBudgetWonLabel(m.monthlyWon, args.isKo),
      cpmLabel,
      location: row?.location?.trim() || row?.item.location?.trim() || "—",
      reviewStatusLabel: reviewStatusLabel(row?.reviewStatus, args.isKo),
      inBody,
      statusNote,
    };
  });
}
