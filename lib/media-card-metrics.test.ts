import assert from "node:assert/strict";
import test from "node:test";
import { estimateCatalogCpmWon } from "./media-metrics.ts";
import {
  buildCatalogItemMetricLine,
  resolveCpmWon,
} from "./media-card-metrics.ts";

/** T1 — 광화문 루미형: 정상 월노출 + 만 단위로 오염된 stored CPM */
test("T1: discards inflated stored cpm when impressions are absolute counts", () => {
  const price = 51_351_300;
  const impressions = 1_900_000;
  const storedCpm = 469_100_359;
  const expectedRecalc = estimateCatalogCpmWon({
    price,
    impressions,
    cpm: undefined,
  });
  assert.ok(expectedRecalc != null);
  assert.ok(Math.abs(expectedRecalc! - 27_027) < 1);

  const got = resolveCpmWon({
    price,
    impressions,
    cpm: storedCpm,
  });
  assert.equal(got, Math.round(expectedRecalc!));
  assert.notEqual(got, Math.round(storedCpm));
});

/**
 * T6 — stored CPM이 '만' 단위 노출(107)로 계산된 이상치이고,
 * impressions 필드는 올바른 절대값일 때 → 재계산값 사용.
 */
test("T6: uses recalc when stored cpm matches man-unit mis-entry pattern", () => {
  const price = 50_000_000;
  const impressions = 1_900_000;
  // 과거 버그: imp=107(만)로 저장한 CPM
  const storedAsIfImp107 = price / (107 / 1000);
  assert.ok(storedAsIfImp107 > 400_000_000);

  const got = resolveCpmWon({
    price,
    impressions,
    cpm: storedAsIfImp107,
  });
  const expected = Math.round(price / (impressions / 1000));
  assert.equal(got, expected);
  assert.ok(got! < 100_000);
});

/** 정상: stored가 재계산 ±15% 이내이면 stored 유지 */
test("keeps stored cpm when within ±15% of recalc", () => {
  const price = 51_351_300;
  const impressions = 1_900_000;
  const recalc = estimateCatalogCpmWon({ price, impressions, cpm: undefined })!;
  const storedNear = recalc * 1.1; // +10% — 허용 구간

  const got = resolveCpmWon({
    price,
    impressions,
    cpm: storedNear,
  });
  assert.equal(got, Math.round(storedNear));
  assert.notEqual(got, Math.round(recalc));
});

test("buildCatalogItemMetricLine shows recalc cpm not stored outlier", () => {
  const line = buildCatalogItemMetricLine(
    {
      price: 51_351_300,
      impressions: 1_900_000,
      cpm: 469_100_359,
    },
    true,
    "ko-KR",
  );
  assert.ok(line);
  assert.match(line!, /CPM ₩27,027/);
  assert.doesNotMatch(line!, /469/);
});
