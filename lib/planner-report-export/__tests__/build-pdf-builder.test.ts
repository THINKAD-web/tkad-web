import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCampaignBuilderExportPayload } from "@/lib/admin-campaign-builder/build-export-payload";
import {
  CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  type CampaignBuilderPayload,
} from "@/lib/admin-campaign-builder/schemas";
import { buildPlannerReportPdf } from "@/lib/planner-report-export/build-pdf";
import type { PublicMediaView } from "@/lib/digital/public-media-types";

const view: PublicMediaView = {
  slug: "meta-test",
  nameKo: "메타 테스트",
  nameEn: "Meta Test",
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

const payload: CampaignBuilderPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "빌더 PDF 테스트",
  digitalLines: [{ slug: "meta-test", budgetWon: 1_000_000 }],
  oohLines: [],
  customLines: [],
};

describe("buildPlannerReportPdf builder kind", () => {
  it("produces valid PDF bytes for builder payload", async () => {
    const { payload: exportPayload } = buildCampaignBuilderExportPayload(
      { title: "빌더 PDF", payload },
      { digitalCatalog: [view], oohCatalog: [] },
      "brand",
    );
    assert.equal(exportPayload.kind, "builder");

    const bytes = await buildPlannerReportPdf(exportPayload, { style: "brand" });
    assert.ok(bytes.length > 1000);
    assert.equal(String.fromCharCode(...bytes.slice(0, 4)), "%PDF");
  });

  it("builds PDF when export payload includes line notes and insight subtitles", async () => {
    const { payload: exportPayload } = buildCampaignBuilderExportPayload(
      {
        title: "빌더 PDF 비고",
        payload: {
          ...payload,
          digitalLines: [
            { slug: "meta-test", budgetWon: 1_000_000, note: "PDF 디지털 비고" },
          ],
          oohLines: [
            {
              mediaId: "ooh-1",
              name: "OOH 테스트",
              region: "서울",
              type: "static",
              priceWon: 2_000_000,
              note: "PDF OOH 비고",
            },
          ],
          insightsOverride: {
            insightSubtitles: {
              pacing: "PDF 커스텀 페이스",
              creative: "PDF 커스텀 소재",
              operational: "PDF 커스텀 운영",
            },
          },
        },
      },
      { digitalCatalog: [view], oohCatalog: [] },
      "brand",
    );

    assert.equal(
      exportPayload.builderSection?.digitalLines[0]?.notes,
      "PDF 디지털 비고",
    );
    assert.equal(
      exportPayload.builderSection?.oohLines[0]?.notes,
      "PDF OOH 비고",
    );
    assert.equal(
      exportPayload.builderSection?.sectionCopy.insightSubtitles.pacing,
      "PDF 커스텀 페이스",
    );

    const bytes = await buildPlannerReportPdf(exportPayload, { style: "brand" });
    assert.ok(bytes.length > 1000);
  });
});
