import assert from "node:assert/strict";
import test from "node:test";

import {
  regionOverInclusions,
  overInclusionMessage,
} from "../regions.ts";
import {
  EMPTY_BRIEF,
  totalBudgetWon,
  type CampaignBriefInput,
} from "../types.ts";
import {
  resolveSovShareWithBasis,
  resolveContactRateWithBasis,
  weakestBasis,
  DEFAULT_SOV_SHARE,
  DEFAULT_DEMO_AGE,
  DEFAULT_DEMO_GENDER,
} from "../../../metrics/defaults.ts";
import {
  calcLineMetrics,
  calcMixMetrics,
  tryCalcReach,
} from "../mix-metrics.ts";
import { parseAgeLabel, scoreMediaCandidates, buildRecommendedMix } from "../scoring.ts";
import type { MediaItem } from "../../../media-data.ts";

// ── [fixture] 합성 매체 — 프로덕션 DB 값 아님 ──────────────

function fixtureMedia(over: Partial<MediaItem> = {}): MediaItem {
  return {
    id: "fx-1",
    name: "픽스처 DOOH",
    nameEn: "Fixture DOOH",
    location: "서울 강남",
    locationEn: "Gangnam, Seoul",
    region: "seoul",
    regionMain: "seoul",
    city: "서울",
    district: "강남구",
    type: "digital",
    subCategory: "led_screen",
    mediaCategory: ["ooh"],
    price: 30_000_000,
    pricePeriod: "month",
    dailyFootTraffic: 300_000,
    visibilityScore: 85,
    ...over,
  } as MediaItem;
}

// ── H-지역: 과대포함 경고 ──────────────────────────────────

test("충북만 선택하면 세종·충남이 함께 딸려온다고 경고한다", () => {
  const rows = regionOverInclusions(["43"]); // 충북
  assert.equal(rows.length, 1);
  assert.equal(rows[0].browseMainId, "chungcheong");
  assert.deepEqual(rows[0].selected, ["43"]);
  assert.deepEqual(rows[0].alsoIncluded, ["36", "44"]); // 세종·충남

  const msg = overInclusionMessage(rows[0], true);
  assert.ok(msg.includes("충북"), "선택한 시도 이름");
  assert.ok(msg.includes("세종"), "딸려오는 시도 이름");
  assert.ok(msg.includes("충남"), "딸려오는 시도 이름");
});

test("그룹 전체를 고르면 경고하지 않는다", () => {
  assert.deepEqual(regionOverInclusions(["36", "43", "44"]), []);
});

test("서울·경기는 단독 그룹이라 경고 없음", () => {
  assert.deepEqual(regionOverInclusions(["11", "41"]), []);
});

test("전국(빈 선택)은 과대포함 개념이 없다", () => {
  assert.deepEqual(regionOverInclusions([]), []);
});

test("경상·전라도 동일하게 동작", () => {
  const gyeong = regionOverInclusions(["47"]); // 경북
  assert.deepEqual(gyeong[0].alsoIncluded, ["48"]); // 경남
  const jeol = regionOverInclusions(["46"]); // 전남
  assert.deepEqual(jeol[0].alsoIncluded, ["45"]); // 전북
});

// ── H-3: basis 를 값과 함께 반환 ───────────────────────────

test("정적 매체 SOV 는 1.0 이고 근거는 derived (가정 아님)", () => {
  const r = resolveSovShareWithBasis({ type: "static", subCategory: "billboard" });
  assert.equal(r.value, 1);
  assert.equal(r.basis, "derived");
});

test("SOV 스펙 없는 loop 매체는 기본값 + basis=default", () => {
  const r = resolveSovShareWithBasis({
    type: "digital",
    subCategory: "led_screen",
    mainCategory: "ooh",
  });
  assert.equal(r.basis, "default");
  // 엔진이 0 을 주는 자리를 기본값으로 덮었다 — 0 이 아니어야 한다
  assert.ok(r.value > 0, "기본값으로 덮어써야 노출이 0 이 되지 않는다");
  assert.ok(r.value <= 1);
});

test("SOV 스펙이 있으면 계산값 + basis=derived", () => {
  const r = resolveSovShareWithBasis({
    type: "digital",
    subCategory: "led_screen",
    spotDuration: 15,
    loopDuration: 300,
  });
  assert.equal(r.basis, "derived");
  assert.ok(Math.abs(r.value - 0.05) < 1e-9);
});

test("contactRate 실측 없으면 default, 있으면 measured", () => {
  const d = resolveContactRateWithBasis({ type: "digital", subCategory: "led_screen" });
  assert.equal(d.basis, "default");
  assert.ok(d.value > 0 && d.value <= 1);

  const m = resolveContactRateWithBasis({
    type: "digital",
    subCategory: "led_screen",
    contactRate: 0.42,
  });
  assert.equal(m.basis, "measured");
  assert.equal(m.value, 0.42);
});

test("weakestBasis: 추정이 하나라도 섞이면 결과는 추정", () => {
  assert.equal(weakestBasis(["measured", "measured"]), "measured");
  assert.equal(weakestBasis(["measured", "derived"]), "derived");
  assert.equal(weakestBasis(["measured", "parsed"]), "parsed");
  assert.equal(weakestBasis(["parsed", "derived"]), "parsed");
  assert.equal(weakestBasis(["measured", "derived", "default"]), "default");
  assert.equal(weakestBasis([]), "default");
});

test("DEFAULT_SOV_SHARE 는 모든 유형에 값이 있다", () => {
  for (const [cls, v] of Object.entries(DEFAULT_SOV_SHARE)) {
    assert.ok(v > 0 && v <= 1, `${cls} SOV 기본값 범위`);
  }
});

// ── H-2: 계산 가능 3개 / 산정 불가 4개 ─────────────────────

test("[fixture] 믹스 지표 — 도달 4종은 항상 null (모집단 없음)", () => {
  const m = calcMixMetrics({
    lines: [{ media: fixtureMedia(), units: 1 }],
    days: 30,
    budgetWon: 50_000_000,
  });

  // 계산 가능 3개
  assert.ok(m.totalCostWon.value > 0);
  assert.ok(m.totalImpressions.value > 0);
  assert.ok(m.mixCpmWon.value != null && m.mixCpmWon.value > 0);

  // 산정 불가 4개 — 계산 시도조차 하지 않는다
  assert.equal(m.netReach, null);
  assert.equal(m.reachRate, null);
  assert.equal(m.frequency, null);
  assert.equal(m.grp, null);
});

test("[fixture] SOV 기본값을 쓰면 노출 basis 가 default 로 내려간다", () => {
  const line = calcLineMetrics({ media: fixtureMedia(), units: 1 }, 30);
  assert.equal(line.sovShare.basis, "default");
  assert.equal(line.impressions.basis, "default");
  assert.ok(line.impressions.value > 0);
});

test("tryCalcReach: 모집단(dongs)이 없으면 계산하지 않고 null", () => {
  let errored = false;
  const r = tryCalcReach({
    lines: [{ media: fixtureMedia(), units: 1 }],
    days: 30,
    target: {},
    dongs: [], // 인구 데이터 없음
    coverageByMediaId: {},
    onError: () => {
      errored = true;
    },
  });
  assert.equal(r, null);
  // 계산을 시도하지 않았으므로 에러도 없어야 한다
  assert.equal(errored, false);
});

test("tryCalcReach: 모집단이 있으면 계산하고 reachRate <= 1.0 을 지킨다", () => {
  const r = tryCalcReach({
    lines: [{ media: fixtureMedia(), units: 1 }],
    days: 7,
    target: {},
    dongs: [{ code: "1168051000", population: 500_000 }],
    coverageByMediaId: { "fx-1": [{ code: "1168051000", weight: 1 }] },
  });
  assert.ok(r != null, "모집단이 있으면 계산된다");
  assert.ok(r.reachRate <= 1, "도달률은 1.0 을 넘을 수 없다");
  assert.ok(r.reachRate >= 0);
  assert.ok(r.netReach <= r.targetPopulation, "순 도달 <= 모집단");
});

// ── H-4: 예산 ──────────────────────────────────────────────

test("총액/월예산 토글이 총 예산 환산에 정확히 반영된다", () => {
  const base: CampaignBriefInput = {
    ...EMPTY_BRIEF,
    budgetInputWon: 30_000_000,
    flightStart: "2026-09-01",
    flightEnd: "2026-09-30", // 30일 = 1개월
  };
  assert.equal(totalBudgetWon({ ...base, budgetMode: "total" }), 30_000_000);
  assert.equal(totalBudgetWon({ ...base, budgetMode: "monthly" }), 30_000_000);

  // 60일 = 2개월 → 월예산 모드는 2배
  const twoMonths: CampaignBriefInput = {
    ...base,
    flightEnd: "2026-10-30",
  };
  assert.equal(totalBudgetWon({ ...twoMonths, budgetMode: "total" }), 30_000_000);
  assert.equal(
    totalBudgetWon({ ...twoMonths, budgetMode: "monthly" }),
    60_000_000,
  );
});

test("[fixture] 예산 초과를 막지 않고 초과분을 명확히 계산한다", () => {
  const m = calcMixMetrics({
    lines: [{ media: fixtureMedia(), units: 3 }],
    days: 30,
    budgetWon: 10_000_000, // 부족한 예산
  });
  assert.equal(m.isOverBudget, true);
  assert.ok(m.overBudgetWon > 0);
  assert.equal(m.overBudgetWon, m.totalCostWon.value - 10_000_000);
  assert.ok(m.budgetUsedRate > 1);
});

test("[fixture] 추천 믹스는 예산을 넘지 않는다", () => {
  const candidates = [
    fixtureMedia({ id: "a", price: 10_000_000 }),
    fixtureMedia({ id: "b", price: 20_000_000 }),
    fixtureMedia({ id: "c", price: 40_000_000 }),
  ];
  const budgetWon = 35_000_000;
  const scored = scoreMediaCandidates({
    candidates,
    brief: { ...EMPTY_BRIEF, regionCodes: ["11"] },
    days: 30,
  });
  const mix = buildRecommendedMix({ scored, days: 30, budgetWon });

  const total = calcMixMetrics({
    lines: mix.map((l) => ({
      media: candidates.find((c) => c.id === l.mediaId)!,
      units: l.units,
    })),
    days: 30,
    budgetWon,
  });
  assert.ok(
    total.totalCostWon.value <= budgetWon,
    `추천 믹스 ${total.totalCostWon.value} <= 예산 ${budgetWon}`,
  );
  assert.equal(total.isOverBudget, false);
});

// ── H-1: 스코어링 ──────────────────────────────────────────

test("연령 라벨 파싱", () => {
  assert.deepEqual(new Set(parseAgeLabel("2030")), new Set(["20s", "30s"]));
  assert.deepEqual(new Set(parseAgeLabel("4050")), new Set(["40s", "50s+"]));
  assert.deepEqual(new Set(parseAgeLabel("20대")), new Set(["20s"]));
  assert.deepEqual(parseAgeLabel("직장인"), []); // 연령 아님
});

test("[fixture] 지역 조건이 없으면 지역 축을 만들지 않는다", () => {
  const scored = scoreMediaCandidates({
    candidates: [fixtureMedia()],
    brief: { ...EMPTY_BRIEF }, // 전국
    days: 30,
  });
  assert.equal(
    scored[0].axes.some((a) => a.key === "region"),
    false,
    "변별력 없는 축은 표시하지 않는다",
  );
});

test("[fixture] demo 없고 브리프 타깃만 있으면 class default로 타깃 축 생성", () => {
  const scored = scoreMediaCandidates({
    candidates: [fixtureMedia({ subCategory: "subway_station" })],
    brief: { ...EMPTY_BRIEF, ageBands: ["20s", "30s"] },
    days: 30,
  });
  const axis = scored[0].axes.find((a) => a.key === "target");
  assert.ok(axis, "타깃 축 존재");
  assert.ok(axis.score > 0);
  assert.ok(
    axis.rationale.includes("추정") || axis.rationale.toLowerCase().includes("estimate"),
  );
});

test("[fixture] demo 스냅샷으로 성별·연령 순위가 달라진다", () => {
  const subway = fixtureMedia({
    id: "subway",
    subCategory: "subway_station",
    regionMain: "seoul",
    demoGenderSplit: DEFAULT_DEMO_GENDER.subway_psd,
    demoAgeSplit: DEFAULT_DEMO_AGE.subway_psd,
    price: 25_000_000,
    dailyFootTraffic: 200_000,
  });
  const elevator = fixtureMedia({
    id: "elevator",
    subCategory: "elevator",
    regionMain: "seoul",
    demoGenderSplit: DEFAULT_DEMO_GENDER.elevator_tv,
    demoAgeSplit: DEFAULT_DEMO_AGE.elevator_tv,
    price: 25_000_000,
    dailyFootTraffic: 200_000,
  });

  const female2030 = scoreMediaCandidates({
    candidates: [subway, elevator],
    brief: {
      ...EMPTY_BRIEF,
      regionCodes: ["11"],
      genders: ["female"],
      ageBands: ["20s", "30s"],
    },
    days: 14,
  });
  const male50 = scoreMediaCandidates({
    candidates: [subway, elevator],
    brief: {
      ...EMPTY_BRIEF,
      regionCodes: ["11"],
      genders: ["male"],
      ageBands: ["50s+"],
    },
    days: 14,
  });

  assert.notEqual(
    female2030[0]?.media.id,
    male50[0]?.media.id,
    "2030 여성 vs 50s+ 남성 Top1이 달라야 한다",
  );

  const withTarget = female2030.filter((s) =>
    s.axes.some((a) => a.key === "target"),
  ).length;
  assert.equal(withTarget, 2, "타깃 축이 생성되어야 한다");
});

test("[fixture] subway_psd가 2030 여성 share에서 elevator_tv보다 높다", () => {
  const subway = fixtureMedia({
    id: "subway",
    subCategory: "subway_station",
    demoGenderSplit: DEFAULT_DEMO_GENDER.subway_psd,
    demoAgeSplit: DEFAULT_DEMO_AGE.subway_psd,
  });
  const elevator = fixtureMedia({
    id: "elevator",
    subCategory: "elevator",
    demoGenderSplit: DEFAULT_DEMO_GENDER.elevator_tv,
    demoAgeSplit: DEFAULT_DEMO_AGE.elevator_tv,
  });
  const scored = scoreMediaCandidates({
    candidates: [subway, elevator],
    brief: {
      ...EMPTY_BRIEF,
      genders: ["female"],
      ageBands: ["20s", "30s"],
    },
    days: 14,
  });
  const subwayTarget =
    scored.find((s) => s.media.id === "subway")?.axes.find((a) => a.key === "target")
      ?.score ?? 0;
  const elevatorTarget =
    scored.find((s) => s.media.id === "elevator")?.axes.find((a) => a.key === "target")
      ?.score ?? 0;
  assert.ok(subwayTarget > elevatorTarget, "subway_psd 2030 여성 share > elevator_tv");
});

test("[fixture] 모든 축은 근거 문장을 반드시 가진다", () => {
  const scored = scoreMediaCandidates({
    candidates: [
      fixtureMedia({ id: "a" }),
      fixtureMedia({ id: "b", price: 60_000_000 }),
    ],
    brief: { ...EMPTY_BRIEF, regionCodes: ["11"] },
    days: 30,
  });
  for (const s of scored) {
    for (const a of s.axes) {
      assert.ok(
        a.rationale.trim().length > 0,
        `${s.media.id} ${a.key} 축에 근거 문장이 있어야 한다`,
      );
    }
  }
});

test("[fixture] 혼합 CPM — 총 노출 0이면 산정 불가", () => {
  const metrics = calcMixMetrics({
    lines: [],
    days: 14,
    budgetWon: 30_000_000,
  });
  assert.equal(metrics.mixCpmWon.value, null);
  assert.equal(metrics.totalImpressions.value, 0);
});

test("[fixture] 혼합 CPM — 금액·노출 없으면 CPM 산정 불가", () => {
  const metrics = calcMixMetrics({
    lines: [
      {
        media: fixtureMedia({ price: 0, dailyFootTraffic: 0 }),
        units: 1,
      },
    ],
    days: 14,
    budgetWon: 30_000_000,
  });
  assert.equal(metrics.mixCpmWon.value, null);
});
