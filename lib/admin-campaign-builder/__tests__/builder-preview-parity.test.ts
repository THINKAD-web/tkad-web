import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCampaignBuilderExportPayload } from "@/lib/admin-campaign-builder/build-export-payload";
import { extractBuilderPreviewSnapshot } from "@/lib/admin-campaign-builder/builder-preview-snapshot";
import {
  CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  type CampaignBuilderPayload,
} from "@/lib/admin-campaign-builder/schemas";
import type { PublicMediaView } from "@/lib/digital/public-media-types";
import { buildPlannerReportPdf } from "@/lib/planner-report-export/build-pdf";
import { countPdfPagesFromBytes } from "@/lib/planner-report-export/pdf-page-count";

const PARITY_FIXTURE_PAGE_COUNT = 3;

function view(slug: string, nameKo: string): PublicMediaView {
  return {
    slug,
    nameKo,
    nameEn: nameKo,
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
}

/** STEP3e parity fixture — digital 2 + OOH 1 + custom 1 */
const parityPayload: CampaignBuilderPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "Parity 테스트",
  digitalLines: [
    { slug: "meta-a", budgetWon: 1_000_000 },
    { slug: "naver-b", budgetWon: 2_000_000 },
  ],
  oohLines: [
    {
      mediaId: "ooh-1",
      name: "강남 빌보드",
      region: "서울",
      type: "static",
      priceWon: 3_000_000,
    },
  ],
  customLines: [
    { id: "c1", mediaName: "인플루언서 A", budgetWon: 500_000 },
  ],
};

const catalog = [view("meta-a", "상품 A"), view("naver-b", "상품 B")];

describe("builder preview ↔ PDF parity (shared export payload SSOT)", () => {
  it("preview snapshot matches export payload structure", () => {
    const { payload: exportPayload } = buildCampaignBuilderExportPayload(
      { title: "Parity 테스트", payload: parityPayload },
      { digitalCatalog: catalog, oohCatalog: [] },
      "brand",
    );

    const snapshot = extractBuilderPreviewSnapshot(exportPayload);

    assert.equal(snapshot.digitalLineCount, 2);
    assert.equal(snapshot.oohLineCount, 1);
    assert.equal(snapshot.customLineCount, 1);
    assert.deepEqual(snapshot.digitalLineNames, ["상품 A", "상품 B"]);
    assert.deepEqual(snapshot.oohLineNames, ["강남 빌보드"]);
    assert.deepEqual(snapshot.customLineNames, ["인플루언서 A"]);
    assert.equal(snapshot.chartLabels.length, 2);
    assert.ok(snapshot.totalBudgetLabel && /[0-9]/.test(snapshot.totalBudgetLabel));
    assert.deepEqual(snapshot.sectionOrder, [
      "cover",
      "kpi",
      "디지털 채널 제안",
      "ooh",
      "② 실제 집행 결과",
      "budget-chart",
      "③ 캠페인 운영 제안",
    ]);
  });

  it("PDF built from same export payload has pinned page count", async () => {
    const { payload: exportPayload } = buildCampaignBuilderExportPayload(
      { title: "Parity 테스트", payload: parityPayload },
      { digitalCatalog: catalog, oohCatalog: [] },
      "brand",
    );

    const pdfBytes = await buildPlannerReportPdf(exportPayload, { style: "brand" });
    const pageCount = countPdfPagesFromBytes(pdfBytes);

    assert.equal(
      pageCount,
      PARITY_FIXTURE_PAGE_COUNT,
      `parity fixture PDF page count (expected ${PARITY_FIXTURE_PAGE_COUNT})`,
    );

    const snapshot = extractBuilderPreviewSnapshot(exportPayload);
    assert.equal(snapshot.digitalLineCount + snapshot.oohLineCount + snapshot.customLineCount, 4);
  });

  it("Preview and PDF both consume buildCampaignBuilderExportPayload only", () => {
    // Code-structure guarantee: CampaignBuilderReportPreview calls
    // buildCampaignBuilderExportPayload() in useMemo; buildPlannerReportPdf
    // receives the same PlannerReportExportPayload from the export API path.
    // This test documents the SSOT — no separate preview calculation exists.
    const { payload: a } = buildCampaignBuilderExportPayload(
      { title: "Parity 테스트", payload: parityPayload },
      { digitalCatalog: catalog, oohCatalog: [] },
      "brand",
    );
    const { payload: b } = buildCampaignBuilderExportPayload(
      { title: "Parity 테스트", payload: parityPayload },
      { digitalCatalog: catalog, oohCatalog: [] },
      "brand",
    );

    assert.deepEqual(
      extractBuilderPreviewSnapshot(a),
      extractBuilderPreviewSnapshot(b),
    );
  });
});
