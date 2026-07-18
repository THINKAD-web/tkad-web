import type { AvailabilityTier } from "@/lib/media-availability-stats";

/** MVP TO 뱃지 — 차단일 유무 수준 */
export type RfpToBadge = "available" | "inquire";

export type RfpProposalExportMediaRow = {
  mediaId: string;
  name: string;
  location: string;
  priceLabel: string;
  priceWon: number;
  score: number;
  oneLine: string;
  thumbUrl?: string | null;
  toBadge: RfpToBadge;
  toLabel: string;
  availabilityTier?: AvailabilityTier;
  pinned?: boolean;
};

export type RfpProposalExportGroup = {
  groupId: string;
  groupLabel: string;
  regionKeywords: string[];
  mediaTypeKeywords: string[];
  mediaItems: RfpProposalExportMediaRow[];
};

export type RfpProposalExportPayload = {
  isKo: boolean;
  generatedAt: string;
  documentTitle: string;
  campaign: {
    brandName?: string | null;
    target?: string | null;
    period?: string | null;
    industry?: string | null;
    notes?: string[];
  };
  groups: RfpProposalExportGroup[];
  /** 제작비·부가세 별도 등 */
  productionCostNotice: string;
  /** 월/기간 계약조건 안내 (고정 문구 MVP) */
  contractNotice: string;
  /** 타겟 맞춤 추천 코멘트 (선택) */
  recommendComment?: string | null;
  disclaimer: string;
};

export function isRfpProposalExportPayload(
  v: unknown,
): v is RfpProposalExportPayload {
  if (!v || typeof v !== "object") return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.isKo === "boolean" &&
    typeof o.documentTitle === "string" &&
    typeof o.generatedAt === "string" &&
    Array.isArray(o.groups) &&
    typeof o.productionCostNotice === "string" &&
    typeof o.contractNotice === "string" &&
    typeof o.disclaimer === "string" &&
    o.campaign != null &&
    typeof o.campaign === "object"
  );
}

export function rfpProposalFileBase(p: RfpProposalExportPayload): string {
  const brand = (p.campaign.brandName ?? "RFP")
    .replace(/[^\w가-힣\-]+/g, "_")
    .slice(0, 40);
  const day = p.generatedAt.slice(0, 10).replace(/-/g, "");
  return `THINKAD_RFP_${brand}_${day || "export"}`;
}

export function toBadgeLabel(badge: RfpToBadge, isKo: boolean): string {
  if (badge === "available") {
    return isKo ? "예약 가능" : "Available";
  }
  return isKo ? "문의 필요" : "Inquire";
}
