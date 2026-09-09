import {
  applyInsightsOverride,
  buildCampaignBuilderInsights,
} from "@/lib/admin-campaign-builder/build-insights";
import { campaignBuilderCopy } from "@/lib/admin-campaign-builder/copy-ko";
import {
  formatKpiRange,
  formatWon,
  mediaPriceOnInquiryLabel,
} from "@/lib/admin-campaign-builder/format";
import type {
  CampaignBuilderPayload,
  CustomExecutionLine,
  DigitalCampaignLine,
  OohCampaignLine,
} from "@/lib/admin-campaign-builder/schemas";
import { summarizeBuilderReport } from "@/lib/admin-campaign-builder/summary";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import type { MediaCatalogListItem } from "@/lib/media-catalog-list-dto";
import type { PlannerReportStyle } from "@/lib/planner-report-export/document-theme";
import type {
  PlannerExportKpi,
  PlannerExportMediaRow,
  PlannerExportOnlineLine,
  PlannerReportExportPayload,
} from "@/lib/planner-report-export/types";
import {
  estimatePerformance,
  onlinePricingLabel,
  type OnlineSpecRates,
} from "@/lib/pricing/online-performance-estimate";

export type BuildCampaignBuilderExportContext = {
  digitalCatalog: PublicMediaView[];
  oohCatalog: MediaCatalogListItem[];
};

export type BuildCampaignBuilderExportResult = {
  payload: PlannerReportExportPayload;
  warnings: string[];
};

function viewToOnlineSpec(view: PublicMediaView): OnlineSpecRates {
  return {
    cpcMin: view.cpcMin,
    cpcMax: view.cpcMax,
    cpmMin: view.cpmMin,
    cpmMax: view.cpmMax,
    minBudget: view.minBudget ?? 0,
  };
}

function isCalculableView(view: PublicMediaView): boolean {
  return (
    view.cpcMin != null ||
    view.cpcMax != null ||
    view.cpmMin != null ||
    view.cpmMax != null
  );
}

export function digitalLineToExportLine(
  line: DigitalCampaignLine,
  view: PublicMediaView | undefined,
  isKo: boolean,
): PlannerExportOnlineLine | null {
  if (!view) return null;

  const spec = viewToOnlineSpec(view);
  const calculable = isCalculableView(view);
  const est =
    calculable && line.budgetWon > 0
      ? estimatePerformance(spec, line.budgetWon)
      : null;
  const reachLabel =
    est?.reachMin != null && est?.reachMax != null
      ? formatKpiRange(est.reachMin, est.reachMax)
      : null;
  const clicksLabel =
    est?.clicksMin != null && est?.clicksMax != null
      ? formatKpiRange(est.clicksMin, est.clicksMax)
      : null;

  return {
    mediaId: line.mediaId ?? view.slug,
    slug: line.slug,
    name: isKo ? view.nameKo : view.nameEn,
    platform: view.platform ?? undefined,
    budgetWon: line.budgetWon,
    pricingLabel: calculable
      ? onlinePricingLabel(spec)
      : mediaPriceOnInquiryLabel(isKo ? "ko-KR" : "en-US"),
    reachLabel,
    clicksLabel,
    hasEstimate: Boolean(reachLabel || clicksLabel),
  };
}

function oohLineToExportRow(
  line: OohCampaignLine,
  isKo: boolean,
): PlannerExportMediaRow {
  return {
    kind: "catalog",
    id: line.mediaId,
    name: line.name,
    region: line.region,
    type: line.type,
    location: line.location,
    priceLabel:
      line.priceWon != null && line.priceWon > 0
        ? formatWon(line.priceWon)
        : mediaPriceOnInquiryLabel(isKo ? "ko-KR" : "en-US"),
  };
}

function customLineToExportRow(
  line: CustomExecutionLine,
  isKo: boolean,
): PlannerExportMediaRow {
  const notes = [
    line.targeting,
    line.startDate && line.endDate
      ? `${line.startDate} ~ ${line.endDate}`
      : undefined,
    line.actualReach != null
      ? `${isKo ? "도달" : "Reach"}: ${line.actualReach.toLocaleString(isKo ? "ko-KR" : "en-US")}`
      : undefined,
    line.actualClicks != null
      ? `${isKo ? "클릭" : "Clicks"}: ${line.actualClicks.toLocaleString(isKo ? "ko-KR" : "en-US")}`
      : undefined,
    line.notes,
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    kind: "custom",
    id: line.id,
    name: line.mediaName,
    priceLabel: formatWon(line.budgetWon),
    notes: notes || undefined,
    metricsUnavailableLabel: isKo
      ? "카탈로그 외 실집행"
      : "Off-catalog execution",
  };
}

function buildKpiCards(
  payload: CampaignBuilderPayload,
  summary: ReturnType<typeof summarizeBuilderReport>,
  isKo: boolean,
): PlannerExportKpi[] {
  const copy = campaignBuilderCopy[payload.documentType];
  const avgBudget =
    summary.digitalLineCount > 0
      ? Math.round(summary.totalBudgetWon / summary.digitalLineCount)
      : 0;

  const kpis: PlannerExportKpi[] = [
    {
      label: copy.kpiLabels.activeChannels,
      value: String(summary.lineCount),
      badge: "estimated",
    },
    {
      label: copy.kpiLabels.totalBudget,
      value: formatWon(summary.totalBudgetWon),
      badge: "estimated",
    },
  ];

  if (summary.reachLabel) {
    kpis.push({
      label: copy.kpiLabels.expectedReach,
      value: summary.reachLabel,
      badge: "estimated",
    });
  }

  if (summary.digitalLineCount > 0) {
    kpis.push({
      label: copy.kpiLabels.avgBudget,
      value: formatWon(avgBudget),
      badge: "estimated",
    });
  }

  return kpis.slice(0, 4);
}

export function buildCampaignBuilderExportPayload(
  report: { title: string; payload: CampaignBuilderPayload },
  context: BuildCampaignBuilderExportContext,
  style: PlannerReportStyle,
): BuildCampaignBuilderExportResult {
  void style;

  const isKo = true;
  const payload = report.payload;
  const warnings: string[] = [];

  const digitalBySlug = new Map(
    context.digitalCatalog.map((view) => [view.slug, view]),
  );
  const catalogBySlug = new Map(
    context.digitalCatalog.map((view) => [
      view.slug,
      { nameKo: view.nameKo, platform: view.platform },
    ]),
  );

  const digitalLines: PlannerExportOnlineLine[] = [];
  for (const line of payload.digitalLines) {
    const view = digitalBySlug.get(line.slug);
    if (!view) {
      warnings.push(`digital catalog miss: slug "${line.slug}"`);
      continue;
    }
    const exportLine = digitalLineToExportLine(line, view, isKo);
    if (exportLine) digitalLines.push(exportLine);
  }

  const oohLines = payload.oohLines.map((line) => oohLineToExportRow(line, isKo));
  const customLines = payload.customLines.map((line) =>
    customLineToExportRow(line, isKo),
  );

  const summary = summarizeBuilderReport(payload, catalogBySlug);
  const insights = applyInsightsOverride(
    buildCampaignBuilderInsights(payload, {
      views: context.digitalCatalog,
      isKo,
    }),
    payload.insightsOverride,
  );

  const charts = { budgetSplit: summary.budgetChart };
  const generatedAt = new Date().toISOString().slice(0, 10);
  const clientName =
    payload.clientName?.trim() || payload.clientCompany?.trim() || undefined;

  const exportPayload: PlannerReportExportPayload = {
    kind: "builder",
    isKo,
    documentTitle: report.title,
    campaignName: payload.title,
    clientName,
    generatedAt,
    goalTitle: payload.title,
    budgetMan: Math.round(summary.totalBudgetWon / 10_000),
    periodDisplay: "—",
    regionsText: "—",
    categoriesText: "—",
    ageText: "—",
    industryText: "—",
    kpis: buildKpiCards(payload, summary, isKo),
    charts,
    portfolio: [],
    builderSection: {
      documentType: payload.documentType,
      digitalLines,
      oohLines,
      customLines,
      charts,
      insights,
    },
    disclaimer: insights.disclaimer,
  };

  return { payload: exportPayload, warnings };
}
