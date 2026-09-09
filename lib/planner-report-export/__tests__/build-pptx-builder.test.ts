import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildCampaignBuilderExportPayload } from "@/lib/admin-campaign-builder/build-export-payload";
import {
  CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  type CampaignBuilderPayload,
} from "@/lib/admin-campaign-builder/schemas";
import { buildPlannerReportPptx } from "@/lib/planner-report-export/build-pptx";
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
  title: "빌더 PPTX 테스트",
  digitalLines: [{ slug: "meta-test", budgetWon: 1_000_000 }],
  oohLines: [],
  customLines: [],
};

describe("buildPlannerReportPptx builder kind", () => {
  it("produces valid PPTX bytes for builder payload", async () => {
    const { payload: exportPayload } = buildCampaignBuilderExportPayload(
      { title: "빌더 PPTX", payload },
      { digitalCatalog: [view], oohCatalog: [] },
      "brand",
    );
    assert.equal(exportPayload.kind, "builder");

    const bytes = await buildPlannerReportPptx(exportPayload, { style: "brand" });
    assert.ok(bytes.length > 1000);
    assert.equal(bytes[0], 0x50);
    assert.equal(bytes[1], 0x4b);
  });
});
