import type { ReportCategory } from "@prisma/client";
import type { CommunityCategory } from "@/lib/community/types";

/** P3-03 콘텐츠 유형 탭 순서 */
export const REPORT_CATEGORY_ORDER: ReportCategory[] = [
  "TREND",
  "MEDIA",
  "GUIDE",
  "CAMPAIGN",
  "REGION",
];

const REPORT_CATEGORY_LABELS: Record<
  ReportCategory,
  { ko: string; en: string; descKo: string }
> = {
  TREND: {
    ko: "월간 시장 트렌드",
    en: "Monthly market",
    descKo: "월 1회 OOH 시장 인사이트",
  },
  MEDIA: {
    ko: "매체 뉴스",
    en: "New media",
    descKo: "신규 등록·오픈 매체",
  },
  GUIDE: {
    ko: "업종 인사이트",
    en: "Industry insight",
    descKo: "업종별 집행 가이드",
  },
  CAMPAIGN: {
    ko: "성공 사례",
    en: "Success stories",
    descKo: "캠페인 사례 요약",
  },
  REGION: {
    ko: "지역 분석",
    en: "Regional",
    descKo: "상권·지역 매체 분석",
  },
};

export function labelForReportCategory(
  category: ReportCategory,
  isKo: boolean,
): string {
  const row = REPORT_CATEGORY_LABELS[category];
  return isKo ? row.ko : row.en;
}

export function communityCategoryForReport(
  category: ReportCategory,
): CommunityCategory {
  switch (category) {
    case "GUIDE":
      return "review";
    case "TREND":
    case "MEDIA":
    case "REGION":
    case "CAMPAIGN":
    default:
      return "insight";
  }
}
