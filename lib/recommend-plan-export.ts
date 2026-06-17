import type { MediaItem } from "@/lib/media-data";
import type {
  CampaignProposalOutput,
  ProposalInput,
} from "@/lib/proposal/types";
import type {
  PlannerExportKpi,
  PlannerExportMediaRow,
  PlannerExportSection,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";

/**
 * AI 플랜(CampaignProposalOutput) → 기존 플래너 보고서 익스포트 payload 매핑.
 * 익스포트 빌더(build-pdf/build-pptx)·라우트(/api/planner/report/export)는 그대로 재사용한다.
 */
export function buildPlanExportPayload(
  proposal: CampaignProposalOutput,
  input: ProposalInput,
  selectedMedia: MediaItem[],
  isKo: boolean,
): PlannerReportExportPayload {
  const byId = new Map(selectedMedia.map((m) => [m.id, m]));
  const locale = isKo ? "ko-KR" : "en-US";

  const kpis: PlannerExportKpi[] = [
    {
      label: isKo ? "예상 노출" : "Est. impressions",
      value: proposal.metrics.estimatedImpressions.toLocaleString(locale),
    },
    {
      label: isKo ? "예상 도달" : "Est. reach",
      value: proposal.metrics.estimatedReach.toLocaleString(locale),
    },
    {
      label: isKo ? "예상 CPM" : "Est. CPM",
      value: `₩${proposal.metrics.estimatedCpm.toLocaleString(locale)}`,
    },
  ];

  const portfolio: PlannerExportMediaRow[] = proposal.mediaMix.map((mm) => {
    const media = byId.get(mm.mediaId);
    return {
      id: mm.mediaId,
      name: mm.mediaName || media?.name || mm.mediaId,
      region: media?.region,
      type: media?.type,
      location: media?.location,
      priceLabel: media ? formatCatalogPriceFieldWon(media.price, locale) : undefined,
      monthlyPriceLabel: media
        ? formatCatalogPriceFieldWon(media.price, locale)
        : undefined,
      recommendReason: `${mm.role} · ${mm.rationale}`,
      budgetContributionPct: mm.budgetSharePct,
    };
  });

  const sections: PlannerExportSection[] = [];
  if (proposal.overview?.trim()) {
    sections.push({
      title: isKo ? "캠페인 개요" : "Overview",
      lines: [proposal.overview.trim()],
    });
  }
  if (proposal.strategy?.trim()) {
    sections.push({
      title: isKo ? "전략 방향" : "Strategy",
      lines: [proposal.strategy.trim()],
    });
  }
  if (proposal.timeline?.length) {
    sections.push({
      title: isKo ? "집행 타임라인" : "Timeline",
      lines: proposal.timeline.map(
        (t) => `${t.phase} (${t.period}): ${t.tasks.join(", ")}`,
      ),
    });
  }
  if (proposal.expectedOutcomes?.length) {
    sections.push({
      title: isKo ? "기대 효과" : "Expected outcomes",
      lines: [...proposal.expectedOutcomes],
    });
  }

  return {
    kind: "ooh",
    isKo,
    documentTitle: input.campaignName,
    campaignName: input.campaignName,
    clientName: input.brandName,
    generatedAt: new Date().toISOString(),
    goalTitle:
      input.goal === "conversion"
        ? isKo
          ? "전환·실적"
          : "Conversion"
        : input.goal === "event"
          ? isKo
            ? "이벤트·프로모션"
            : "Event"
          : isKo
            ? "브랜드 인지도"
            : "Awareness",
    budgetMan: input.budgetManwon,
    periodDisplay: `${input.startDate} ~ ${input.endDate}`,
    regionsText: input.regions.join(", "),
    categoriesText: "",
    ageText: input.targetAge || (isKo ? "전 연령" : "All"),
    industryText: input.industry,
    kpis,
    charts: {
      budgetSplit: proposal.budgetAllocation.map((b) => ({
        label: b.label,
        value: b.amountWon,
      })),
    },
    portfolio,
    sections,
    disclaimer: isKo
      ? "본 플랜의 노출·도달·CPM 은 추정치이며 실제 집행 결과와 다를 수 있습니다."
      : "Impressions, reach and CPM are estimates and may differ from actual results.",
  };
}
