import assert from "node:assert/strict";
import test from "node:test";
import { calcCPM, isCpmInRange, publicCpmWon, setCpmAnomalyReporter } from "../cpm";
import { busDailyTrafficPerVehicle, resolveSovShare } from "../impressions";
import { classifyMedia, defaultContactRate } from "../classify";
import { buildQuoteParams } from "../quote-params";
import type { CpmAnomaly } from "../cpm";
import type { PriceOption } from "../types";

const MCITY_PRICES: PriceOption[] = [
  { days: 7, price: 25_000_000, id: "po-7" },
  { days: 15, price: 45_000_000, id: "po-15" },
  { days: 30, price: 70_000_000, id: "po-30" },
];

test("인수조건: 버스 외부 1대 30일 CPM 이 bus_exterior 정상 범위(1,500~12,000) 안", () => {
  const cls = classifyMedia({ mainCategory: "transit", subCategory: "bus_exterior" });
  assert.equal(cls, "bus_exterior");

  const result = calcCPM({
    mediaId: "bus-seoul-a",
    mediaClass: cls,
    priceOptions: [{ days: 30, price: 800_000, id: "po-30" }],
    days: 30,
    dailyTraffic: busDailyTrafficPerVehicle(),
    contactRate: defaultContactRate(cls),
    sovShare: resolveSovShare({ isStatic: true }),
    units: 1,
  });

  assert.equal(result.impressions, 189_000);
  assert.equal(result.warning, undefined);
  assert.equal(result.displayable, true);
  const cpm = publicCpmWon(result);
  assert.ok(cpm != null);
  assert.ok(cpm >= 1_500 && cpm <= 12_000, `cpm=${cpm}`);
  // 진단서 검산값 ₩4,233
  assert.ok(Math.abs(cpm - 4_233) <= 2, `cpm=${cpm}`);
});

test("D-02 재현: 전 노선 노출을 1대 가격으로 나누면 CPM ₩32 — 범위 이탈로 차단된다", () => {
  const result = calcCPM({
    mediaId: "bus-seoul-a",
    mediaClass: "bus_exterior",
    priceOptions: [{ days: 30, price: 800_000 }],
    days: 30,
    // 서울 인구 940만 × 4회 노출이라는 현재 프로덕션 수치를 재현
    dailyTraffic: 38_000_000 / 30,
    contactRate: 1,
    sovShare: 1,
    units: 1,
  });

  assert.equal(result.warning, "OUT_OF_RANGE");
  assert.ok(result.value != null && result.value < 100);
  // 광고주 대면 화면에는 숫자를 내보내지 않는다
  assert.equal(result.displayable, false);
  assert.equal(publicCpmWon(result), null);
});

test("범위 이탈 시 anomaly reporter 가 호출된다", () => {
  const seen: CpmAnomaly[] = [];
  setCpmAnomalyReporter((a) => seen.push(a));
  try {
    calcCPM({
      mediaId: "bus-seoul-a",
      mediaClass: "bus_exterior",
      priceOptions: [{ days: 30, price: 800_000 }],
      days: 30,
      dailyTraffic: 38_000_000 / 30,
      contactRate: 1,
      sovShare: 1,
      units: 1,
    });
  } finally {
    setCpmAnomalyReporter(() => {});
  }
  assert.equal(seen.length, 1);
  assert.equal(seen[0].mediaId, "bus-seoul-a");
  assert.deepEqual(seen[0].expected, [1_500, 12_000]);
});

test("D-01/D-04: M-CITY 7일 — SOV 적용 후 CPM 이 범위를 이탈해 수기 검토 대상이 된다", () => {
  const result = calcCPM({
    mediaId: "m-city",
    mediaClass: "dooh_large",
    priceOptions: MCITY_PRICES,
    days: 7,
    dailyTraffic: 160_000,
    contactRate: 0.458,
    sovShare: resolveSovShare({ spotDuration: 15, loopDuration: 300 }),
    units: 1,
  });

  // 진단서 §5 경고: SOV 적용 후 오히려 범위를 벗어나는 매체가 나온다.
  // 이런 건은 자동 반영이 아니라 수기 검토 목록으로 빠져야 한다.
  assert.equal(result.warning, "OUT_OF_RANGE");
  assert.equal(result.displayable, false);
  assert.equal(result.priceBasis, "exact");
  assert.equal(result.priceWon, 25_000_000);
});

test("D-03: 같은 매체·같은 기간이면 어느 호출부에서든 동일한 CPM", () => {
  const cls = classifyMedia({ mainCategory: "transit", subCategory: "bus_exterior" });
  const input = {
    mediaId: "bus-seoul-a",
    mediaClass: cls,
    priceOptions: [{ days: 30, price: 800_000 }],
    days: 30,
    dailyTraffic: busDailyTrafficPerVehicle(),
    contactRate: defaultContactRate(cls),
    sovShare: resolveSovShare({ isStatic: true }),
    units: 1,
  };
  const a = calcCPM(input);
  const b = calcCPM({ ...input });
  assert.equal(a.value, b.value);
  assert.equal(a.impressions, b.impressions);
  assert.ok(a.displayable);
});

test("D-05: 같은 매체라도 기간이 다르면 CPM 은 달라진다 — 기간을 명시하지 않은 CPM 은 무의미", () => {
  const base = {
    mediaId: "m-city",
    mediaClass: "dooh_large" as const,
    priceOptions: MCITY_PRICES,
    dailyTraffic: 160_000,
    contactRate: 0.458,
    sovShare: resolveSovShare({ spotDuration: 15, loopDuration: 300 }),
    units: 1,
  };
  const week = calcCPM({ ...base, days: 7 });
  const month = calcCPM({ ...base, days: 30 });

  assert.ok(week.value != null && month.value != null);
  // 장기 상품 할인 → 월 CPM 이 주 CPM 보다 싸야 한다
  assert.ok(month.value < week.value, `week=${week.value} month=${month.value}`);
  assert.equal(month.priceWon, 70_000_000);
});

test("노출 1,000회 미만이면 CPM 을 계산하지 않는다", () => {
  const r = calcCPM({
    mediaId: "tiny",
    mediaClass: "dooh_mid",
    priceOptions: [{ days: 30, price: 1_000_000 }],
    days: 30,
    dailyTraffic: 10,
    contactRate: 0.2,
    sovShare: 0.05,
    units: 1,
  });
  assert.equal(r.value, null);
  assert.equal(r.reason, "INSUFFICIENT_IMPRESSIONS");
  assert.equal(r.displayable, false);
});

test("가격 정보가 없으면 NO_PRICE", () => {
  const r = calcCPM({
    mediaId: "no-price",
    mediaClass: "dooh_mid",
    priceOptions: [],
    days: 30,
    dailyTraffic: 80_000,
    contactRate: 0.2,
    sovShare: 0.05,
    units: 1,
  });
  assert.equal(r.value, null);
  assert.equal(r.reason, "NO_PRICE");
});

test("isCpmInRange — 경계값 포함", () => {
  assert.equal(isCpmInRange(1_500, "bus_exterior"), true);
  assert.equal(isCpmInRange(12_000, "bus_exterior"), true);
  assert.equal(isCpmInRange(1_499, "bus_exterior"), false);
  assert.equal(isCpmInRange(12_001, "bus_exterior"), false);
});

test("D-06: 7일 상품 조회 시 period=1day 가 아니라 7days 와 days=7 이 전달된다", () => {
  const params = buildQuoteParams({
    mediaId: "m-city",
    priceOptions: MCITY_PRICES,
    days: 7,
  });
  assert.ok(params);
  assert.equal(params.days, 7);
  assert.equal(params.period, "7days");
  assert.notEqual(params.period, "1day");
  assert.equal(params.optionId, "po-7");
  assert.equal(params.priceWon, 25_000_000);
  assert.equal(params.isEstimate, false);
});

test("D-06: 상품에 없는 기간은 period 키를 임의로 붙이지 않는다", () => {
  const params = buildQuoteParams({
    mediaId: "m-city",
    priceOptions: MCITY_PRICES,
    days: 14,
  });
  assert.ok(params);
  assert.equal(params.days, 14);
  assert.equal(params.period, undefined);
  assert.equal(params.optionId, undefined);
  assert.equal(params.isEstimate, true);
});
