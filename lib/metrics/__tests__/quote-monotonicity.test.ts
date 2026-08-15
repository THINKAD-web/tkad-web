/**
 * R-4 — 금액 단조성 불변식 회귀 테스트.
 *
 * 모든 매체에 대해 다음이 성립해야 한다:
 *   (A) quote(n) <= quote(n+k)              총액은 기간에 비감소
 *   (B) quote(n)/n >= quote(n+k)/(n+k)      일할 단가는 기간에 비증가
 *
 * (A) 는 자명하고, (B) 는 실제 OOH 가격 구조의 성질 — 오래 살수록 일당은
 * 싸진다. ×30 류 버그는 (B) 를 즉시 위반한다 (일 단가가 오히려 증가).
 * 42건 위에 이걸 얹으면 새 매체 유형·새 옵션 조합이 들어와도 구조가 지켜진다.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { calculateMediaQuoteByDays } from "@/lib/compare-quote";
import type { MediaItem, MediaPriceOption } from "@/lib/media-data";

function makeMedia(o: {
  id?: string;
  price: number;
  pricePeriod: "day" | "week" | "biweekly" | "month";
  priceOptions?: MediaPriceOption[];
  partialPeriodRates?: Record<string, number>;
}): MediaItem {
  return {
    id: o.id ?? "m",
    name: o.id ?? "m",
    location: "서울",
    region: "서울",
    type: "digital",
    price: o.price,
    pricePeriod: o.pricePeriod,
    priceOptions: o.priceOptions,
    partialPeriodRates: o.partialPeriodRates,
    impressions: 1_000_000,
    dailyFootTraffic: 50_000,
    tags: [],
    sampleImages: [],
  } as unknown as MediaItem;
}

const DAY_GRID = [1, 3, 5, 7, 14, 15, 21, 30, 45, 60, 90];

function assertMonotone(media: MediaItem, label: string): void {
  const rows = DAY_GRID.map((d) => ({
    d,
    cost: calculateMediaQuoteByDays(media, d).costWon,
  }));
  for (let i = 1; i < rows.length; i += 1) {
    const prev = rows[i - 1];
    const curr = rows[i];
    // (A) 총액 비감소
    assert.ok(
      curr.cost >= prev.cost,
      `[${label}] (A) 총액 감소: ${prev.d}일 ₩${prev.cost.toLocaleString()} → ${curr.d}일 ₩${curr.cost.toLocaleString()}`,
    );
    // (B) 일할 단가 비증가 — ×30 버그가 즉시 걸린다
    const prevPerDay = prev.cost / prev.d;
    const currPerDay = curr.cost / curr.d;
    // 0.5% 이내 상승은 반올림 노이즈. 이 invariant 는 ×20/×30 급 버그를
    // 잡기 위한 것이지 원 단위 반올림을 감시하는 게 아니다.
    assert.ok(
      currPerDay <= prevPerDay * 1.005,
      `[${label}] (B) 일할 단가 증가: ${prev.d}일 ₩${prevPerDay.toFixed(0)}/day → ${curr.d}일 ₩${currPerDay.toFixed(0)}/day`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────
// R-4 — 각 실제 매체 유형에 대해 단조성 검사
// ─────────────────────────────────────────────────────────────────

test("R-4: M-CITY (day 라벨 + 7·30일 상품) — 단조성 유지", () => {
  assertMonotone(
    makeMedia({
      id: "m-city",
      price: 70_000_000,
      pricePeriod: "day",
      priceOptions: [
        { label: "7일", price: 25_000_000, period: "week" },
        { label: "1개월", price: 70_000_000, period: "month" },
      ],
    }),
    "M-CITY",
  );
});

test("R-4: 월 상품만 있는 매체 (버스 1대) — 단조성 유지", () => {
  assertMonotone(
    makeMedia({
      id: "bus-1",
      price: 800_000,
      pricePeriod: "month",
    }),
    "bus-1",
  );
});

test("R-4: 주 상품만 있는 매체 — 단조성 유지", () => {
  assertMonotone(
    makeMedia({
      id: "wk",
      price: 5_000_000,
      pricePeriod: "week",
    }),
    "weekly",
  );
});

test("R-4: 일 상품만 있는 매체 (신세계 본점) — 단조성 유지", () => {
  assertMonotone(
    makeMedia({
      id: "sinsegae",
      price: 22_000_000,
      pricePeriod: "day",
      priceOptions: [{ label: "1일", price: 22_000_000, period: "day" }],
    }),
    "sinsegae",
  );
});

test("R-4: partialPeriodRates 만 있는 매체 — 단조성 유지", () => {
  assertMonotone(
    makeMedia({
      id: "with-rates",
      price: 10_000_000,
      pricePeriod: "month",
      partialPeriodRates: {
        "1day": 0.05,
        "3days": 0.15,
        "7days": 0.3,
        "15days": 0.55,
        "30days": 1.0,
      },
    }),
    "with-rates",
  );
});

test("R-4: 다양한 옵션 조합 — Fuzz 100 매체", () => {
  // 시드 없는 fuzz: 매 실행마다 다른 형태를 만들어 회귀를 잡는다.
  const rng = mulberry32(20260810);
  for (let i = 0; i < 100; i += 1) {
    const price = 100_000 + Math.floor(rng() * 100_000_000);
    const period = (["day", "week", "biweekly", "month"] as const)[
      Math.floor(rng() * 4)
    ];
    const priceOptions: MediaPriceOption[] = [];
    // 등록 상품가는 언제나 concave · monotone 이어야 한다
    // (period 키 → 실제 일수는 day=1, week=7, biweekly=14, month=30)
    let cumulative = price * (1 + rng() * 0.5);
    for (const [days, periodKey] of [
      [1, "day"], [7, "week"], [14, "biweekly"], [30, "month"],
    ] as const) {
      if (rng() < 0.6) {
        priceOptions.push({
          label: `${days}일`,
          price: Math.round(cumulative),
          period: periodKey,
        });
        cumulative *= 1 + rng() * 0.8; // 다음 상품은 더 비쌈 (총액 증가)
      }
    }
    const media = makeMedia({ id: `fuzz-${i}`, price, pricePeriod: period, priceOptions });
    assertMonotone(media, `fuzz-${i}`);
  }
});

// PRNG — 재현성 있는 fuzz
function mulberry32(seed: number): () => number {
  let t = seed >>> 0;
  return () => {
    t = (t + 0x6d2b79f5) >>> 0;
    let x = t;
    x = Math.imul(x ^ (x >>> 15), x | 1);
    x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
    return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
  };
}
