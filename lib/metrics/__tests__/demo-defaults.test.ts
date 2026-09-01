import assert from "node:assert/strict";
import test from "node:test";

import { targetAgeToAgeSplit } from "../demo-age-bridge.ts";
import {
  DEFAULT_DEMO_AGE,
  DEFAULT_DEMO_GENDER,
  resolveDemoAgeSplitWithBasis,
  resolveDemoGenderSplitWithBasis,
  targetAudienceShare,
} from "../defaults.ts";

test("targetAgeToAgeSplit: 20-39세 → 20s·30s 균등", () => {
  const split = targetAgeToAgeSplit("20-39세 (2030 세대)");
  assert.ok(split);
  assert.ok(Math.abs((split["20s"] ?? 0) - 0.5) < 0.01);
  assert.ok(Math.abs((split["30s"] ?? 0) - 0.5) < 0.01);
});

test("targetAgeToAgeSplit: 전연령 → null", () => {
  assert.equal(targetAgeToAgeSplit("전 연령대"), null);
});

test("resolveDemoGenderSplit: default는 클래스별 차별화", () => {
  const psd = resolveDemoGenderSplitWithBasis({
    type: "dooh",
    subCategory: "subway_station",
  });
  const bus = resolveDemoGenderSplitWithBasis({
    type: "mobile",
    subCategory: "bus_exterior",
  });
  assert.equal(psd.basis, "default");
  assert.ok(bus.value.female > psd.value.female);
});

test("resolveDemoAgeSplit: targetAge parsed 우선", () => {
  const res = resolveDemoAgeSplitWithBasis({
    type: "dooh",
    subCategory: "subway_station",
    targetAge: "20-39세",
  });
  assert.equal(res.basis, "parsed");
  assert.ok(Math.abs(res.value["20s"] - 0.5) < 0.01);
});

test("resolveDemoAgeSplit: 파싱 실패 시 class default", () => {
  const res = resolveDemoAgeSplitWithBasis({
    type: "dooh",
    subCategory: "subway_station",
    targetAge: "강남 상권 소비자",
  });
  assert.equal(res.basis, "default");
  assert.deepEqual(res.value, DEFAULT_DEMO_AGE.subway_psd);
});

test("DEFAULT profiles sum to ~1", () => {
  for (const [cls, g] of Object.entries(DEFAULT_DEMO_GENDER)) {
    assert.ok(Math.abs(g.male + g.female - 1) < 0.001, cls);
  }
  for (const [cls, a] of Object.entries(DEFAULT_DEMO_AGE)) {
    const sum = Object.values(a).reduce((s, v) => s + v, 0);
    assert.ok(Math.abs(sum - 1) < 0.001, cls);
  }
});

test("targetAudienceShare: 2030 여성 subway_psd", () => {
  const share = targetAudienceShare(
    DEFAULT_DEMO_GENDER.subway_psd,
    DEFAULT_DEMO_AGE.subway_psd,
    { genders: ["female"], ageBands: ["20s", "30s"] },
  );
  assert.ok(Math.abs(share - 0.302) < 0.01);
});
