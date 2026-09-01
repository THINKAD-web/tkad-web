import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyMedia,
  defaultContactRate,
  defaultSellingUnit,
  isStaticMedia,
} from "../classify";
import { CPM_BOUNDS, DEFAULT_CONTACT_RATE } from "../constants";
import type { MediaMetricClass } from "../types";

test("browse taxonomy 로 분류된다", () => {
  const cases: Array<[string, MediaMetricClass]> = [
    ["subway_station", "subway_psd"],
    ["subway_train", "subway_light"],
    ["bus_exterior", "bus_exterior"],
    ["bus_shelter", "bus_shelter"],
    ["elevator", "elevator_tv"],
    ["elevator_network", "elevator_tv"],
    ["airport", "airport"],
  ];
  for (const [sub, expected] of cases) {
    assert.equal(classifyMedia({ subCategory: sub }), expected, sub);
  }
});

test("DOOH 는 화면 면적으로 대형·중형이 갈린다", () => {
  const large = classifyMedia({
    mainCategory: "ooh",
    subCategory: "digital_signage",
    type: "dooh",
    widthM: 20,
    heightM: 8, // 160㎡
  });
  const mid = classifyMedia({
    mainCategory: "ooh",
    subCategory: "digital_signage",
    type: "dooh",
    widthM: 5,
    heightM: 3, // 15㎡
  });
  assert.equal(large, "dooh_large");
  assert.equal(mid, "dooh_mid");
});

test("면적 미상 DOOH 는 과대 추정을 피해 중형으로 본다", () => {
  assert.equal(
    classifyMedia({ mainCategory: "ooh", subCategory: "digital_signage", type: "dooh" }),
    "dooh_mid",
  );
});

test("taxonomy 가 비면 이름 휴리스틱으로 폴백한다", () => {
  assert.equal(classifyMedia({ name: "2호선 강남역 스크린도어" }), "subway_psd");
  assert.equal(classifyMedia({ name: "서울 시내버스 외부광고" }), "bus_exterior");
  assert.equal(classifyMedia({ name: "강남 오피스 엘리베이터 TV" }), "elevator_tv");
  assert.equal(classifyMedia({ name: "인천공항 T1 배너" }), "airport");
});

test("아무 근거도 없으면 static_other — 범위가 가장 넓어 오탐이 적다", () => {
  assert.equal(classifyMedia({}), "static_other");
  assert.equal(classifyMedia({ name: "무언가" }), "static_other");
});

test("정적 매체 판정 — SOV 1.0 대상", () => {
  assert.equal(isStaticMedia({ subCategory: "billboard" }), true);
  assert.equal(isStaticMedia({ subCategory: "bus_exterior" }), true);
  assert.equal(isStaticMedia({ subCategory: "wall_mural" }), true);
  assert.equal(isStaticMedia({ subCategory: "digital_signage", type: "dooh" }), false);
  assert.equal(isStaticMedia({ subCategory: "elevator", type: "dooh" }), false);
});

test("모든 분류에 CPM 범위와 가시율 기본값이 정의되어 있다", () => {
  const classes = Object.keys(CPM_BOUNDS) as MediaMetricClass[];
  for (const cls of classes) {
    const [lo, hi] = CPM_BOUNDS[cls];
    assert.ok(lo > 0 && hi > lo, `${cls} 범위 이상: ${lo}~${hi}`);
    // 1,000원 미만 CPM 은 단위 오류로 간주하므로 하한이 그보다 낮으면 안 된다
    assert.ok(lo >= 1_000, `${cls} 하한이 단위오류 임계 미만`);
    const rate = DEFAULT_CONTACT_RATE[cls];
    assert.ok(rate > 0 && rate <= 1, `${cls} 가시율 이상: ${rate}`);
    assert.equal(defaultContactRate(cls), rate);
  }
});

test("판매 단위 — 버스는 대, 지하철은 역", () => {
  assert.equal(defaultSellingUnit("bus_exterior"), "vehicle");
  assert.equal(defaultSellingUnit("subway_psd"), "station");
  assert.equal(defaultSellingUnit("elevator_tv"), "site");
  assert.equal(defaultSellingUnit("dooh_large"), "panel");
});
