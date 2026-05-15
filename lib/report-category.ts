import type { ReportCategory } from "@prisma/client";
import type { CommunityCategory } from "@/lib/community/types";

export const REPORT_CATEGORY_ORDER: ReportCategory[] = [
  "TREND",
  "REGION",
  "GUIDE",
  "CAMPAIGN",
];

const REPORT_CATEGORY_LABELS: Record<
  ReportCategory,
  { ko: string; en: string }
> = {
  TREND: { ko: "OOH 트렌드", en: "OOH trends" },
  REGION: { ko: "지역 분석", en: "Regional analysis" },
  GUIDE: { ko: "매체 가이드", en: "Media guide" },
  CAMPAIGN: { ko: "캠페인 팁", en: "Campaign tips" },
};

export function labelForReportCategory(
  category: ReportCategory,
  isKo: boolean,
): string {
  const row = REPORT_CATEGORY_LABELS[category];
  return isKo ? row.ko : row.en;
}

/** 커뮤니티 인기글 매핑 — 인사이트·가이드 성격에 맞춤 */
export function communityCategoryForReport(
  category: ReportCategory,
): CommunityCategory {
  switch (category) {
    case "GUIDE":
      return "review";
    case "TREND":
    case "REGION":
    case "CAMPAIGN":
    default:
      return "insight";
  }
}
