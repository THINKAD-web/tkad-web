/**
 * A-1 export verification (no browser): override → PDF/PPTX bytes checks.
 * Usage: node --import tsx/esm scripts/verify-builder-a1-export.mjs
 */
import assert from "node:assert/strict";
import { buildCampaignBuilderExportPayload } from "../lib/admin-campaign-builder/build-export-payload.ts";
import { CAMPAIGN_BUILDER_PAYLOAD_VERSION } from "../lib/admin-campaign-builder/schemas.ts";
import { buildPlannerReportPdf } from "../lib/planner-report-export/build-pdf.ts";
import { buildPlannerReportPptx } from "../lib/planner-report-export/build-pptx.ts";

const view = {
  slug: "meta-a1",
  nameKo: "A1 검증 매체",
  nameEn: "A1 Media",
  channel: "online",
  objective: "awareness",
  mediaType: "digital",
  platform: "Meta",
  billingType: ["cpm"],
  cpcMin: 100,
  cpcMax: 200,
  cpmMin: 3000,
  cpmMax: 5000,
  minBudget: 500_000,
  monthlyBudgetMin: 500_000,
  monthlyBudgetMax: 5_000_000,
  descriptionKo: "",
  descriptionEn: "",
  featuresKo: [],
  kpiHintsKo: [],
  fitIndustries: [],
  fitGoals: [],
  ageTargets: [],
  genderTarget: null,
  interests: [],
  geoTargeting: [],
  audienceSize: null,
  strengths: [],
  idealFor: [],
  verified: true,
  isPromotion: false,
  mediaKitUrl: null,
  logoUrl: null,
  sourceNote: null,
  sortOrder: 0,
};

const CUSTOM_DISCLAIMER = "A1 커스텀 disclaimer 문구";
const CUSTOM_DIGITAL_TITLE = "A1 커스텀 디지털 섹션";

const proposalPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "A1 proposal baseline",
  digitalLines: [{ slug: "meta-a1", budgetWon: 1_000_000 }],
  oohLines: [],
  customLines: [],
};

const overridePayload = {
  ...proposalPayload,
  insightsOverride: {
    disclaimer: CUSTOM_DISCLAIMER,
    sectionTitles: { digital: CUSTOM_DIGITAL_TITLE },
  },
};

const reportPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "report",
  title: "A1 report KPI",
  digitalLines: [],
  oohLines: [],
  customLines: [
    {
      id: "c1",
      mediaName: "실측 캠페인",
      budgetWon: 3_000_000,
      actualReach: 50_000,
      actualClicks: 900,
    },
  ],
};

async function countPptxSlides(bytes) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const xml = await zip.file("ppt/presentation.xml")?.async("string");
  return (xml?.match(/<p:sldId /g) ?? []).length;
}

async function pptxContains(bytes, needle) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const parts = await Promise.all(
    Object.keys(zip.files)
      .filter((n) => n.startsWith("ppt/slides/slide") && n.endsWith(".xml"))
      .map((n) => zip.file(n).async("string")),
  );
  return parts.some((xml) => xml.includes(needle));
}

function pdfContains(bytes, needle) {
  return Buffer.from(bytes).includes(Buffer.from(needle, "utf8"));
}

async function main() {
  const results = [];

  const baseline = buildCampaignBuilderExportPayload(
    { title: "baseline", payload: proposalPayload },
    { digitalCatalog: [view], oohCatalog: [] },
    "brand",
  ).payload;
  const baselinePdf = await buildPlannerReportPdf(baseline, { style: "brand" });
  results.push({
    check: "proposal baseline PDF",
    ok: pdfContains(baselinePdf, "디지털 채널 제안"),
    detail: "default digital section title present",
  });

  const overridden = buildCampaignBuilderExportPayload(
    { title: "override", payload: overridePayload },
    { digitalCatalog: [view], oohCatalog: [] },
    "brand",
  ).payload;
  const overridePdf = await buildPlannerReportPdf(overridden, { style: "brand" });
  results.push({
    check: "override PDF digital title",
    ok: pdfContains(overridePdf, CUSTOM_DIGITAL_TITLE),
    detail: CUSTOM_DIGITAL_TITLE,
  });
  results.push({
    check: "override PDF disclaimer",
    ok: pdfContains(overridePdf, CUSTOM_DISCLAIMER),
    detail: CUSTOM_DISCLAIMER,
  });

  const overridePptx = await buildPlannerReportPptx(overridden, { style: "brand" });
  results.push({
    check: "override PPTX digital title",
    ok: await pptxContains(overridePptx, CUSTOM_DIGITAL_TITLE),
    detail: CUSTOM_DIGITAL_TITLE,
  });
  results.push({
    check: "override PPTX insights disclaimer",
    ok: await pptxContains(overridePptx, CUSTOM_DISCLAIMER),
    detail: CUSTOM_DISCLAIMER,
  });
  const slideCount = await countPptxSlides(overridePptx);
  results.push({
    check: "PPTX single cover (no planner duplicate)",
    ok: slideCount >= 5 && !(await pptxContains(overridePptx, "CAMPAIGN PLANNER")),
    detail: `slides=${slideCount}`,
  });

  const report = buildCampaignBuilderExportPayload(
    { title: "report", payload: reportPayload },
    { digitalCatalog: [], oohCatalog: [] },
    "brand",
  ).payload;
  const reportLabels = report.kpis.map((k) => k.label);
  results.push({
    check: "report KPI labels",
    ok:
      reportLabels.includes("집행 캠페인") &&
      reportLabels.includes("실측 도달 합산") &&
      reportLabels.includes("실측 클릭 합산"),
    detail: reportLabels.join(", "),
  });

  console.log(JSON.stringify(results, null, 2));
  for (const r of results) assert.ok(r.ok, r.check);
  console.log("A-1 export verification OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
