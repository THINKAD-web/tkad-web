"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import {
  EXPORT_BADGE_HTML_CLASS,
  exportBadgeBracketLabel,
} from "@/lib/planner-report-export/export-badge";
import type {
  PlannerReportExportPayload,
  PlannerExportChartDatum,
} from "@/lib/planner-report-export/types";
import type { PlannerPerformanceGuide } from "@/lib/planner-report-performance-guide";
import { plannerChartColor, CHART_SERIES_HEX } from "@/lib/planner-chart-colors";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import { formatExportBudgetWonLabel } from "@/lib/planner-report-export/format-export-money";
import {
  documentCardClass,
  DocumentGradientHero,
  DocumentSectionHeading,
} from "@/components/document/document-layout";
import { ReportScanLine } from "@/components/planner/report-scan-text";
import { ReportMediaLineupSection } from "@/components/planner/report-media-lineup-section";
import { ReportQuoteSummarySection } from "@/components/planner/report-quote-summary-section";
import { ReportPortfolioMapSection } from "@/components/planner/report-portfolio-map-section";
import { sectionVisible, filterExportSections } from "@/lib/planner-report-export/section-visibility";
import type { PlannerReportSectionVisibility } from "@/lib/planner-report-export/section-visibility";
import type { PlannerReportStyle } from "@/lib/planner-report-export/document-theme";
import { getReportDocumentTheme } from "@/lib/planner-report-export/document-theme";
import type { MediaItem } from "@/lib/media-data";

/**
 * 플래너 보고서 화면 문서 — 서버 PDF/PPTX 와 동일한 payload·레이아웃으로 렌더한다.
 * "화면에서 보는 것 = 내려받는 것" 을 보장하기 위한 단일 표현 컴포넌트.
 * 라이트 테마 고정(제안서 문서), 표는 가로 스크롤 래퍼로 모바일 넘침 방지.
 * 매체 구성 섹션 뷰모드(피드/카드/컴팩트)는 화면 전용 — PDF/PPT는 상세 카드 고정.
 */

function fmtBudget(man: number, isKo: boolean) {
  return isKo ? `${man.toLocaleString()}만원` : `${man.toLocaleString()}M KRW`;
}

const CHART_COLORS = [
  CHART_SERIES_HEX.primary,
  CHART_SERIES_HEX.ink,
  CHART_SERIES_HEX.slate,
  CHART_SERIES_HEX.indigo,
  CHART_SERIES_HEX.rose,
];

function chartDatumColor(d: PlannerExportChartDatum, index: number): string {
  return plannerChartColor(d.colorKey, index);
}

function chartDatumPct(d: PlannerExportChartDatum, total: number): string {
  const pct = d.pct ?? (total > 0 ? (d.value / total) * 100 : 0);
  return formatPlannerSharePct(pct);
}

function ShareBarChart({
  data,
}: {
  data: PlannerExportChartDatum[];
}) {
  if (data.length === 0) return null;
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => {
        const pct = d.pct ?? 0;
        return (
          <div key={d.label} className="flex items-center gap-3 text-sm">
            <span className="w-20 shrink-0 truncate text-gray-600 sm:w-28">
              {d.label}
            </span>
            <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, pct)}%`,
                  background: chartDatumColor(d, i),
                }}
              />
            </div>
            <span className="w-14 shrink-0 text-right font-semibold tabular-nums text-gray-900">
              {formatPlannerSharePct(pct)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function DonutChart({
  data,
}: {
  data: PlannerExportChartDatum[];
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  if (total <= 0) return null;
  const R = 56;
  const C = 2 * Math.PI * R;
  const fracs = data.map((d) => d.value / total);
  const offsets = fracs.map(
    (_, i) => fracs.slice(0, i).reduce((a, b) => a + b, 0) * C,
  );
  return (
    <div className="flex items-center gap-4">
      <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
        <g transform="translate(70,70) rotate(-90)">
          <circle r={R} fill="none" stroke="#EEF0F4" strokeWidth="20" />
          {data.map((d, i) => (
            <circle
              key={d.label}
              r={R}
              fill="none"
              stroke={chartDatumColor(d, i)}
              strokeWidth="20"
              strokeDasharray={`${fracs[i]! * C} ${C - fracs[i]! * C}`}
              strokeDashoffset={-offsets[i]!}
            />
          ))}
        </g>
      </svg>
      <ul className="min-w-0 space-y-1.5">
        {data.map((d, i) => (
          <li key={d.label} className="flex items-center gap-2 text-sm">
            <span
              className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ background: chartDatumColor(d, i) }}
            />
            <span className="min-w-0 truncate text-gray-700">{d.label}</span>
            <span className="ml-auto font-semibold tabular-nums text-gray-900">
              {chartDatumPct(d, total)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function PerformanceGuideBlock({ guide }: { guide: PlannerPerformanceGuide }) {
  return (
    <div className="rounded-xl border border-[color:var(--qp-line)] bg-[color:var(--qp-accent-soft)] p-4 sm:p-5">
      <p className="tkad-type-title text-gray-900">{guide.title}</p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-[color:var(--qp-line)] bg-white">
        <table className="w-full min-w-[16rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[color:var(--qp-line)] bg-[color:var(--qp-accent-soft)] text-left tkad-type-title text-[color:var(--qp-accent)]">
              {guide.table.headers.map((h) => (
                <th key={h} className="px-3 py-2.5 first:min-w-[5.5rem]">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {guide.table.rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-gray-100 last:border-0"
              >
                <td className="px-3 py-2.5 font-medium text-gray-600">
                  {row.label}
                </td>
                {row.cells.map((cell, i) => (
                  <td
                    key={`${row.label}-${i}`}
                    className="px-3 py-2.5 tabular-nums font-semibold text-gray-900"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="mt-4 space-y-2.5">
        {guide.bullets.map((line, i) => (
          <li
            key={i}
            className="flex gap-2.5 text-sm leading-relaxed text-gray-950/90"
          >
            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--qp-accent)]" />
            <span className="break-words">{line}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function BarChart({
  data,
  color = CHART_COLORS[0],
  colorByRow = false,
  isKo,
}: {
  data: PlannerExportChartDatum[];
  color?: string;
  /** true면 각 행의 colorKey 로 막대 색 지정 (CPM·예산 유형 비교) */
  colorByRow?: boolean;
  isKo: boolean;
}) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="space-y-2.5">
      {data.map((d, i) => (
        <div key={d.label} className="flex items-center gap-3 text-sm">
          <span className="w-20 shrink-0 truncate text-gray-600 sm:w-28">{d.label}</span>
          <div className="h-3 min-w-0 flex-1 overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.max(2, (d.value / max) * 100)}%`,
                background: colorByRow ? chartDatumColor(d, i) : color,
              }}
            />
          </div>
          <span className="w-24 shrink-0 text-right font-semibold tabular-nums text-gray-900">
            {d.value.toLocaleString(isKo ? "ko-KR" : "en-US")}
          </span>
        </div>
      ))}
    </div>
  );
}

export const PlannerReportDocument = forwardRef<
  HTMLDivElement,
  {
    payload: PlannerReportExportPayload;
    /** 화면 미니맵용 — export payload 에 좌표를 넣지 않음 */
    mapPortfolio?: readonly MediaItem[];
    sectionVisibility?: PlannerReportSectionVisibility;
    className?: string;
    editableTitle?: boolean;
    onDocumentTitleChange?: (title: string) => void;
    editableClientName?: boolean;
    onClientNameChange?: (name: string) => void;
    editableGreeting?: boolean;
    onGreetingChange?: (text: string) => void;
    editableExecutiveSummary?: boolean;
    onExecutiveSummaryChange?: (text: string) => void;
    reportStyle?: PlannerReportStyle;
  }
>(function PlannerReportDocument(
  {
    payload: p,
    mapPortfolio,
    sectionVisibility,
    className,
    editableTitle,
    onDocumentTitleChange,
    editableClientName,
    onClientNameChange,
    editableGreeting,
    onGreetingChange,
    editableExecutiveSummary,
    onExecutiveSummaryChange,
    reportStyle = "brand",
  },
  ref,
) {
  const isKo = p.isKo;
  const theme = getReportDocumentTheme(reportStyle);
  const vis = sectionVisibility;
  const visibleSections = filterExportSections(p.sections, vis)?.filter(
    (sec) =>
      !(
        p.executiveSummaryLines?.length &&
        (sec.title === "전략 요약" || sec.title === "Strategy summary")
      ),
  );
  const summary: Array<[string, string]> = [
    [isKo ? "캠페인 목표" : "Goal", p.goalTitle || "—"],
    [isKo ? "총 예산" : "Total budget", p.budgetHonesty?.coverValue ?? fmtBudget(p.budgetMan, isKo)],
    [isKo ? "집행 기간" : "Flight", p.periodDisplay || "—"],
    [isKo ? "지역" : "Regions", p.regionsText || "—"],
    [isKo ? "매체 유형" : "Media types", p.categoriesText || "—"],
    [isKo ? "타깃 연령" : "Target age", p.ageText || "—"],
    [isKo ? "업종" : "Industry", p.industryText || "—"],
  ];

  return (
    <div
      ref={ref}
      className={cn(documentCardClass, className)}
    >
      <DocumentGradientHero
        reportStyle={reportStyle}
        badge="CAMPAIGN PLANNER"
        title={p.documentTitle}
        subtitle={`${
          p.kind === "integrated"
            ? isKo
              ? "OOH + 디지털 통합 제안"
              : "OOH + Digital integrated"
            : isKo
              ? "OOH 미디어 플랜"
              : "OOH media plan"
        } · ${p.generatedAt}`}
        coverLogoUrl={p.coverLogoUrl}
        clientName={p.clientName}
        clientNameEditable={editableClientName}
        onClientNameChange={onClientNameChange}
        clientNamePlaceholder={
          isKo ? "광고주명 (선택, 예: OO브랜드)" : "Client name (optional)"
        }
        clientNameAriaLabel={isKo ? "광고주명" : "Client name"}
        clientNameSuffix={!editableClientName && isKo ? "귀중" : undefined}
        titleEditable={editableTitle}
        onTitleChange={onDocumentTitleChange}
        titlePlaceholder={
          isKo ? "보고서 제목을 입력하세요" : "Enter report title"
        }
        titleAriaLabel={isKo ? "보고서 제목" : "Report title"}
      />

      <div className="space-y-9 px-6 py-8 sm:px-9">
        {editableGreeting && onGreetingChange ? (
          <section className="space-y-2" data-testid="report-greeting-edit">
            <DocumentSectionHeading>
              {isKo ? "인사말" : "Greeting"}
            </DocumentSectionHeading>
            <textarea
              value={p.greetingText ?? ""}
              onChange={(e) => onGreetingChange(e.target.value)}
              rows={4}
              placeholder={
                isKo
                  ? "광고주에게 전달할 인사말 (비우면 PDF에서 생략)"
                  : "Greeting to the client (leave empty to omit)"
              }
              className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-[color:var(--qp-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--qp-accent)]/30"
            />
          </section>
        ) : p.greetingText?.trim() ? (
          <section className="space-y-2">
            <DocumentSectionHeading>
              {isKo ? "인사말" : "Greeting"}
            </DocumentSectionHeading>
            <div className="space-y-2 rounded-xl border border-gray-200 bg-gray-50/60 p-4 text-sm leading-relaxed text-gray-800">
              {p.greetingText.split(/\n+/).map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
          </section>
        ) : null}

        {editableExecutiveSummary && onExecutiveSummaryChange ? (
          <section className="space-y-2" data-testid="report-executive-edit">
            <DocumentSectionHeading>
              {isKo ? "전략 요약" : "Strategy summary"}
            </DocumentSectionHeading>
            <textarea
              value={(p.executiveSummaryLines ?? []).join("\n\n")}
              onChange={(e) => onExecutiveSummaryChange(e.target.value)}
              rows={8}
              placeholder={
                isKo
                  ? "제안 배경·전략·다음 액션 (비우면 PDF에서 생략)"
                  : "Proposal context and strategy (leave empty to omit)"
              }
              className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50/60 px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder:text-gray-400 focus:border-[color:var(--qp-accent)] focus:outline-none focus:ring-2 focus:ring-[color:var(--qp-accent)]/30"
            />
          </section>
        ) : p.executiveSummaryLines && p.executiveSummaryLines.length > 0 ? (
          <section className="space-y-3">
            <DocumentSectionHeading>
              {isKo ? "전략 요약" : "Strategy summary"}
            </DocumentSectionHeading>
            <ul className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
              {p.executiveSummaryLines.map((line, i) => (
                <ReportScanLine key={i} text={line} />
              ))}
            </ul>
          </section>
        ) : null}

        {/* 캠페인 개요 */}
        <section className="space-y-4">
          <DocumentSectionHeading>{isKo ? "캠페인 개요" : "Campaign overview"}</DocumentSectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {summary.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-medium text-gray-500">{label}</dt>
                <dd className="mt-0.5 break-words tkad-type-title text-gray-900">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        {/* KPI 카드 */}
        {p.kpis.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {p.kpis.slice(0, 4).map((k) => (
              <div
                key={k.label}
                className="rounded-xl border border-gray-200 bg-gray-50 p-3.5"
                data-testid={
                  k.status === "pending" ? "report-kpi-pending" : "report-kpi-value"
                }
              >
                <p className="tkad-type-caption font-medium text-gray-500">{k.label}</p>
                {k.status === "pending" ? (
                  <div className="mt-1">
                    <p className="font-sans text-lg font-bold tabular-nums text-gray-400">
                      —
                    </p>
                    <span
                      className={`mt-0.5 inline-flex items-center rounded border px-1.5 py-0.5 tkad-type-note font-semibold ${EXPORT_BADGE_HTML_CLASS[k.badge]}`}
                      data-testid="report-kpi-badge"
                      data-kpi-badge={k.badge}
                    >
                      {exportBadgeBracketLabel(k.badge, isKo)}
                    </span>
                    {k.pendingHint ? (
                      <p className="mt-0.5 tkad-type-note leading-snug text-gray-500">
                        {k.pendingHint}
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="mt-1">
                    <p className="break-words font-sans text-lg font-bold tabular-nums text-[color:var(--qp-accent)]">
                      {k.value}
                    </p>
                    <span
                      className={`mt-0.5 inline-flex items-center rounded border px-1.5 py-0.5 tkad-type-note font-semibold ${EXPORT_BADGE_HTML_CLASS[k.badge]}`}
                      data-testid="report-kpi-badge"
                      data-kpi-badge={k.badge}
                    >
                      {exportBadgeBracketLabel(k.badge, isKo)}
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : null}

        {p.quoteSummary ? (
          <ReportQuoteSummarySection summary={p.quoteSummary} isKo={isKo} />
        ) : null}

        {p.cpmFootnote ? (
          <p
            className="tkad-type-caption leading-snug text-gray-500"
            data-testid="report-cpm-footnote"
          >
            {p.cpmFootnote}
          </p>
        ) : null}

        {p.budgetHonesty?.overBudgetBanner ? (
          <p
            className="rounded-xl border border-destructive/40 bg-destructive/10 px-3.5 py-2.5 tkad-type-meta font-medium text-destructive"
            data-testid="report-over-budget-banner"
          >
            {p.budgetHonesty.overBudgetBanner}
          </p>
        ) : null}

        {p.portfolio.length > 0 && p.unpricedMediaNotice ? (
          <p
            className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-3.5 py-2.5 tkad-type-meta leading-snug text-amber-900 dark:text-amber-200"
            data-testid="report-unpriced-media-notice"
          >
            {p.unpricedMediaNotice}
          </p>
        ) : null}

        {/* 성과 요약 차트 */}
        {sectionVisible(vis, "performance") &&
        p.charts &&
        ((p.charts.budgetSplit?.length ?? 0) > 0 ||
          (p.charts.browseBudgetSplit?.length ?? 0) > 0 ||
          (p.charts.cpmBars?.length ?? 0) > 0 ||
          (p.charts.reachSummary?.length ?? 0) > 0 ||
          Boolean(p.charts.performanceGuide)) ? (
          <section className="space-y-4">
            <DocumentSectionHeading>{isKo ? "성과 요약" : "Performance summary"}</DocumentSectionHeading>
            {(p.charts.budgetSplit?.length ?? 0) > 0 ||
            (p.charts.browseBudgetSplit?.length ?? 0) > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2">
                {p.charts.budgetSplit && p.charts.budgetSplit.length > 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="mb-1 tkad-type-title text-gray-500">
                      {isKo ? "예산 배분 (유형별)" : "Budget by type"}
                    </p>
                    <p className="mb-3 tkad-type-note leading-snug text-gray-400">
                      {isKo
                        ? "디지털·고정형·이동형 — 선택 매체 월 단가 합"
                        : "Digital · static · mobile — monthly rate share"}
                    </p>
                    <DonutChart data={p.charts.budgetSplit} />
                  </div>
                ) : null}
                {p.charts.browseBudgetSplit &&
                p.charts.browseBudgetSplit.length > 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="mb-1 tkad-type-title text-gray-500">
                      {isKo ? "예산 배분 (카테고리별)" : "Budget by category"}
                    </p>
                    <p className="mb-3 tkad-type-note leading-snug text-gray-400">
                      {isKo
                        ? "OOH·교통·쉘터 등 발견하기 카테고리 기준"
                        : "OOH · transit · shelter — browse category share"}
                    </p>
                    <DonutChart data={p.charts.browseBudgetSplit} />
                  </div>
                ) : null}
              </div>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-2">
              {p.charts.reachSummary && p.charts.reachSummary.length > 0 ? (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-3 tkad-type-title text-gray-500">
                    {isKo ? "노출 요약" : "Impressions"}
                  </p>
                  <BarChart data={p.charts.reachSummary} color="#1c1c1f" isKo={isKo} />
                  {p.charts.impressionSplit &&
                  p.charts.impressionSplit.length > 0 ? (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="mb-2.5 tkad-type-caption font-semibold text-gray-500">
                        {isKo ? "유형별 노출 비중" : "Impression share by type"}
                      </p>
                      <p className="mb-2.5 tkad-type-note leading-snug text-gray-400">
                        {isKo
                          ? "CPM이 낮은 유형일수록 같은 예산 대비 노출이 많아집니다"
                          : "Lower CPM types deliver more impressions per won spent"}
                      </p>
                      <ShareBarChart data={p.charts.impressionSplit} />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {p.charts.cpmBars && p.charts.cpmBars.length > 0 ? (
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="mb-1 tkad-type-title text-gray-500">
                  {isKo ? "CPM 비교 (원)" : "CPM comparison (KRW)"}
                  {p.cpmExcludesQuoteOnly
                    ? isKo
                      ? " (문의 매체 제외)"
                      : " (excl. inquiry)"
                    : ""}
                </p>
                <p className="mb-3 tkad-type-note leading-snug text-gray-400">
                  {isKo
                    ? "유형별 천 회당 비용 — 예산 비중과 노출 비중은 다를 수 있음"
                    : "Cost per 1,000 impressions by type — budget share ≠ impression share"}
                </p>
                <BarChart data={p.charts.cpmBars} colorByRow isKo={isKo} />
              </div>
            ) : null}
            {p.charts.performanceGuide ? (
              <PerformanceGuideBlock guide={p.charts.performanceGuide} />
            ) : null}
          </section>
        ) : null}

        {sectionVisible(vis, "region") &&
        p.regionBreakdown &&
        p.regionBreakdown.length > 0 ? (
          <section className="space-y-4">
            <DocumentSectionHeading>
              {isKo ? "지역별 예산 · 효과" : "Budget & impact by region"}
            </DocumentSectionHeading>
            <div className="grid gap-6 sm:grid-cols-2">
              {p.charts?.regionBudgetSplit &&
              p.charts.regionBudgetSplit.length > 1 ? (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-3 tkad-type-title text-gray-500">
                    {isKo ? "지역별 예산 비중" : "Budget share by region"}
                  </p>
                  <DonutChart data={p.charts.regionBudgetSplit} />
                </div>
              ) : null}
              {p.charts?.regionImpressionSplit &&
              p.charts.regionImpressionSplit.length > 1 ? (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-3 tkad-type-title text-gray-500">
                    {isKo ? "지역별 노출 비중" : "Impression share by region"}
                  </p>
                  <ShareBarChart data={p.charts.regionImpressionSplit} />
                </div>
              ) : null}
            </div>
            <div className="min-w-0 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left tkad-type-title text-gray-600">
                    <th className="px-3 py-2.5">{isKo ? "지역" : "Region"}</th>
                    <th className="px-3 py-2.5">{isKo ? "매체" : "Media"}</th>
                    <th className="px-3 py-2.5">{isKo ? "월 예산" : "Monthly"}</th>
                    <th className="px-3 py-2.5">{isKo ? "월 노출" : "Monthly imp."}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.regionBreakdown.map((row) => (
                    <tr key={row.regionKey} className="border-b border-gray-100">
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        {row.label}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-700">
                        {row.mediaCount}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-900">
                        {formatExportBudgetWonLabel(row.monthlyBudgetWon, isKo)}
                        {row.monthlyBudgetWon > 0 ? (
                          <span className="ml-1 text-xs text-gray-500">
                            ({formatPlannerSharePct(row.budgetPct)})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-900">
                        {row.monthlyImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {sectionVisible(vis, "subdivision") &&
        p.regionSubdivision &&
        p.regionSubdivision.breakdown.length >= 2 ? (
          <section className="space-y-4">
            <DocumentSectionHeading>
              {isKo ? "상권 · 권역 세분화" : "District & zone detail"}
            </DocumentSectionHeading>
            <p className="text-xs text-gray-500">
              {isKo ? "기준" : "Source"}: {p.regionSubdivision.sourceFieldLabel}
              <span className="ml-2 tabular-nums text-gray-400">
                ({p.regionSubdivision.classifiedCount}/{p.regionSubdivision.totalCount})
              </span>
            </p>
            {p.regionSubdivision.coverageNote ? (
              <p className="tkad-type-caption leading-snug text-amber-700">
                {p.regionSubdivision.coverageNote}
              </p>
            ) : null}
            <div className="grid gap-6 sm:grid-cols-2">
              {p.charts?.regionSubdivisionBudgetSplit &&
              p.charts.regionSubdivisionBudgetSplit.length > 1 ? (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-3 tkad-type-title text-gray-500">
                    {isKo ? "세분화 예산 비중" : "Budget by sub-area"}
                  </p>
                  <DonutChart data={p.charts.regionSubdivisionBudgetSplit} />
                </div>
              ) : null}
              {p.charts?.regionSubdivisionImpressionSplit &&
              p.charts.regionSubdivisionImpressionSplit.length > 1 ? (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-3 tkad-type-title text-gray-500">
                    {isKo ? "세분화 노출 비중" : "Impressions by sub-area"}
                  </p>
                  <ShareBarChart data={p.charts.regionSubdivisionImpressionSplit} />
                </div>
              ) : null}
            </div>
            <div className="min-w-0 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[32rem] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50 text-left tkad-type-title text-gray-600">
                    <th className="px-3 py-2.5">
                      {isKo ? "상권·권역" : "Sub-area"}
                    </th>
                    <th className="px-3 py-2.5">{isKo ? "매체" : "Media"}</th>
                    <th className="px-3 py-2.5">{isKo ? "월 예산" : "Monthly"}</th>
                    <th className="px-3 py-2.5">{isKo ? "월 노출" : "Monthly imp."}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.regionSubdivision.breakdown.map((row) => (
                    <tr key={row.regionKey} className="border-b border-gray-100">
                      <td className="px-3 py-2.5 font-medium text-gray-900">
                        {row.label}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-700">
                        {row.mediaCount}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-900">
                        {formatExportBudgetWonLabel(row.monthlyBudgetWon, isKo)}
                        {row.monthlyBudgetWon > 0 ? (
                          <span className="ml-1 text-xs text-gray-500">
                            ({formatPlannerSharePct(row.budgetPct)})
                          </span>
                        ) : null}
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-gray-900">
                        {row.monthlyImpressions.toLocaleString(isKo ? "ko-KR" : "en-US")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {sectionVisible(vis, "recommend") && p.recommendRationale ? (
          <section className="space-y-4">
            <DocumentSectionHeading>
              {isKo ? "추천 근거" : "Recommendation rationale"}
            </DocumentSectionHeading>
            <div className="space-y-3 rounded-xl border border-[color:var(--qp-line)] bg-[color:var(--qp-accent-soft)] p-4 sm:p-5">
              {p.recommendRationale.summaryLines.map((line) => (
                <p key={line} className="text-sm leading-relaxed text-gray-700">
                  {line}
                </p>
              ))}
              {p.recommendRationale.mediaReasons.length > 0 ? (
                <ul className="space-y-2 border-t border-[color:var(--qp-line)] pt-3">
                  {p.recommendRationale.mediaReasons.map((item) => (
                    <li key={`${item.name}-${item.reason}`} className="text-sm">
                      <span className="font-semibold text-gray-900">
                        {item.name}
                      </span>
                      <span className="text-gray-600"> — {item.reason}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        ) : null}

        {sectionVisible(vis, "map") &&
        mapPortfolio &&
        mapPortfolio.length > 0 ? (
          <ReportPortfolioMapSection portfolio={mapPortfolio} isKo={isKo} />
        ) : null}

        <ReportMediaLineupSection payload={p} />

        {/* 디지털 예산 배분 */}
        {p.digital && p.digital.length ? (
          <section className="space-y-3">
            <DocumentSectionHeading>
              {isKo ? "디지털 예산 배분" : "Digital budget allocation"}
            </DocumentSectionHeading>
            {p.digitalSummary ? (
              <p className="text-sm text-gray-600">{p.digitalSummary}</p>
            ) : null}
            <div className="min-w-0 overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[30rem] border-collapse text-sm">
                <thead>
                  <tr className="bg-[color:var(--qp-accent)] text-left tkad-type-title uppercase tracking-wide text-white">
                    <th className="px-3 py-2.5">{isKo ? "플랫폼" : "Platform"}</th>
                    <th className="px-3 py-2.5">{isKo ? "비중" : "Share"}</th>
                    <th className="px-3 py-2.5 text-right">{isKo ? "예상 노출" : "Est. impressions"}</th>
                  </tr>
                </thead>
                <tbody>
                  {p.digital.map((d, i) => (
                    <tr
                      key={`${d.platform}-${i}`}
                      className={cn("border-t border-gray-100", i % 2 ? "bg-gray-50/70" : "bg-white")}
                    >
                      <td className="px-3 py-2.5 font-medium text-gray-900">{d.platform}</td>
                      <td className="px-3 py-2.5 text-gray-600">{d.sharePct}%</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                        {d.impressions > 0
                          ? d.impressions.toLocaleString(isKo ? "ko-KR" : "en-US")
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {/* 추가 섹션 (PRO 인사이트) */}
        {(visibleSections ?? []).map((sec) =>
          sec.lines.length ? (
            <section key={sec.title} className="space-y-3">
              <DocumentSectionHeading>{sec.title}</DocumentSectionHeading>
              <ul className="space-y-3 rounded-xl border border-gray-200 bg-gray-50/60 p-4">
                {sec.lines.map((line, i) => (
                  <ReportScanLine key={i} text={line} />
                ))}
              </ul>
            </section>
          ) : null,
        )}

        {/* 면책 */}
        {p.currencyFootnote ? (
          <p className="border-t border-gray-100 pt-5 tkad-type-caption leading-relaxed text-gray-500">
            {p.currencyFootnote}
          </p>
        ) : null}
        {p.pricingFootnote ? (
          <p
            className={`tkad-type-caption leading-relaxed text-gray-500 ${p.currencyFootnote ? "pt-2" : "border-t border-gray-100 pt-5"}`}
          >
            {p.pricingFootnote}
          </p>
        ) : null}
        <p
          className={`tkad-type-caption leading-relaxed text-gray-400 ${p.currencyFootnote || p.pricingFootnote ? "pt-2" : "border-t border-gray-100 pt-5"}`}
        >
          {p.disclaimer}
        </p>
      </div>
    </div>
  );
});
