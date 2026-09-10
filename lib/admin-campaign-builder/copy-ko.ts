import type { CampaignBuilderDocumentType } from "@/lib/admin-campaign-builder/schemas";

export const CATALOG_ESTIMATION_NOTICE =
  "디지털 예상 도달·클릭은 공개 매체 카탈로그의 CPC·CPM 참고 범위를 예산에 적용해 산출한 값입니다. 실제 성과는 소재·시즌·경쟁 상황에 따라 달라질 수 있습니다.";

export const campaignBuilderExportCopy = {
  saveBeforeExport:
    "PDF·PPTX를 다운로드하려면 먼저 리포트를 저장해 주세요.",
  pdfDownload: "PDF 다운로드",
  pptxDownload: "PPTX 다운로드",
  goToPreview: "미리보기로",
  previewTitle: "미리보기 · 내보내기",
} as const;

export const campaignBuilderCopy = {
  proposal: {
    documentLabel: "캠페인 제안서",
    coverSubtitle: "미디어 믹스 제안",
    kpiLabels: {
      activeChannels: "선택 채널",
      totalBudget: "총 제안 예산",
      expectedReach: "예상 도달",
      avgBudget: "평균 채널 예산",
    },
    sectionTitles: {
      estimateGroup: "① 제안 견적",
      executionGroup: "② 실제 집행 결과",
      insightsGroup: "③ 캠페인 운영 제안",
      estimateProducts: "디지털 채널 제안",
    },
    estimateNotice: CATALOG_ESTIMATION_NOTICE,
    executionNotice:
      "실제 집행 결과는 확정 실측 수치입니다. 카탈로그 기반 예상 견적과 KPI를 섞지 않습니다.",
    insightsHint:
      "타겟·예산·기간 정보를 바탕으로 작성한 운영 참고 제안입니다.",
  },
  report: {
    documentLabel: "캠페인 리포트",
    coverSubtitle: "집행·성과 리포트",
    kpiLabels: {
      activeChannels: "선택 채널",
      totalBudget: "총 집행 예산",
      expectedReach: "예상 도달",
      avgBudget: "평균 채널 예산",
      executionLines: "집행 캠페인",
      executionBudget: "집행 예산 합계",
      actualReach: "실측 도달 합산",
      actualClicks: "실측 클릭 합산",
    },
    sectionTitles: {
      estimateGroup: "① 참고 견적",
      executionGroup: "③ 집행 내역",
      insightsGroup: "④ 운영 인사이트",
      estimateProducts: "① 디지털 채널 (참고)",
    },
    estimateNotice:
      "참고 견적은 카탈로그 기반 예상 범위이며, 집행 결과 KPI와 합산하지 않습니다.",
    executionNotice:
      "아래는 실제 집행·운영 결과입니다. 확정 실측 수치와 집행 예산을 기록합니다.",
    insightsHint:
      "집행 데이터와 타겟·예산 정보를 바탕으로 정리한 운영 회고입니다.",
  },
} as const satisfies Record<
  CampaignBuilderDocumentType,
  {
    documentLabel: string;
    coverSubtitle: string;
    kpiLabels: Record<string, string>;
    sectionTitles: Record<string, string>;
    estimateNotice: string;
    executionNotice: string;
    insightsHint: string;
  }
>;
