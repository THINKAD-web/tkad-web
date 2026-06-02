/**
 * 플래너 보고서 서버 출력(PDF·PPTX) 공용 페이로드.
 *
 * 화면(클라이언트)에서 이미 계산된 표시값을 직렬화해 서버로 전달한다.
 * 서버 빌더는 이 payload 만으로 문서를 그린다 (재계산·DOM 캡처 없음).
 * → html2canvas 가 Tailwind v4 oklch/그라데이션을 검정으로 폴백하던 문제를
 *   원천 차단하고, 한글 벡터 텍스트 + 기기 무관 동일 레이아웃을 보장한다.
 */

export type PlannerExportKpi = { label: string; value: string };

export type PlannerExportMediaRow = {
  name: string;
  region: string;
  type: string;
  priceLabel?: string;
};

export type PlannerExportDigitalRow = {
  platform: string;
  sharePct: number;
  impressions: number;
};

export type PlannerExportSection = { title: string; lines: string[] };

export type PlannerReportExportPayload = {
  /** ooh = 클래식 플래너, integrated = 통합 플래너 */
  kind: "ooh" | "integrated";
  isKo: boolean;
  documentTitle: string;
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
  portfolio: PlannerExportMediaRow[];
  /** 통합 플래너 전용 — 디지털 채널 배분 */
  digital?: PlannerExportDigitalRow[];
  digitalSummary?: string;
  /** PRO 인사이트 등 추가 섹션 (제목 + 불릿) */
  sections?: PlannerExportSection[];
  disclaimer: string;
};

export type PlannerReportExportFormat = "pdf" | "pptx";

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
