import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { buildCampaignBuilderExportPayload } from "@/lib/admin-campaign-builder/build-export-payload";
import {
  CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  type CampaignBuilderPayload,
} from "@/lib/admin-campaign-builder/schemas";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import { buildPlannerReportPdf } from "@/lib/planner-report-export/build-pdf";
import { countPdfPagesFromBytes } from "@/lib/planner-report-export/pdf-page-count";
import { buildOohReportPayload } from "@/lib/planner-report-export/payload-ooh";
import type { PlannerReportStyle } from "@/lib/planner-report-export/document-theme";
import {
  buildScenarioArgs,
  SNAPSHOT_SCENARIOS,
} from "@/lib/planner-report-export/__tests__/payload-snapshot-scenarios";

/** Baseline pinned at STEP3d — regressions fail CI without manual diff. */
const OOH_KOREA_CAMPAIGN_21D_PAGE_COUNT = 5;
const BUILDER_PDF_PAGE_COUNT = 3;

const builderView: PublicMediaView = {
  slug: "meta-regression",
  nameKo: "회귀 테스트",
  nameEn: "Regression Test",
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

const builderPayload: CampaignBuilderPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "회귀 테스트",
  digitalLines: [{ slug: "meta-regression", budgetWon: 1_000_000 }],
  oohLines: [],
  customLines: [],
};

test("buildPlannerReportPdf — korea-campaign-21d produces valid PDF bytes", async () => {
  const scenario = SNAPSHOT_SCENARIOS[0]!;
  assert.equal(scenario.id, "korea-campaign-21d");

  const payload = buildOohReportPayload(buildScenarioArgs(scenario));
  const pdfBytes = await buildPlannerReportPdf(payload, {});

  assert.ok(pdfBytes.length > 1000, `expected substantial PDF, got ${pdfBytes.length} bytes`);

  const magic = String.fromCharCode(...pdfBytes.slice(0, 4));
  assert.equal(magic, "%PDF", `expected PDF magic header, got ${JSON.stringify(magic)}`);

  const pageCount = countPdfPagesFromBytes(pdfBytes);
  assert.equal(
    pageCount,
    OOH_KOREA_CAMPAIGN_21D_PAGE_COUNT,
    `OOH korea-campaign-21d page count regression (expected ${OOH_KOREA_CAMPAIGN_21D_PAGE_COUNT}, got ${pageCount})`,
  );

  // jsPDF embeds non-deterministic metadata — hash is recorded for manual diff only.
  const hash = createHash("sha256").update(pdfBytes).digest("hex");
  assert.match(hash, /^[0-9a-f]{64}$/);
});

test("buildPlannerReportPdf — builder kind page count pinned for all styles", async () => {
  for (const style of ["minimal", "brand", "corporate"] as PlannerReportStyle[]) {
    const { payload } = buildCampaignBuilderExportPayload(
      { title: "Builder regression", payload: builderPayload },
      { digitalCatalog: [builderView], oohCatalog: [] },
      style,
    );
    assert.equal(payload.kind, "builder");

    const pdfBytes = await buildPlannerReportPdf(payload, { style });
    const pageCount = countPdfPagesFromBytes(pdfBytes);
    assert.equal(
      pageCount,
      BUILDER_PDF_PAGE_COUNT,
      `builder PDF (${style}) page count regression (expected ${BUILDER_PDF_PAGE_COUNT}, got ${pageCount})`,
    );
  }
});
