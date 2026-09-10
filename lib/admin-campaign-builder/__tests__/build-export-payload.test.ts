import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildCampaignBuilderExportPayload,
  digitalLineToExportLine,
} from "@/lib/admin-campaign-builder/build-export-payload";
import {
  CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  type CampaignBuilderPayload,
} from "@/lib/admin-campaign-builder/schemas";
import type { PublicMediaView } from "@/lib/digital/public-media-types";

const sampleView = (slug: string): PublicMediaView => ({
  slug,
  nameKo: `상품 ${slug}`,
  nameEn: `Product ${slug}`,
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
});

const basePayload = (
  overrides: Partial<CampaignBuilderPayload> = {},
): CampaignBuilderPayload => ({
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "테스트 캠페인",
  digitalLines: [],
  oohLines: [],
  customLines: [],
  ...overrides,
});

describe("buildCampaignBuilderExportPayload", () => {
  it("maps digital, OOH, and custom lines into builder export payload", () => {
    const catalog = [sampleView("meta-a"), sampleView("naver-b")];
    const { payload, warnings } = buildCampaignBuilderExportPayload(
      {
        title: "믹스 리포트",
        payload: basePayload({
          digitalLines: [{ slug: "meta-a", budgetWon: 1_000_000 }],
          oohLines: [
            {
              mediaId: "ooh-1",
              name: "강남 빌보드",
              region: "서울",
              type: "static",
              priceWon: 2_000_000,
            },
          ],
          customLines: [
            {
              id: "c1",
              mediaName: "인플루언서 A",
              budgetWon: 500_000,
            },
          ],
        }),
      },
      { digitalCatalog: catalog, oohCatalog: [] },
      "brand",
    );

    assert.equal(payload.kind, "builder");
    assert.equal(warnings.length, 0);
    assert.equal(payload.builderSection?.digitalLines.length, 1);
    assert.equal(payload.builderSection?.oohLines.length, 1);
    assert.equal(payload.builderSection?.customLines.length, 1);
    assert.equal(payload.builderSection?.customLines[0]?.kind, "custom");
    assert.ok((payload.charts?.budgetSplit?.length ?? 0) >= 1);
    assert.ok(payload.kpis.length >= 2);
    assert.equal(payload.builderSection?.documentType, "proposal");
  });

  it("skips missing digital slugs and records warnings", () => {
    const { payload, warnings } = buildCampaignBuilderExportPayload(
      {
        title: "경고 테스트",
        payload: basePayload({
          digitalLines: [
            { slug: "missing-slug", budgetWon: 100_000 },
            { slug: "meta-a", budgetWon: 200_000 },
          ],
        }),
      },
      { digitalCatalog: [sampleView("meta-a")], oohCatalog: [] },
      "minimal",
    );

    assert.equal(payload.builderSection?.digitalLines.length, 1);
    assert.deepEqual(warnings, ['digital catalog miss: slug "missing-slug"']);
  });

  it("uses report document type copy via builderSection", () => {
    const { payload } = buildCampaignBuilderExportPayload(
      {
        title: "집행 리포트",
        payload: basePayload({ documentType: "report" }),
      },
      { digitalCatalog: [], oohCatalog: [] },
      "corporate",
    );

    assert.equal(payload.builderSection?.documentType, "report");
    assert.equal(
      payload.builderSection?.sectionCopy.titles.digital,
      "① 디지털 채널 (참고)",
    );
  });

  it("applies section copy overrides on export payload", () => {
    const { payload } = buildCampaignBuilderExportPayload(
      {
        title: "오버라이드",
        payload: basePayload({
          insightsOverride: {
            sectionTitles: { digital: "커스텀 디지털" },
            sectionNotices: { insightsHint: "커스텀 힌트" },
            disclaimer: "커스텀 disclaimer",
          },
        }),
      },
      { digitalCatalog: [sampleView("meta-a")], oohCatalog: [] },
      "minimal",
    );

    assert.equal(payload.builderSection?.sectionCopy.titles.digital, "커스텀 디지털");
    assert.equal(payload.builderSection?.sectionCopy.notices.insightsHint, "커스텀 힌트");
    assert.equal(payload.disclaimer, "커스텀 disclaimer");
  });

  it("applies KPI label override and hide on export payload", () => {
    const { payload } = buildCampaignBuilderExportPayload(
      {
        title: "KPI override",
        payload: basePayload({
          insightsOverride: {
            kpiCards: [
              { id: "totalBudget", labelOverride: "커스텀 예산 KPI" },
              { id: "activeChannels", hidden: true },
            ],
          },
        }),
      },
      { digitalCatalog: [sampleView("meta-a")], oohCatalog: [] },
      "minimal",
    );

    const labels = payload.kpis.map((k) => k.label);
    assert.ok(labels.includes("커스텀 예산 KPI"));
    assert.ok(!labels.includes("선택 채널"));
  });

  it("builds report KPI cards from custom line actuals", () => {
    const { payload } = buildCampaignBuilderExportPayload(
      {
        title: "실측 리포트",
        payload: basePayload({
          documentType: "report",
          customLines: [
            {
              id: "c1",
              mediaName: "네이버 GFA",
              budgetWon: 2_000_000,
              actualReach: 120_000,
              actualClicks: 3_400,
            },
          ],
        }),
      },
      { digitalCatalog: [], oohCatalog: [] },
      "minimal",
    );

    const labels = payload.kpis.map((k) => k.label);
    assert.ok(labels.includes("집행 캠페인"));
    assert.ok(labels.includes("실측 도달 합산"));
    assert.ok(labels.includes("실측 클릭 합산"));
  });
});

describe("digitalLineToExportLine", () => {
  it("produces PlannerExportOnlineLine with estimates when calculable", () => {
    const line = digitalLineToExportLine(
      { slug: "meta-a", budgetWon: 1_000_000 },
      sampleView("meta-a"),
      true,
    );
    assert.ok(line);
    assert.equal(line.slug, "meta-a");
    assert.equal(line.hasEstimate, true);
    assert.ok(line.reachLabel);
  });

  it("maps line note to export notes column", () => {
    const line = digitalLineToExportLine(
      { slug: "meta-a", budgetWon: 1_000_000, note: "  테스트 비고  " },
      sampleView("meta-a"),
      true,
    );
    assert.ok(line);
    assert.equal(line.notes, "테스트 비고");
  });

  it("leaves notes undefined when line note is empty", () => {
    const line = digitalLineToExportLine(
      { slug: "meta-a", budgetWon: 1_000_000, note: "   " },
      sampleView("meta-a"),
      true,
    );
    assert.ok(line);
    assert.equal(line.notes, undefined);
  });
});

describe("line notes in export payload", () => {
  it("maps OOH line note into media row notes", () => {
    const catalog = [sampleView("meta-a")];
    const { payload } = buildCampaignBuilderExportPayload(
      {
        title: "비고 테스트",
        payload: basePayload({
          oohLines: [
            {
              mediaId: "ooh-1",
              name: "강남 빌보드",
              region: "서울",
              type: "static",
              priceWon: 2_000_000,
              note: "OOH 비고",
            },
          ],
        }),
      },
      { digitalCatalog: catalog, oohCatalog: [] },
      "brand",
    );

    assert.equal(payload.builderSection?.oohLines[0]?.notes, "OOH 비고");
  });
});
