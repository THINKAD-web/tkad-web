"use client";

import type { PlannerExportQuoteSummary } from "@/lib/planner-report-export/types";
import { formatExportBudgetWonLabel } from "@/lib/planner-report-export/format-export-money";
import { DocumentSectionHeading } from "@/components/document/document-layout";

type Props = {
  summary: PlannerExportQuoteSummary;
  isKo: boolean;
};

export function ReportQuoteSummarySection({ summary, isKo }: Props) {
  const fmt = (won: number) => formatExportBudgetWonLabel(won, isKo);

  const rows: { label: string; value: string; emphasis?: boolean }[] = [
    {
      label: isKo ? "매체비 (확정)" : "Media fee (confirmed)",
      value: fmt(summary.supplyWon),
    },
    {
      label: isKo ? "제작비" : "Production",
      value:
        summary.productionWon > 0
          ? fmt(summary.productionWon)
          : isKo
            ? "—"
            : "—",
    },
    {
      label: isKo ? "부가세 (10%)" : "VAT (10%)",
      value: fmt(summary.vatWon),
    },
    {
      label: summary.totalLabel,
      value: fmt(summary.totalWon),
      emphasis: true,
    },
  ];

  if (summary.quoteOnlyLine) {
    rows.splice(3, 0, {
      label: summary.quoteOnlyLine.label,
      value: summary.quoteOnlyLine.amountLabel,
    });
  }

  return (
    <section className="space-y-3" data-testid="report-quote-summary">
      <DocumentSectionHeading>
        {isKo ? "견적 요약" : "Quote summary"}
      </DocumentSectionHeading>
      <div className="overflow-hidden rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={
                  row.emphasis
                    ? "border-t border-gray-200 bg-gray-50/80"
                    : "border-t border-gray-100 first:border-t-0"
                }
              >
                <th
                  scope="row"
                  className={`px-4 py-2.5 text-left font-medium ${
                    row.emphasis ? "text-gray-900" : "text-gray-600"
                  }`}
                >
                  {row.label}
                </th>
                <td
                  className={`px-4 py-2.5 text-right tabular-nums ${
                    row.emphasis
                      ? "font-bold text-[color:var(--qp-accent)]"
                      : "text-gray-900"
                  }`}
                >
                  {row.value}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {summary.footnotes.map((note) => (
        <p
          key={note}
          className="text-[11px] leading-relaxed text-gray-500"
          data-testid="report-quote-summary-footnote"
        >
          ※ {note}
        </p>
      ))}
    </section>
  );
}
