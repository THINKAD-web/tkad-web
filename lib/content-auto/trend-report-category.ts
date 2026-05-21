import type { ReportCategory } from "@prisma/client";

/** 시드·발행 시 public Report.category 자동 분류 */
export function inferTrendReportCategory(opts: {
  slug: string;
  topicFocus?: string;
  titleKo?: string;
}): ReportCategory {
  const hay = `${opts.slug} ${opts.topicFocus ?? ""} ${opts.titleKo ?? ""}`.toLowerCase();

  if (/강남|홍대|성수|지역|핫스팟|region|hotspot/.test(hay)) {
    return "REGION";
  }
  if (/캠페인|런칭|집행|campaign|사례/.test(hay)) {
    return "CAMPAIGN";
  }
  if (/가이드|처음|faq|예산.*시작|선택법/.test(hay)) {
    return "GUIDE";
  }
  return "TREND";
}
