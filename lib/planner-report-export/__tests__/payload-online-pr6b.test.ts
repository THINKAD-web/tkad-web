import assert from "node:assert/strict";
import test from "node:test";
import type { MediaItem } from "@/lib/media-data";
import type { PlanCartItem } from "@/lib/plan-cart";
import { splitPortfolioByCatalogChannel } from "@/lib/plan-cart-report/split-portfolio-by-channel";
import { buildReportPayload } from "@/lib/planner-report-export/build-report-payload";
import { onlineConsultationLineNotice } from "@/lib/planner-report-export/online-consultation-notice";

const oohMedia: MediaItem = {
  id: "ooh-1",
  name: "OOH 테스트",
  nameEn: "OOH Test",
  type: "dooh",
  catalogChannel: "offline",
  location: "서울",
  locationEn: "Seoul",
  region: "seoul",
  regionMain: "seoul",
  price: 500,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 1000,
  sampleImages: [],
};

const calculableOnline: MediaItem = {
  id: "online-calc",
  slug: "kakao-traffic",
  name: "카카오 트래픽",
  nameEn: "Kakao Traffic",
  type: "online",
  catalogChannel: "online",
  location: "",
  locationEn: "",
  region: "other",
  price: 0,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 0,
  sampleImages: [],
  onlineSpec: {
    platform: "Kakao",
    cpcMin: 150,
    cpcMax: 450,
    cpmMin: 2500,
    cpmMax: 5500,
    minBudget: 1_000_000,
  },
};

const inquiryOnline: MediaItem = {
  id: "online-inq",
  slug: "karrot-local-traffic",
  name: "당근 지역 트래픽",
  nameEn: "Karrot Local",
  type: "online",
  catalogChannel: "online",
  location: "",
  locationEn: "",
  region: "other",
  price: 0,
  lat: 0,
  lng: 0,
  dailyFootTraffic: 0,
  sampleImages: [],
  onlineSpec: {
    platform: "Karrot (당근)",
  },
};

const baseArgs = {
  isKo: true,
  goalTitle: "브랜드 인지도",
  budgetMan: 3000,
  periodDisplay: "1개월",
  regionsText: "서울",
  categoriesText: "혼합",
  ageText: "전 연령",
  industryText: "F&B",
  metrics: null,
  blendedCpmKrw: null,
  budgetAllocation: [],
  cpmBars: [],
  effectSummaryLines: [],
  generatedAt: "2026-09-04",
  months: 1,
};

test("splitPortfolioByCatalogChannel — onlyOnline / onlyOoh / mixed", () => {
  assert.deepEqual(
    splitPortfolioByCatalogChannel([oohMedia]).composition,
    "onlyOoh",
  );
  assert.deepEqual(
    splitPortfolioByCatalogChannel([calculableOnline]).composition,
    "onlyOnline",
  );
  const mixed = splitPortfolioByCatalogChannel([
    oohMedia,
    calculableOnline,
    inquiryOnline,
  ]);
  assert.equal(mixed.composition, "mixed");
  assert.equal(mixed.oohPortfolio.length, 1);
  assert.equal(mixed.onlinePortfolio.length, 2);
});

test("onlineConsultationLineNotice — dmpilot parity", () => {
  assert.equal(onlineConsultationLineNotice(0, true), null);
  assert.equal(
    onlineConsultationLineNotice(2, true),
    "2개 상품은 별도 협의 필요",
  );
});

test("buildReportPayload — onlyOnline skips OOH impression KPI vocabulary", () => {
  const cartItems: PlanCartItem[] = [
    {
      mediaId: calculableOnline.id,
      mediaName: calculableOnline.name,
      mediaType: "online",
      catalogChannel: "online",
      lineTotalWon: 2_000_000,
      region: "",
      price: 0,
      addedFrom: "search",
      addedAt: 1,
    },
  ];
  const payload = buildReportPayload({
    ...baseArgs,
    portfolio: [calculableOnline],
    planCartItems: cartItems,
  });
  assert.equal(payload.reportComposition, "onlyOnline");
  assert.ok(payload.onlineSection);
  assert.equal(payload.onlineSection!.lines.length, 1);
  assert.ok(payload.kpis.some((k) => k.label.includes("예상 도달")));
  assert.ok(!payload.kpis.some((k) => k.label.includes("유동")));
});

test("buildReportPayload — mixed attaches onlineSection + keeps OOH portfolio", () => {
  const payload = buildReportPayload({
    ...baseArgs,
    portfolio: [oohMedia, inquiryOnline],
    planCartItems: [
      {
        mediaId: oohMedia.id,
        mediaName: oohMedia.name,
        mediaType: "dooh",
        catalogChannel: "offline",
        region: "seoul",
        price: 500,
        addedFrom: "search",
        addedAt: 1,
      },
      {
        mediaId: inquiryOnline.id,
        mediaName: inquiryOnline.name,
        mediaType: "online",
        catalogChannel: "online",
        region: "",
        price: 0,
        addedFrom: "search",
        addedAt: 2,
      },
    ],
  });
  assert.equal(payload.reportComposition, "mixed");
  assert.equal(payload.portfolio.length, 1);
  assert.equal(payload.onlineSection?.inquiryLineCount, 1);
  assert.equal(
    payload.onlineSection?.consultationNotice,
    "1개 상품은 별도 협의 필요",
  );
});
