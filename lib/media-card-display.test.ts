import assert from "node:assert/strict";
import test from "node:test";
import {
  catalogItemToDisplayModel,
  formatBrowseCardPriceLabel,
  formatPlannerRecommendLine,
  priceLabelIncludesPeriodSuffix,
} from "./media-card-display.ts";
import { formatMediaPriceWithPeriodSuffix } from "./media-price-format.ts";
import type { HomeCatalogMediaItem } from "./media-catalog-types.ts";

/** 신세계 스퀘어형 — 일 단가 등록 */
const shinsegaeDay: HomeCatalogMediaItem = {
  id: "shinsegae-square",
  name: "신세계백화점 본점 신세계 스퀘어 전광판 광고",
  price: 22_000_000,
  pricePeriod: "day",
  type: "dooh",
  region: "서울",
  catalogChannel: "offline",
};

/** 광화문 루미형 — 월 단가 등록 */
const gwanghwamunLumi: HomeCatalogMediaItem = {
  id: "gwanghwamun-lumi",
  name: "광화문 루미 미디어 전광판 광고",
  price: 50_000_000,
  pricePeriod: "month",
  type: "dooh",
  region: "서울",
  catalogChannel: "offline",
};

test("priceLabelIncludesPeriodSuffix detects embedded /일·/월", () => {
  assert.equal(priceLabelIncludesPeriodSuffix("₩2,200만/일", "일"), true);
  assert.equal(priceLabelIncludesPeriodSuffix("₩5,000만/월", "월"), true);
  assert.equal(priceLabelIncludesPeriodSuffix("₩2,200만", "일"), false);
  assert.equal(priceLabelIncludesPeriodSuffix("₩5,000만", "월"), false);
});

test("catalog tile model: day-rate media exposes /일 suffix (no parent label)", () => {
  const model = catalogItemToDisplayModel(shinsegaeDay, {
    href: `/media/${shinsegaeDay.id}`,
    isKo: true,
  });
  assert.equal(model.priceLabel, "₩2,200만");
  assert.equal(model.periodLabel, "일");
  assert.equal(model.showPeriodSuffix, true);
  assert.equal(`${model.priceLabel}/${model.periodLabel}`, "₩2,200만/일");
});

test("catalog tile model: month-rate media exposes /월 suffix (no parent label)", () => {
  const model = catalogItemToDisplayModel(gwanghwamunLumi, {
    href: `/media/${gwanghwamunLumi.id}`,
    isKo: true,
  });
  assert.equal(model.priceLabel, "₩5,000만");
  assert.equal(model.periodLabel, "월");
  assert.equal(model.showPeriodSuffix, true);
  assert.equal(`${model.priceLabel}/${model.periodLabel}`, "₩5,000만/월");
});

test("catalog tile model: bare parent priceLabel still gets period suffix", () => {
  const model = catalogItemToDisplayModel(shinsegaeDay, {
    href: `/media/${shinsegaeDay.id}`,
    isKo: true,
    priceLabel: "₩2,200만",
  });
  assert.equal(model.priceLabel, "₩2,200만");
  assert.equal(model.showPeriodSuffix, true);
  assert.equal(model.periodLabel, "일");
});

test("catalog tile model: parent label with /일 does not double the suffix", () => {
  const withPeriod = formatMediaPriceWithPeriodSuffix(
    shinsegaeDay.price!,
    shinsegaeDay.pricePeriod,
    "ko-KR",
  );
  const model = catalogItemToDisplayModel(shinsegaeDay, {
    href: `/media/${shinsegaeDay.id}`,
    isKo: true,
    priceLabel: withPeriod,
  });
  assert.equal(model.priceLabel, "₩2,200만/일");
  assert.equal(model.showPeriodSuffix, false);
});

test("formatBrowseCardPriceLabel — online inquiry rows stay 가격 문의", () => {
  assert.equal(
    formatBrowseCardPriceLabel(
      {
        catalogChannel: "online",
        type: null,
        price: null,
      },
      "ko-KR",
    ),
    "가격 문의",
  );
  assert.equal(
    formatBrowseCardPriceLabel(
      {
        catalogChannel: "online",
        type: null,
        price: null,
        onlineSpec: {
          minBudget: 800_000,
          cpcMin: null,
          cpcMax: null,
          cpmMin: null,
          cpmMax: null,
          platform: "Naver GFA",
        },
      },
      "ko-KR",
    ),
    "가격 문의",
  );
});

test("formatBrowseCardPriceLabel — online calculable shows seeded CPC/CPM range", () => {
  assert.equal(
    formatBrowseCardPriceLabel(
      {
        catalogChannel: "online",
        type: null,
        price: null,
        onlineSpec: {
          minBudget: 800_000,
          cpcMin: 200,
          cpcMax: 600,
          cpmMin: 4000,
          cpmMax: 8000,
          platform: "Meta Instagram",
        },
      },
      "ko-KR",
    ),
    "CPC 200~600원 · CPM 4,000~8,000원",
  );
  assert.equal(
    formatBrowseCardPriceLabel(
      {
        catalogChannel: "online",
        type: null,
        price: null,
        onlineSpec: {
          minBudget: 800_000,
          cpcMin: null,
          cpcMax: null,
          cpmMin: 3000,
          cpmMax: 7000,
          platform: "Meta Facebook",
        },
      },
      "ko-KR",
    ),
    "CPM 3,000~7,000원",
  );
});

test("formatBrowseCardPriceLabel — offline zero price is inquiry (pre-existing bug fix)", () => {
  assert.equal(
    formatBrowseCardPriceLabel(
      {
        catalogChannel: "offline",
        type: "dooh",
        price: 0,
        pricePeriod: "month",
      },
      "ko-KR",
    ),
    "가격 문의",
  );
});

test("catalogItemToDisplayModel — 플래너 컨텍스트 없으면 새 필드는 전부 undefined(일반 카드 영향 없음)", () => {
  const model = catalogItemToDisplayModel(shinsegaeDay, { href: "/x", isKo: true });
  assert.equal(model.recommendedBudgetPct, undefined);
  assert.equal(model.estimatedMetricMin, undefined);
  assert.equal(model.estimatedMetricMax, undefined);
  assert.equal(model.metricType, undefined);
  assert.equal(model.excludedForBudgetReason, undefined);
});

test("catalogItemToDisplayModel — 플래너 컨텍스트가 있으면 그대로 모델에 실린다", () => {
  const model = catalogItemToDisplayModel(shinsegaeDay, {
    href: "/x",
    isKo: true,
    recommendedBudgetPct: 32,
    estimatedMetricMin: 150_000,
    estimatedMetricMax: 250_000,
    metricType: "impressions",
  });
  assert.equal(model.recommendedBudgetPct, 32);
  assert.equal(model.estimatedMetricMin, 150_000);
  assert.equal(model.estimatedMetricMax, 250_000);
  assert.equal(model.metricType, "impressions");
});

test("formatPlannerRecommendLine — 추천 비중 없으면 null(일반 카드는 라인 자체가 안 뜸)", () => {
  assert.equal(formatPlannerRecommendLine({}, true), null);
});

test("formatPlannerRecommendLine — 비중만 있으면 비중만, 예상 지표까지 있으면 함께 표시", () => {
  assert.equal(
    formatPlannerRecommendLine({ recommendedBudgetPct: 32 }, true),
    "추천 비중 32%",
  );
  assert.equal(
    formatPlannerRecommendLine(
      {
        recommendedBudgetPct: 32,
        estimatedMetricMin: 150_000,
        estimatedMetricMax: 250_000,
        metricType: "impressions",
      },
      true,
    ),
    "추천 비중 32% · 예상 노출 150,000~250,000",
  );
  assert.equal(
    formatPlannerRecommendLine(
      {
        recommendedBudgetPct: 50,
        estimatedMetricMin: 500,
        estimatedMetricMax: 900,
        metricType: "clicks",
      },
      false,
    ),
    "Recommended share 50% · Est. clicks 500~900",
  );
});

test("formatPlannerRecommendLine — 단가 정보 없어 0~0인 채널은 지표 구간을 생략(OnlineChannelCard와 동일 규칙)", () => {
  assert.equal(
    formatPlannerRecommendLine(
      {
        recommendedBudgetPct: 14,
        estimatedMetricMin: 0,
        estimatedMetricMax: 0,
        metricType: "impressions",
      },
      true,
    ),
    "추천 비중 14%",
  );
});
