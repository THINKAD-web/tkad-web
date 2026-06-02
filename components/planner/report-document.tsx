"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import type { PlannerReportExportPayload } from "@/lib/planner-report-export/types";

/**
 * 플래너 보고서 화면 문서 — 서버 PDF/PPTX 와 동일한 payload·레이아웃으로 렌더한다.
 * "화면에서 보는 것 = 내려받는 것" 을 보장하기 위한 단일 표현 컴포넌트.
 * 라이트 테마 고정(제안서 문서), 표는 가로 스크롤 래퍼로 모바일 넘침 방지.
 */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="flex items-center gap-2 text-base font-bold tracking-tight text-gray-900">
      <span className="inline-block h-4 w-1.5 rounded-full bg-violet-600" />
      {children}
    </h3>
  );
}

function fmtBudget(man: number, isKo: boolean) {
  return isKo ? `${man.toLocaleString()}만원` : `${man.toLocaleString()}M KRW`;
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
      className={cn(
        "mx-auto w-full max-w-[880px] overflow-hidden rounded-2xl border border-gray-200 bg-white text-gray-900 shadow-sm",
        className,
      )}
    >
      {/* 표지 헤더 */}
      <div className="bg-gradient-to-br from-violet-600 via-violet-700 to-violet-800 px-6 py-7 sm:px-9 sm:py-9">
        <p className="font-display text-[11px] font-semibold uppercase tracking-[0.22em] text-violet-200">
          THINKAD CAMPAIGN PLANNER
        </p>
        <h2 className="mt-2 text-2xl font-black leading-tight text-white sm:text-3xl">
          {p.documentTitle}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-violet-100">
          <span>
            {p.kind === "integrated"
              ? isKo
                ? "OOH + 디지털 통합 제안"
                : "OOH + Digital integrated"
              : isKo
                ? "OOH 미디어 플랜"
                : "OOH media plan"}
          </span>
          <span aria-hidden>·</span>
          <span>{p.generatedAt}</span>
        </div>
        <div className="mt-5 h-1 w-16 rounded-full bg-cyan-400" />
      </div>

      <div className="space-y-9 px-6 py-8 sm:px-9">
        {/* 캠페인 개요 */}
        <section className="space-y-4">
          <SectionHeading>{isKo ? "캠페인 개요" : "Campaign overview"}</SectionHeading>
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

        {/* 선택 매체 구성 */}
        <section className="space-y-3">
          <SectionHeading>{isKo ? "선택 매체 구성" : "Selected media"}</SectionHeading>
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="bg-violet-600 text-left text-xs font-semibold uppercase tracking-wide text-white">
                  <th className="px-3 py-2.5">{isKo ? "매체" : "Media"}</th>
                  <th className="px-3 py-2.5">{isKo ? "지역" : "Region"}</th>
                  <th className="px-3 py-2.5">{isKo ? "유형" : "Type"}</th>
                  <th className="px-3 py-2.5 text-right">{isKo ? "비용" : "Price"}</th>
                </tr>
              </thead>
              <tbody>
                {p.portfolio.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-6 text-center text-gray-500">
                      {isKo ? "포트폴리오에 담긴 매체가 없습니다." : "No media selected."}
                    </td>
                  </tr>
                ) : (
                  p.portfolio.map((m, i) => (
                    <tr
                      key={`${m.name}-${i}`}
                      className={cn("border-t border-gray-100", i % 2 ? "bg-gray-50/70" : "bg-white")}
                    >
                      <td className="px-3 py-2.5 font-medium text-gray-900">{m.name}</td>
                      <td className="px-3 py-2.5 text-gray-600">{m.region}</td>
                      <td className="px-3 py-2.5 text-gray-600">{m.type}</td>
                      <td className="px-3 py-2.5 text-right font-medium text-gray-900">
                        {m.priceLabel ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 디지털 예산 배분 */}
        {p.digital && p.digital.length ? (
          <section className="space-y-3">
            <SectionHeading>
              {isKo ? "디지털 예산 배분" : "Digital budget allocation"}
            </SectionHeading>
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
              <SectionHeading>{sec.title}</SectionHeading>
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
