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

async function countPptxSlides(bytes: Uint8Array): Promise<number> {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(bytes);
  const rels = await zip.file("ppt/presentation.xml")?.async("string");
  if (!rels) return 0;
  return (rels.match(/<p:sldId /g) ?? []).length;
}

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

  it("renders a single builder cover slide (no planner cover duplicate)", async () => {
    const { payload: exportPayload } = buildCampaignBuilderExportPayload(
      { title: "표지 1장", payload },
      { digitalCatalog: [view], oohCatalog: [] },
      "brand",
    );
    const bytes = await buildPlannerReportPptx(exportPayload, { style: "brand" });
    const slideCount = await countPptxSlides(bytes);
    // cover + KPI + digital + donut + insights + footer disclaimer
    assert.equal(slideCount, 6);

    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(bytes);
    const slideXml = await Promise.all(
      Object.keys(zip.files)
        .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
        .map((name) => zip.file(name)!.async("string")),
    );
    const joined = slideXml.join("\n");
    assert.ok(joined.includes("CAMPAIGN BUILDER"));
    assert.equal((joined.match(/CAMPAIGN PLANNER/g) ?? []).length, 0);
  });

  it("includes overridden section title text in PPTX XML", async () => {
    const { payload: exportPayload } = buildCampaignBuilderExportPayload(
      {
        title: "섹션 오버라이드",
        payload: {
          ...payload,
          insightsOverride: {
            sectionTitles: { digital: "커스텀 디지털 PPTX" },
            disclaimer: "PPTX disclaimer 본문",
          },
        },
      },
      { digitalCatalog: [view], oohCatalog: [] },
      "brand",
    );
    const bytes = await buildPlannerReportPptx(exportPayload, { style: "brand" });
    const { default: JSZip } = await import("jszip");
    const zip = await JSZip.loadAsync(bytes);
    const slide1 = await zip.file("ppt/slides/slide3.xml")?.async("string");
    assert.ok(slide1?.includes("커스텀 디지털 PPTX"));
    const xmlParts = await Promise.all(
      Object.keys(zip.files)
        .filter((name) => name.startsWith("ppt/slides/slide") && name.endsWith(".xml"))
        .map((name) => zip.file(name)!.async("string")),
    );
    assert.ok(xmlParts.some((xml) => xml.includes("PPTX disclaimer 본문")));
  });
});
