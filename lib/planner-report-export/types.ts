/**
 * 플래너 보고서 서버 출력(PDF·PPTX) 공용 페이로드.
 *
 * 화면(클라이언트)에서 이미 계산된 표시값을 직렬화해 서버로 전달한다.
 * 서버 빌더는 이 payload 만으로 문서를 그린다 (재계산·DOM 캡처 없음).
 * → html2canvas 가 Tailwind v4 oklch/그라데이션을 검정으로 폴백하던 문제를
 *   원천 차단하고, 한글 벡터 텍스트 + 기기 무관 동일 레이아웃을 보장한다.
 */

import type { PlannerPerformanceGuide } from "@/lib/planner-report-performance-guide";
import type { PlannerExportBadgeKind } from "@/lib/planner-report-export/export-badge";
import type { PlannerExportBudgetHonesty } from "@/lib/planner/brief/over-budget-copy";

export type PlannerExportKpiStatus = "value" | "pending";

export type PlannerExportKpi = {
  label: string;
  value: string;
  /** 화면 DataQualityBadge / AllocationSourceBadge 와 1:1 */
  badge: PlannerExportBadgeKind;
  /** pending — 6b MetricsPanel 과 동일한 [산정 중] 상태 */
  status?: PlannerExportKpiStatus;
  /** @deprecated badge 로부터 파생 — 하위 호환 */
  badgeLabel?: string;
  pendingHint?: string;
};

/** @see lib/document-media-detail.ts — 화면·PDF·PPTX 동일 필드 */
export type PlannerExportMediaRow = {
  id?: string;
  name: string;
  region?: string;
  type?: string;
  priceLabel?: string;
  location?: string;
  thumbUrl?: string | null;
  categoryLabel?: string;
  size?: string;
  operatingHours?: string;
  dailyTraffic?: number;
  broadcastLabel?: string;
  monthlyPriceLabel?: string;
  lineTotalLabel?: string;
  recommendReason?: string;
  exposureContributionPct?: number;
  budgetContributionPct?: number;
  /** 선택 수량 (네트워크·이동형) */
  quantityLabel?: string;
};

export type PlannerExportDigitalRow = {
  platform: string;
  sharePct: number;
  impressions: number;
};

export type PlannerExportSection = { title: string; lines: string[] };

/** 추천 근거 — 포트폴리오 요약 + 매체별 recommendReason (있을 때만) */
export type PlannerExportRecommendRationale = {
  summaryLines: string[];
  mediaReasons: { name: string; reason: string }[];
};

/** 차트 1개 항목 (라벨 + 수치 + 유형별 색상 키) */
export type PlannerExportChartDatum = {
  label: string;
  value: number;
  /** static | digital | mobile | network | ooh — 색상 일관성용 */
  colorKey?: string;
  /** 도넛·범례 % — value 합산과 별도로 소수 1자리 표시용 */
  pct?: number;
};

/** 웹·PDF·PPTX 공용 차트 데이터 (동일 숫자로 3포맷 렌더) */
export type PlannerExportCharts = {
  /** 예산 배분 — 도넛 (OOH vs 디지털 / 유형별) */
  budgetSplit?: PlannerExportChartDatum[];
  /** 예산 배분 — 발견하기 메인 카테고리별 도넛 */
  browseBudgetSplit?: PlannerExportChartDatum[];
  /** CPM 비교 — 가로 막대 (원 단위) */
  cpmBars?: PlannerExportChartDatum[];
  /** 노출·도달 요약 — 가로 막대 */
  reachSummary?: PlannerExportChartDatum[];
  /** 유형별 월 노출 비중 — 예산 배분과 대비 */
  impressionSplit?: PlannerExportChartDatum[];
  /** 발견하기 카테고리별 월 노출 비중 */
  browseImpressionSplit?: PlannerExportChartDatum[];
  /** 지역별 월 예산 비중 (내 플랜 보고서) */
  regionBudgetSplit?: PlannerExportChartDatum[];
  /** 지역별 월 노출 비중 (내 플랜 보고서) */
  regionImpressionSplit?: PlannerExportChartDatum[];
  /** 상권·권역 세분화 예산 비중 */
  regionSubdivisionBudgetSplit?: PlannerExportChartDatum[];
  /** 상권·권역 세분화 노출 비중 */
  regionSubdivisionImpressionSplit?: PlannerExportChartDatum[];
  /** 예산·노출·CPM 차이 설명 (웹·PDF·PPT 공용) */
  performanceGuide?: PlannerPerformanceGuide;
};

/** 지역별 예산·효과 요약 (내 플랜 보고서) */
export type PlannerExportRegionBreakdown = {
  regionKey: string;
  label: string;
  mediaCount: number;
  monthlyBudgetWon: number;
  periodBudgetWon: number;
  budgetPct: number;
  monthlyImpressions: number;
  totalImpressions: number;
  impressionPct: number;
  cpmKrw: number | null;
};

/** 시·도 아래 상권/권역/구 세분화 (P-4) */
export type PlannerExportRegionSubdivision = {
  sourceField: "regionSub" | "regionZone" | "district";
  sourceFieldLabel: string;
  classifiedCount: number;
  totalCount: number;
  coverageNote?: string;
  breakdown: PlannerExportRegionBreakdown[];
};

export type PlannerExportPortfolioGroup = {
  regionLabel: string;
  categories: {
    categoryLabel: string;
    items: PlannerExportMediaRow[];
  }[];
};

export type PlannerReportExportPayload = {
  /** ooh = 클래식 플래너, integrated = 통합 플래너 */
  kind: "ooh" | "integrated";
  isKo: boolean;
  documentTitle: string;
  /** slim 헤더·표지용 캠페인명 (없으면 목표명 사용) */
  campaignName?: string;
  /** slim 헤더용 클라이언트명 (선택) */
  clientName?: string;
  generatedAt: string;
  goalTitle: string;
  /** 총 캠페인 예산 (만원 단위) */
  budgetMan: number;
  periodDisplay: string;
  regionsText: string;
  categoriesText: string;
  ageText: string;
  industryText: string;
  kpis: PlannerExportKpi[];
  charts?: PlannerExportCharts;
  portfolio: PlannerExportMediaRow[];
  /** 내 플랜 보고서 — 지역 → 유형별 매체 구성 */
  portfolioGroups?: PlannerExportPortfolioGroup[];
  /** 지역별 예산·효과 표 (내 플랜 보고서) */
  regionBreakdown?: PlannerExportRegionBreakdown[];
  /** 상권·권역·구 세분화 (2개 이상일 때) */
  regionSubdivision?: PlannerExportRegionSubdivision;
  /** 통합 플래너 전용 — 디지털 채널 배분 */
  digital?: PlannerExportDigitalRow[];
  digitalSummary?: string;
  /** PRO 인사이트 등 추가 섹션 (제목 + 불릿) */
  sections?: PlannerExportSection[];
  /** 데이터 기반 추천 근거 (AI narrative 와 별도) */
  recommendRationale?: PlannerExportRecommendRationale;
  /** 문의 자동 매칭 경로 — 「직접 선택한」 문구 대신 사용 */
  mixSource?: "inquiry_match";
  /** 요청 예산 vs 이 구성 — 표지·KPI 배너·매체 카드 하단 */
  budgetHonesty?: PlannerExportBudgetHonesty;
  /** O-1 digital gap (R-3) — 스냅샷 없이 ooh_digital 일 때 PDF·화면에 명시 */
  digitalOmittedNotice?: string;
  /** JP 매체 포함 시 ¥ 환산 각주 (합계·차트는 KRW 유지) */
  currencyFootnote?: string;
  disclaimer: string;
};

export type PlannerReportExportFormat = "pdf" | "pptx";

export type PlannerReportExportAssets = {
  sectionVisibility?: import("@/lib/planner-report-export/section-visibility").PlannerReportSectionVisibility;
  lineupViewMode?: import("@/lib/planner-report-view-mode").PlannerExportLineupViewMode;
};

export type {
  PlannerExportLineupViewMode,
} from "@/lib/planner-report-view-mode";

export type {
  PlannerReportSectionKey,
  PlannerReportSectionVisibility,
} from "@/lib/planner-report-export/section-visibility";

/**
 * 파일명 규칙: `THINKAD_{캠페인명}_제안서_{YYYY-MM-DD}` (+확장자).
 * OS 금지문자·공백 정리. 클라이언트(blob download)·서버(Content-Disposition) 공용.
 */
export function plannerReportFileBase(p: PlannerReportExportPayload): string {
  const date = new Date().toISOString().slice(0, 10);
  const camp = (p.campaignName || p.goalTitle || (p.isKo ? "캠페인" : "campaign"))
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 48);
  const word = p.isKo ? "제안서" : "proposal";
  return `THINKAD_${camp}_${word}_${date}`;
}

/** 페이로드 유효성 — 라우트에서 신뢰 경계로 사용 */
export function isPlannerReportExportPayload(
  v: unknown,
): v is PlannerReportExportPayload {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  return (
    (p.kind === "ooh" || p.kind === "integrated") &&
    typeof p.isKo === "boolean" &&
    typeof p.documentTitle === "string" &&
    Array.isArray(p.kpis) &&
    Array.isArray(p.portfolio)
  );
}
