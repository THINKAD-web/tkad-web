"use client";

import { useMemo } from "react";
import {
  DocumentPreviewFrame,
  DocumentSectionHeading,
  DocumentGradientHero,
  documentCardClass,
} from "@/components/document/document-layout";
import { BudgetSplitDonut } from "@/components/planner/budget-split-donut";
import { buildCampaignBuilderExportPayload } from "@/lib/admin-campaign-builder/build-export-payload";
import { campaignBuilderCopy } from "@/lib/admin-campaign-builder/copy-ko";
import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";
import {
  getReportDocumentTheme,
  type PlannerReportStyle,
} from "@/lib/planner-report-export/document-theme";
import { reportExportCoverSubtitle } from "@/lib/planner-report-export/report-cover-copy";
import { cn } from "@/lib/utils";

export type CampaignBuilderReportPreviewProps = {
  reportTitle: string;
  payload: CampaignBuilderPayload;
  catalog: { digital: PublicMediaView[]; ooh: MediaCatalogListItem[] };
  style: PlannerReportStyle;
  className?: string;
};

function fmtWon(n: number, isKo: boolean) {
  return `₩${n.toLocaleString(isKo ? "ko-KR" : "en-US")}`;
}

export function CampaignBuilderReportPreview({
  reportTitle,
  payload,
  catalog,
  style,
  className,
}: CampaignBuilderReportPreviewProps) {
  const isKo = true;
  const theme = getReportDocumentTheme(style);

  const { payload: exportPayload } = useMemo(
    () =>
      buildCampaignBuilderExportPayload(
        { title: reportTitle, payload },
        { digitalCatalog: catalog.digital, oohCatalog: catalog.ooh },
        style,
      ),
    [reportTitle, payload, catalog.digital, catalog.ooh, style],
  );

  const section = exportPayload.builderSection;
  if (!section) return null;

  const copy = campaignBuilderCopy[section.documentType];
  const consult = isKo ? "별도 협의" : "Consultation";

  return (
    <DocumentPreviewFrame className={className}>
      <article
        className={cn(documentCardClass, "space-y-9")}
        data-testid="campaign-builder-report-preview"
      >
        <DocumentGradientHero
          reportStyle={style}
          badge="CAMPAIGN BUILDER"
          title={exportPayload.documentTitle}
          subtitle={reportExportCoverSubtitle(isKo, {
            kind: "builder",
            builderDocumentType: section.documentType,
          })}
          clientName={exportPayload.clientName}
          clientNameSuffix={exportPayload.clientName ? "귀중" : undefined}
        />

        <div className="space-y-9 px-6 pb-8 sm:px-9">
          {exportPayload.kpis.length > 0 ? (
            <section data-testid="builder-preview-kpi">
              <DocumentSectionHeading accentColor={theme.accent}>
                KPI
              </DocumentSectionHeading>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {exportPayload.kpis.map((kpi) => (
                  <div
                    key={kpi.label}
                    className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3"
                  >
                    <p className="text-xs text-gray-500">{kpi.label}</p>
                    <p
                      className="mt-1 text-lg font-bold tabular-nums"
                      style={{ color: theme.accent }}
                    >
                      {kpi.value}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {section.digitalLines.length > 0 ? (
            <section data-testid="builder-preview-digital">
              <DocumentSectionHeading accentColor={theme.accent}>
                {copy.sectionTitles.estimateProducts}
              </DocumentSectionHeading>
              <p className="mt-2 text-sm text-gray-600">{copy.estimateNotice}</p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-900 text-left text-xs text-white">
                      <th className="px-3 py-2">{isKo ? "매체" : "Media"}</th>
                      <th className="px-3 py-2">{isKo ? "플랫폼" : "Platform"}</th>
                      <th className="px-3 py-2">{isKo ? "과금" : "Pricing"}</th>
                      <th className="px-3 py-2">{isKo ? "예산" : "Budget"}</th>
                      <th className="px-3 py-2">{isKo ? "예상 도달" : "Est. reach"}</th>
                      <th className="px-3 py-2">{isKo ? "예상 클릭" : "Est. clicks"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {section.digitalLines.map((row) => (
                      <tr key={row.slug ?? row.mediaId} className="border-b border-gray-100">
                        <td className="px-3 py-2 font-medium">{row.name}</td>
                        <td className="px-3 py-2 text-gray-600">{row.platform ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-600">{row.pricingLabel}</td>
                        <td className="px-3 py-2 tabular-nums">{fmtWon(row.budgetWon, isKo)}</td>
                        <td className="px-3 py-2 text-gray-600">{row.reachLabel ?? consult}</td>
                        <td className="px-3 py-2 text-gray-600">{row.clicksLabel ?? consult}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          {section.oohLines.length > 0 ? (
            <section data-testid="builder-preview-ooh">
              <DocumentSectionHeading accentColor={theme.accent}>
                {isKo ? "OOH 매체" : "OOH media"}
              </DocumentSectionHeading>
              <BuilderMediaTable rows={section.oohLines} isKo={isKo} />
            </section>
          ) : null}

          {section.customLines.length > 0 ? (
            <section data-testid="builder-preview-custom">
              <DocumentSectionHeading accentColor={theme.accent}>
                {copy.sectionTitles.executionGroup}
              </DocumentSectionHeading>
              <p className="mt-2 text-sm text-gray-600">{copy.executionNotice}</p>
              <BuilderMediaTable rows={section.customLines} isKo={isKo} />
            </section>
          ) : null}

          {(section.charts.budgetSplit?.length ?? 0) > 0 ? (
            <section data-testid="builder-preview-chart">
              <DocumentSectionHeading accentColor={theme.accent}>
                {isKo ? "채널 예산 구성" : "Channel budget mix"}
              </DocumentSectionHeading>
              <div className="mt-4">
                <BudgetSplitDonut data={section.charts.budgetSplit!} />
              </div>
            </section>
          ) : null}

          {section.insights ? (
            <section data-testid="builder-preview-insights">
              <DocumentSectionHeading accentColor={theme.accent}>
                {copy.sectionTitles.insightsGroup}
              </DocumentSectionHeading>
              <p className="mt-2 text-sm text-gray-600">{copy.insightsHint}</p>
              <InsightBlock
                title={isKo ? "소진 페이스" : "Spend pace"}
                lines={section.insights.pacingPlan.map(
                  (ph) => `${ph.label} (${ph.sharePct}%) — ${ph.description}`,
                )}
              />
              <InsightBlock
                title={isKo ? "소재 방향" : "Creative direction"}
                lines={section.insights.creativeDirections}
              />
              <InsightBlock
                title={isKo ? "운영 메모" : "Operations notes"}
                lines={section.insights.operationalNotes}
              />
              <p className="mt-4 text-xs text-gray-500">{section.insights.disclaimer}</p>
            </section>
          ) : null}
        </div>
      </article>
    </DocumentPreviewFrame>
  );
}

function BuilderMediaTable({
  rows,
  isKo,
}: {
  rows: {
    name: string;
    type?: string;
    region?: string;
    priceLabel?: string;
    notes?: string;
    metricsUnavailableLabel?: string;
  }[];
  isKo: boolean;
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-900 text-left text-xs text-white">
            <th className="px-3 py-2">{isKo ? "매체" : "Media"}</th>
            <th className="px-3 py-2">{isKo ? "유형/지역" : "Type/Region"}</th>
            <th className="px-3 py-2">{isKo ? "예산/가격" : "Budget/Price"}</th>
            <th className="px-3 py-2">{isKo ? "비고" : "Notes"}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-b border-gray-100">
              <td className="px-3 py-2 font-medium">{row.name}</td>
              <td className="px-3 py-2 text-gray-600">
                {[row.type, row.region].filter(Boolean).join(" · ") || "—"}
              </td>
              <td className="px-3 py-2 text-gray-600">{row.priceLabel ?? "—"}</td>
              <td className="px-3 py-2 text-gray-600">
                {row.notes ?? row.metricsUnavailableLabel ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InsightBlock({
  title,
  lines,
}: {
  title: string;
  lines: readonly string[];
}) {
  if (!lines.length) return null;
  return (
    <div className="mt-4">
      <h4 className="text-sm font-semibold text-gray-900">{title}</h4>
      <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
        {lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
    </div>
  );
}

export default CampaignBuilderReportPreview;
