import test from "node:test";
import assert from "node:assert/strict";
import {
  PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY,
  buildPlannerOnlineCardContextByPlatform,
  readPlannerOnlineCardContext,
  savePlannerOnlineCardContext,
} from "@/lib/planner/online-catalog-card-context";
import type { OnlineCatalogRecommendResult } from "@/lib/planner/recommend-online-catalog";

function fakeSessionStorage(store: Map<string, string>): Storage {
  return {
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => {
      store.set(k, v);
    },
    removeItem: (k) => {
      store.delete(k);
    },
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  };
}

function withFakeWindow<T>(store: Map<string, string>, fn: () => T): T {
  const g = globalThis as typeof globalThis & {
    window?: { sessionStorage: Storage };
  };
  const prev = g.window;
  g.window = { sessionStorage: fakeSessionStorage(store) };
  try {
    return fn();
  } finally {
    if (prev === undefined) delete g.window;
    else g.window = prev;
  }
}

function resultFixture(
  overrides?: Partial<OnlineCatalogRecommendResult>,
): Pick<OnlineCatalogRecommendResult, "platforms" | "excludedForBudget"> {
  return {
    platforms: overrides?.platforms ?? [
      {
        platform: "인스타그램",
        score: 5,
        budgetPct: 32,
        budgetMan: 200,
        topProduct: {} as never,
        otherProductCount: 0,
        reasonKo: "인스타그램 — 목표 적합",
        reasonEn: "Instagram — goal fit",
        metricType: "impressions",
        estimatedMetricMin: 150000,
        estimatedMetricMax: 250000,
      },
    ],
    excludedForBudget: overrides?.excludedForBudget ?? [
      {
        platform: "구글 디스플레이",
        score: 4,
        minBudgetMan: 150,
        reasonKo: "구글 디스플레이 — 관련성은 있지만 최소 집행금액(150만원)을 채우지 못해 제외",
        reasonEn: "Google Display — relevant but excluded (requires a minimum budget of 150만원)",
      },
    ],
  };
}

test("buildPlannerOnlineCardContextByPlatform — 추천 플랫폼은 비중·예상 지표, 제외 플랫폼은 사유(로케일별)를 담는다", () => {
  const byPlatformKo = buildPlannerOnlineCardContextByPlatform(resultFixture(), true);
  assert.equal(byPlatformKo["인스타그램"]?.recommendedBudgetPct, 32);
  assert.equal(byPlatformKo["인스타그램"]?.estimatedMetricMin, 150000);
  assert.equal(byPlatformKo["인스타그램"]?.estimatedMetricMax, 250000);
  assert.equal(byPlatformKo["인스타그램"]?.metricType, "impressions");
  assert.equal(byPlatformKo["인스타그램"]?.excludedForBudgetReason, undefined);
  assert.ok(byPlatformKo["구글 디스플레이"]?.excludedForBudgetReason?.includes("최소 집행금액"));
  assert.equal(byPlatformKo["구글 디스플레이"]?.recommendedBudgetPct, undefined);

  const byPlatformEn = buildPlannerOnlineCardContextByPlatform(resultFixture(), false);
  assert.ok(byPlatformEn["구글 디스플레이"]?.excludedForBudgetReason?.includes("relevant but excluded"));
});

test("save/read 세션스토리지 왕복 — 저장한 값 그대로 읽힌다", () => {
  const store = new Map<string, string>();
  withFakeWindow(store, () => {
    const byPlatform = buildPlannerOnlineCardContextByPlatform(resultFixture(), true);
    savePlannerOnlineCardContext(byPlatform);
    assert.ok(store.has(PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY));

    const restored = readPlannerOnlineCardContext();
    assert.equal(restored?.["인스타그램"]?.recommendedBudgetPct, 32);
    assert.ok(restored?.["구글 디스플레이"]?.excludedForBudgetReason);
  });
});

test("여러 번 다른 조건으로 실행해도 이전 세션 정보가 남지 않는다 — 통째로 덮어쓴다", () => {
  const store = new Map<string, string>();
  withFakeWindow(store, () => {
    savePlannerOnlineCardContext(
      buildPlannerOnlineCardContextByPlatform(resultFixture(), true),
    );

    const secondRun = resultFixture({
      platforms: [
        {
          platform: "네이버 검색광고",
          score: 6,
          budgetPct: 50,
          budgetMan: 300,
          topProduct: {} as never,
          otherProductCount: 0,
          reasonKo: "네이버 검색광고 — 업종 적합",
          reasonEn: "Naver Search Ads — industry fit",
          metricType: "clicks",
          estimatedMetricMin: 500,
          estimatedMetricMax: 900,
        },
      ],
      excludedForBudget: [],
    });
    savePlannerOnlineCardContext(
      buildPlannerOnlineCardContextByPlatform(secondRun, true),
    );

    const restored = readPlannerOnlineCardContext();
    assert.equal(restored?.["인스타그램"], undefined, "이전 실행의 채널이 남아있으면 안 됨");
    assert.equal(restored?.["구글 디스플레이"], undefined);
    assert.equal(restored?.["네이버 검색광고"]?.recommendedBudgetPct, 50);
    assert.equal(restored?.["네이버 검색광고"]?.metricType, "clicks");
  });
});

test("TTL 만료 — 오래된 저장값은 무시하고 스토리지에서 정리된다", () => {
  const store = new Map<string, string>();
  withFakeWindow(store, () => {
    const stale = {
      savedAt: Date.now() - 2 * 60 * 60 * 1000, // 2시간 전 — TTL(1시간) 초과
      byPlatform: buildPlannerOnlineCardContextByPlatform(resultFixture(), true),
    };
    store.set(PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY, JSON.stringify(stale));

    const restored = readPlannerOnlineCardContext();
    assert.equal(restored, null);
    assert.equal(store.has(PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY), false);
  });
});

test("저장된 값이 없거나 형식이 깨졌으면 null — 일반 브라우징에 영향 없음", () => {
  const store = new Map<string, string>();
  withFakeWindow(store, () => {
    assert.equal(readPlannerOnlineCardContext(), null);

    store.set(PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY, "not json");
    assert.equal(readPlannerOnlineCardContext(), null);

    store.set(PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY, JSON.stringify({ foo: "bar" }));
    assert.equal(readPlannerOnlineCardContext(), null);
  });
});
