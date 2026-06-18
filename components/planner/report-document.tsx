"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { PlannerReportExportPayload, PlannerExportChartDatum } from "@/lib/planner-report-export/types";
import type { PlannerPerformanceGuide } from "@/lib/planner-report-performance-guide";
import { MediaDetailCard } from "@/components/document/media-detail-card";
import { plannerChartColor } from "@/lib/planner-chart-colors";
import { formatPlannerSharePct } from "@/lib/planner-logic";
import {
  documentCardClass,
  DocumentGradientHero,
  DocumentSectionHeading,
} from "@/components/document/document-layout";
import type { DocumentMediaDetail } from "@/lib/document-media-detail";

/**
 * 플래너 보고서 화면 문서 — 서버 PDF/PPTX 와 동일한 payload·레이아웃으로 렌더한다.
 * "화면에서 보는 것 = 내려받는 것" 을 보장하기 위한 단일 표현 컴포넌트.
 * 라이트 테마 고정(제안서 문서), 표는 가로 스크롤 래퍼로 모바일 넘침 방지.
 */

function fmtBudget(man: number, isKo: boolean) {
  return isKo ? `${man.toLocaleString()}만원` : `${man.toLocaleString()}M KRW`;
}

const CHART_COLORS = ["#7C3AED", "#0891B2", "#EC4899", "#10B981", "#F59E0B"];

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
    <div className="rounded-xl border border-violet-200 bg-violet-50/70 p-4 sm:p-5">
      <p className="text-sm font-semibold text-violet-900">{guide.title}</p>
      <div className="mt-3 overflow-x-auto rounded-lg border border-violet-100 bg-white">
        <table className="w-full min-w-[16rem] border-collapse text-sm">
          <thead>
            <tr className="border-b border-violet-100 bg-violet-50/80 text-left text-xs font-semibold text-violet-800">
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
            className="flex gap-2.5 text-sm leading-relaxed text-violet-950/90"
          >
            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
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
  { payload: PlannerReportExportPayload; className?: string }
>(function PlannerReportDocument({ payload: p, className }, ref) {
  const isKo = p.isKo;
  const summary: Array<[string, string]> = [
    [isKo ? "캠페인 목표" : "Goal", p.goalTitle || "—"],
    [isKo ? "총 예산" : "Total budget", fmtBudget(p.budgetMan, isKo)],
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
      />

      <div className="space-y-9 px-6 py-8 sm:px-9">
        {/* 캠페인 개요 */}
        <section className="space-y-4">
          <DocumentSectionHeading>{isKo ? "캠페인 개요" : "Campaign overview"}</DocumentSectionHeading>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3">
            {summary.map(([label, value]) => (
              <div key={label} className="min-w-0">
                <dt className="text-xs font-medium text-gray-500">{label}</dt>
                <dd className="mt-0.5 break-words text-sm font-semibold text-gray-900">
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
              >
                <p className="text-[11px] font-medium text-gray-500">{k.label}</p>
                <p className="mt-1 break-words font-display text-lg font-black tabular-nums text-violet-700">
                  {k.value}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        {/* 성과 요약 차트 */}
        {p.charts &&
        ((p.charts.budgetSplit?.length ?? 0) > 0 ||
          (p.charts.cpmBars?.length ?? 0) > 0 ||
          (p.charts.reachSummary?.length ?? 0) > 0) ? (
          <section className="space-y-4">
            <DocumentSectionHeading>{isKo ? "성과 요약" : "Performance summary"}</DocumentSectionHeading>
            <div className="grid gap-6 sm:grid-cols-2">
              {p.charts.budgetSplit && p.charts.budgetSplit.length > 0 ? (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-1 text-xs font-semibold text-gray-500">
                    {isKo ? "예산 배분" : "Budget allocation"}
                  </p>
                  <p className="mb-3 text-[10px] leading-snug text-gray-400">
                    {isKo
                      ? "선택 매체 월 단가 합 — 돈이 어디로 쓰이는지"
                      : "Share of selected media monthly rates (where spend goes)"}
                  </p>
                  <DonutChart data={p.charts.budgetSplit} />
                </div>
              ) : null}
              {p.charts.reachSummary && p.charts.reachSummary.length > 0 ? (
                <div className="rounded-xl border border-gray-200 p-4">
                  <p className="mb-3 text-xs font-semibold text-gray-500">
                    {isKo ? "노출 요약" : "Impressions"}
                  </p>
                  <BarChart data={p.charts.reachSummary} color="#0891B2" isKo={isKo} />
                  {p.charts.impressionSplit &&
                  p.charts.impressionSplit.length > 0 ? (
                    <div className="mt-4 border-t border-gray-100 pt-4">
                      <p className="mb-2.5 text-[11px] font-semibold text-gray-500">
                        {isKo ? "유형별 노출 비중" : "Impression share by type"}
                      </p>
                      <p className="mb-2.5 text-[10px] leading-snug text-gray-400">
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
                <p className="mb-1 text-xs font-semibold text-gray-500">
                  {isKo ? "CPM 비교 (원)" : "CPM comparison (KRW)"}
                </p>
                <p className="mb-3 text-[10px] leading-snug text-gray-400">
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

        {/* 선택 매체 구성 */}
        <section className="space-y-4 py-2">
          <DocumentSectionHeading>{isKo ? "매체 구성" : "Media lineup"}</DocumentSectionHeading>
          {p.portfolio.length === 0 ? (
            <p className="rounded-xl border border-gray-200 bg-[#F8F9FC] px-4 py-8 text-center text-sm text-gray-500">
              {isKo ? "포트폴리오에 담긴 매체가 없습니다." : "No media selected."}
            </p>
          ) : (
            <ul className="space-y-4">
              {p.portfolio.map((m, i) => {
                const mediaId = m.id;
                const hasMediaLink = Boolean(mediaId && !String(mediaId).startsWith("row-"));
                const detail: DocumentMediaDetail = {
                  id: mediaId ?? `row-${i}`,
                  name: m.name,
                  location: m.location,
                  thumbUrl: m.thumbUrl,
                  categoryLabel: m.categoryLabel,
                  size: m.size,
                  operatingHours: m.operatingHours,
                  dailyTraffic: m.dailyTraffic,
                  broadcastLabel: m.broadcastLabel,
                  monthlyPriceLabel: m.monthlyPriceLabel ?? m.priceLabel,
                  lineTotalLabel: m.lineTotalLabel,
                  recommendReason: m.recommendReason,
                  exposureContributionPct: m.exposureContributionPct,
                  budgetContributionPct: m.budgetContributionPct,
                };
                return (
                  <li key={detail.id}>
                    <MediaDetailCard
                      detail={detail}
                      isKo={isKo}
                      showContribution
                      portfolioSize={p.portfolio.length}
                      mediaPageHref={hasMediaLink ? `/media/${mediaId}` : undefined}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* 디지털 예산 배분 */}
        {p.digital && p.digital.length ? (
          <section className="space-y-3">
            <DocumentSectionHeading>
              {isKo ? "디지털 예산 배분" : "Digital budget allocation"}
            </DocumentSectionHeading>
            {p.digitalSummary ? (
              <p className="text-sm text-gray-600">{p.digitalSummary}</p>
            ) : null}
            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full min-w-[30rem] border-collapse text-sm">
                <thead>
                  <tr className="bg-cyan-600 text-left text-xs font-semibold uppercase tracking-wide text-white">
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
        {(p.sections ?? []).map((sec) =>
          sec.lines.length ? (
            <section key={sec.title} className="space-y-3">
              <DocumentSectionHeading>{sec.title}</DocumentSectionHeading>
              <ul className="space-y-2">
                {sec.lines.map((line, i) => (
                  <li key={i} className="flex gap-2.5 text-sm leading-relaxed text-gray-700">
                    <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-violet-500" />
                    <span className="break-words">{line}</span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null,
        )}

        {/* 면책 */}
        <p className="border-t border-gray-100 pt-5 text-[11px] leading-relaxed text-gray-400">
          {p.disclaimer}
        </p>
      </div>
    </div>
  );
});
