import type { ReportAccessLevel } from "@prisma/client";
import type { ReportFeature } from "@/lib/entitlements/features";

export type { ReportFeature } from "@/lib/entitlements/features";
export { rankLevel } from "@/lib/entitlements/features";

export type AccessCheckResult = {
  allowed: boolean;
  level: ReportAccessLevel;
  reason?: "login" | "upgrade" | "enterprise" | "trial_expired";
  trialDaysLeft?: number;
};

export function featureLabel(feature: ReportFeature, isKo: boolean): string {
  const labels: Record<ReportFeature, { ko: string; en: string }> = {
    planner_pdf: { ko: "플래너 PDF 보고서", en: "Planner PDF report" },
    detail_data: { ko: "상세 유동인구 데이터", en: "Detailed footfall data" },
    competitor: { ko: "경쟁 매체 비교", en: "Competitor comparison" },
    api: { ko: "API 접근", en: "API access" },
    planner_result: { ko: "플래너 결과", en: "Planner results" },
    media_spec: { ko: "매체 상세 스펙", en: "Full media specs" },
    simulation_full: { ko: "시뮬레이션 전체", en: "Full simulation" },
    whitelabel: { ko: "화이트라벨 보고서", en: "White-label reports" },
    market_dashboard: { ko: "시장 인사이트 대시보드", en: "Market insights dashboard" },
  };
  return isKo ? labels[feature].ko : labels[feature].en;
}

export {
  PRO_MONTHLY_KRW,
  PRO_TRIAL_DAYS,
  FREE_PLANNER_PDF_LIMIT,
} from "@/lib/report-pricing-constants";
