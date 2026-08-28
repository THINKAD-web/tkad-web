import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import {
  formatMediaPriceCompactWon,
  mediaPriceExclNoteText,
} from "@/lib/media-price-format";
import { fetchPublicMediaCatalogList } from "@/lib/public-media-catalog";
import type {
  RfpGroupMatchResult,
  RfpMatchedMediaSummary,
} from "@/lib/rfp-proposal/match-rfp-brief";
import type { RfpProposalBrief } from "@/lib/rfp-proposal/types";
import { fetchRfpMediaAvailabilityBatch } from "@/lib/rfp-proposal-export/availability";
import {
  toBadgeLabel,
  type RfpProposalExportPayload,
} from "@/lib/rfp-proposal-export/types";

export type BuildRfpProposalExportArgs = {
  brief: RfpProposalBrief;
  matchGroups: RfpGroupMatchResult[];
  /** groupId → 제외 매체 ID */
  excludedByGroup?: Record<string, string[]>;
  locale?: string;
  recommendComment?: string | null;
  availabilityMonth?: string | null;
};

function contractNotice(isKo: boolean): string {
  return isKo
    ? "계약조건: 월 단위 게재를 기본으로 하며, 기간·수량·패키지 조건은 매체별로 별도 협의합니다. 본 제안의 단가는 참고용이며 최종 견적 시 재확인합니다."
    : "Terms: Monthly placements by default; period, quantity, and package terms are negotiated per media. Prices are indicative and confirmed in the final quote.";
}

function disclaimer(isKo: boolean): string {
  return isKo
    ? "본 제안서는 참고용입니다. 실제 예약·단가·가용 여부는 계약 전 재확인해 주세요."
    : "This proposal is for reference only. Confirm booking, pricing, and availability before contract.";
}

function visibleMedia(
  group: RfpGroupMatchResult,
  excludedByGroup?: Record<string, string[]>,
): RfpMatchedMediaSummary[] {
  const excluded = new Set(excludedByGroup?.[group.groupId] ?? []);
  return group.mediaItems.filter((m) => !excluded.has(m.mediaId));
}

/**
 * 매칭 결과 + TO 배치 조회 → PDF 바인딩 payload.
 */
export async function buildRfpProposalExportPayload(
  args: BuildRfpProposalExportArgs,
): Promise<RfpProposalExportPayload> {
  const isKo = (args.locale ?? "ko").startsWith("ko");
  const brief = args.brief;
  const groupsIn = args.matchGroups;

  const visibleByGroup = groupsIn.map((g) => ({
    group: g,
    items: visibleMedia(g, args.excludedByGroup),
  }));

  const allIds = visibleByGroup.flatMap((g) =>
    g.items.map((m) => m.mediaId),
  );
  const [availability, catalog] = await Promise.all([
    fetchRfpMediaAvailabilityBatch(allIds, args.availabilityMonth),
    fetchPublicMediaCatalogList(),
  ]);
  const catalogById = new Map(catalog.map((m) => [m.id, m]));

  const groups = visibleByGroup.map(({ group, items }) => {
    const briefGroup = brief.groups.find((g) => g.id === group.groupId);
    return {
      groupId: group.groupId,
      groupLabel: group.groupLabel,
      regionKeywords:
        briefGroup?.regionKeywords ?? group.input.regions ?? [],
      mediaTypeKeywords: briefGroup?.mediaTypeKeywords ?? [],
      mediaItems: items.map((m) => {
        const avail = availability[m.mediaId];
        const toBadge = avail?.toBadge ?? "inquire";
        const full = catalogById.get(m.mediaId);
        const thumbUrl = full ? getPrimaryMediaImageUrl(full) : null;
        const priceWon = m.priceWon > 0 ? m.priceWon : 0;
        return {
          mediaId: m.mediaId,
          name: isKo ? m.name : m.nameEn || m.name,
          location: isKo ? m.location : m.locationEn || m.location,
          priceWon,
          priceLabel: formatMediaPriceCompactWon(
            priceWon,
            isKo ? "ko-KR" : "en-US",
          ),
          score: m.score,
          oneLine: m.oneLine,
          thumbUrl,
          toBadge,
          toLabel: toBadgeLabel(toBadge, isKo),
          availabilityTier: avail?.tier,
          pinned: m.pinned,
        };
      }),
    };
  });

  const now = new Date();
  const generatedAt = now.toISOString().slice(0, 10);
  const brand = brief.campaign?.brandName?.trim();

  return {
    isKo,
    generatedAt,
    documentTitle: isKo
      ? brand
        ? `${brand} RFP 매체 제안서`
        : "RFP 매체 제안서"
      : brand
        ? `${brand} RFP Media Proposal`
        : "RFP Media Proposal",
    campaign: {
      brandName: brief.campaign?.brandName ?? null,
      target: brief.campaign?.target ?? null,
      period: brief.campaign?.period ?? null,
      industry: brief.campaign?.industry ?? null,
      notes: brief.campaign?.notes,
    },
    groups,
    productionCostNotice: isKo
      ? `${mediaPriceExclNoteText(true)}. 제작비·송출 스펙은 매체별 별도 협의가 필요합니다.`
      : `${mediaPriceExclNoteText(false)}. Production/playback specs require separate discussion per media.`,
    contractNotice: contractNotice(isKo),
    recommendComment: args.recommendComment?.trim() || null,
    disclaimer: disclaimer(isKo),
  };
}
