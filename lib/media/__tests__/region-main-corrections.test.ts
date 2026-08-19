import assert from "node:assert/strict";
import test from "node:test";
import { REGION_MAIN_MISMATCH_CORRECTIONS } from "../region-main-corrections.ts";
import { inferExpectedRegionMain } from "../../metrics/coverage-map.ts";

test("7 corrections have unique ids and expected regionMain from city/district", () => {
  assert.equal(REGION_MAIN_MISMATCH_CORRECTIONS.length, 7);
  const ids = new Set(REGION_MAIN_MISMATCH_CORRECTIONS.map((c) => c.id));
  assert.equal(ids.size, 7);

  for (const c of REGION_MAIN_MISMATCH_CORRECTIONS) {
    assert.equal(c.fromRegionMain, "seoul");
    const expected = inferExpectedRegionMain({
      city: c.city,
      district: c.district,
      region: null,
    });
    assert.equal(
      expected,
      c.toRegionMain,
      `${c.name}: expected ${expected} vs ${c.toRegionMain}`,
    );
  }
});
