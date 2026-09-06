"use client";

import { cn } from "@/lib/utils";
import { DocumentSectionHeading } from "@/components/document/document-layout";
import { ReportScanLine } from "@/components/planner/report-scan-text";
import type { PlannerExportOnlineSection } from "@/lib/planner-report-export/types";
import { EXPORT_BADGE_HTML_CLASS, exportBadgeBracketLabel } from "@/lib/planner-report-export/export-badge";

type Props = {
  section: PlannerExportOnlineSection;
  isKo: boolean;
  part: "before" | "after";
};

export function ReportOnlineSectionEnrichment({ section, isKo, part }: Props) {
  const consult = isKo ? "별도 협의" : "Consultation";
  const fmtWon = (n: number) =>
    `₩${n.toLocaleString(isKo ? "ko-KR" : "en-US")}`;

  if (part === "before") {
    return (
      <>
      {section.kpiCards && section.kpiCards.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {section.kpiCards.map((k) => (
            <div
              key={k.label}
              className="rounded-xl border border-gray-200 bg-gray-50/60 p-3"
            >
              <p className="text-xs font-medium text-gray-500">{k.label}</p>
              <p className="mt-1 text-sm font-semibold tabular-nums text-gray-900">
                {k.value}
              </p>
              {k.badge ? (
                <span
                  className={cn(
                    "mt-1 inline-block text-[10px] font-semibold uppercase tracking-wide",
                    EXPORT_BADGE_HTML_CLASS[k.badge],
                  )}
                >
                  {exportBadgeBracketLabel(k.badge, isKo)}
                </span>
              ) : null}
              {k.pendingHint ? (
                <p className="mt-1 text-[11px] text-amber-800">{k.pendingHint}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {section.categoryRows && section.categoryRows.length > 0 ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-gray-900">
            {isKo ? "유형별 비중" : "Share by type"}
          </h3>
          <div className="min-w-0 overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full min-w-[32rem] border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  <th className="px-3 py-2.5">{isKo ? "유형" : "Type"}</th>
                  <th className="px-3 py-2.5 text-right">{isKo ? "채널" : "Lines"}</th>
                  <th className="px-3 py-2.5 text-right">{isKo ? "월 예산" : "Budget"}</th>
                  <th className="px-3 py-2.5 text-right">{isKo ? "비중" : "Share"}</th>
                  <th className="px-3 py-2.5 text-right">{isKo ? "예상 도달" : "Est. reach"}</th>
                  <th className="px-3 py-2.5 text-right">{isKo ? "예상 클릭" : "Est. clicks"}</th>
                </tr>
              </thead>
              <tbody>
                {section.categoryRows.map((row, i) => (
                  <tr
                    key={row.key}
                    className={cn(
                      "border-t border-gray-100",
                      i % 2 ? "bg-gray-50/70" : "bg-white",
                    )}
                  >
                    <td className="px-3 py-2.5 font-medium text-gray-900">{row.label}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                      {row.lineCount}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-900">
                      {fmtWon(row.budgetWon)}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                      {row.budgetSharePct}%
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                      {row.reachLabel ?? consult}
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums text-gray-600">
                      {row.clicksLabel ?? consult}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      </>
    );
  }

  if (!section.insights) return null;

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50/40 p-4">
          {section.insights.pacingPlan.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {isKo ? "소진 페이스" : "Spend pace"}
              </h3>
              <ul className="space-y-2">
                {section.insights.pacingPlan.map((phase) => (
                  <li key={phase.label} className="text-sm text-gray-700">
                    <span className="font-semibold text-gray-900">
                      {phase.label} ({phase.sharePct}%)
                    </span>
                    {" — "}
                    {phase.description}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {section.insights.creativeDirections.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {isKo ? "소재 방향" : "Creative direction"}
              </h3>
              <ul className="space-y-2">
                {section.insights.creativeDirections.map((line) => (
                  <ReportScanLine key={line} text={line} />
                ))}
              </ul>
            </div>
          ) : null}

          {section.insights.operationalNotes.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-gray-900">
                {isKo ? "운영 메모" : "Operations notes"}
              </h3>
              <ul className="space-y-2">
                {section.insights.operationalNotes.map((line) => (
                  <ReportScanLine key={line} text={line} />
                ))}
              </ul>
            </div>
          ) : null}

          <p className="border-t border-gray-200 pt-3 text-[11px] leading-relaxed text-gray-500">
            {section.insights.disclaimer}
          </p>
    </div>
  );
}
