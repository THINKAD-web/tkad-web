/**
 * 문의 자동 제안 — 후보 선정 SSOT.
 *
 * 발송 전 사람 확인은 없다. flagged · 유형별 CPM_BOUNDS 밖은
 * 여기서만 걸러야 하며, 매칭·믹스·발송이 이 함수를 우회하면 안 된다.
 *
 * sellingUnit 미선언은 제외하지 않는다. 호출측이 제안서에
 * 「확인 후 회신」을 넣는다.
 */
import { estimateCatalogCpmWon } from "@/lib/media-metrics";
import { parseDeclaredSellingUnit } from "@/lib/metrics/audit-rules";
import { classifyMedia } from "@/lib/metrics/classify";
import { CPM_BOUNDS } from "@/lib/metrics/constants";
import { MEDIA_REVIEW_STATUS } from "@/lib/media-review-status";
import type { MediaMetricClass } from "@/lib/metrics/types";

export const PROPOSAL_EXCLUDE_REASONS = [
  "inactive",
  "network_catalog",
  "flagged",
  "cpm_uncomputable",
  "cpm_class_bounds",
] as const;

export type ProposalExcludeReason = (typeof PROPOSAL_EXCLUDE_REASONS)[number];

export type ProposalCandidateInput = {
  id: string;
  name: string;
  isActive?: boolean;
  reviewStatus?: string | null;
  type?: string | null;
  mediaMainCategory?: string | null;
  mediaSubCategory?: string | null;
  subCategory?: string | null;
  price?: number | null;
  impressions?: number | null;
  dailyFootfall?: number | null;
  cpm?: number | null;
  priceNote?: string | null;
  description?: string | null;
  priceOptions?: unknown;
  widthM?: number | null;
  heightM?: number | null;
};

export type ProposalFilterDecision = {
  eligible: boolean;
  reasons: ProposalExcludeReason[];
  sellingUnitUndeclared: boolean;
  mediaClass: MediaMetricClass;
  cpmWon: number | null;
  bounds: readonly [number, number];
};

export function isNetworkCatalogId(id: string): boolean {
  return id.startsWith("nw_");
}

function resolveCpmWon(input: ProposalCandidateInput): number | null {
  const est = estimateCatalogCpmWon({
    cpm: input.cpm ?? undefined,
    price: input.price ?? 0,
    impressions: input.impressions ?? undefined,
    dailyFootTraffic: input.dailyFootfall ?? 0,
  });
  if (est != null && Number.isFinite(est) && est > 0) return est;
  const stored = input.cpm;
  if (typeof stored === "number" && Number.isFinite(stored) && stored > 0) {
    return stored;
  }
  return null;
}

/**
 * 제안서 후보 1건 판정. 네트워크 카탈로그·비활성·flagged·CPM 미산출·
 * class bounds 이탈은 제외. sellingUnit 미선언은 eligible 유지.
 */
export function evaluateProposalCandidate(
  input: ProposalCandidateInput,
): ProposalFilterDecision {
  const mediaClass = classifyMedia({
    mainCategory: input.mediaMainCategory,
    subCategory: input.mediaSubCategory || input.subCategory,
    type: input.type,
    name: input.name,
    widthM: input.widthM,
    heightM: input.heightM,
  });
  const bounds = CPM_BOUNDS[mediaClass];
  const reasons: ProposalExcludeReason[] = [];

  if (input.isActive === false) reasons.push("inactive");
  if (isNetworkCatalogId(input.id)) reasons.push("network_catalog");
  if (input.reviewStatus === MEDIA_REVIEW_STATUS.flagged) {
    reasons.push("flagged");
  }

  const cpmWon = resolveCpmWon(input);
  if (cpmWon == null) {
    reasons.push("cpm_uncomputable");
  } else if (cpmWon < bounds[0] || cpmWon > bounds[1]) {
    reasons.push("cpm_class_bounds");
  }

  const declared = parseDeclaredSellingUnit({
    id: input.id,
    slug: null,
    name: input.name,
    type: input.type ?? "digital",
    region: "",
    regionMain: null,
    location: "",
    description: input.description ?? null,
    price: input.price ?? 0,
    pricePeriod: "month",
    priceOptions: input.priceOptions ?? null,
    priceNote: input.priceNote ?? null,
    widthM: input.widthM ?? null,
    heightM: input.heightM ?? null,
    resolution: null,
    targetAge: null,
    dailyFootfall: input.dailyFootfall ?? null,
    impressions: input.impressions ?? null,
    cpm: input.cpm ?? null,
    mediaMainCategory: input.mediaMainCategory ?? null,
    mediaSubCategory: input.mediaSubCategory ?? null,
    latitude: null,
    tags: [],
    nearbyStations: null,
    nearbyLandmarks: null,
  });

  return {
    eligible: reasons.length === 0,
    reasons,
    sellingUnitUndeclared: declared == null,
    mediaClass,
    cpmWon,
    bounds,
  };
}

export function assertAllProposalEligible(
  rows: readonly ProposalCandidateInput[],
): void {
  const leaked = rows.filter((r) => !evaluateProposalCandidate(r).eligible);
  if (leaked.length === 0) return;
  const detail = leaked
    .map((r) => `${r.name} (${evaluateProposalCandidate(r).reasons.join(",")})`)
    .join("; ");
  throw new Error(`PROPOSAL_FILTER_LEAK: ${detail}`);
}

export const SELLING_UNIT_FOLLOWUP_LINE_KO =
  "일부 매체의 판매 단위(면·대·역 등)가 카탈로그에 명시되어 있지 않습니다. 단가·노출 기준은 확인 후 회신드립니다.";

export const SELLING_UNIT_FOLLOWUP_LINE_EN =
  "Selling unit (panel/vehicle/station) is not declared for some media. Unit price and impressions will be confirmed in a follow-up.";
