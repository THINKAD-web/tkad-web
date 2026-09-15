import assert from "node:assert/strict";
import test from "node:test";
import { inferShortRegionLabelFromCodes } from "./korea-sgg-coverage.ts";

test("inferShortRegionLabelFromCodes — national regionMain returns 전국", () => {
  assert.equal(
    inferShortRegionLabelFromCodes(["11110", "26110", "41111"], {
      regionMain: "national",
    }),
    "전국",
  );
});

test("inferShortRegionLabelFromCodes — without national uses first code sido", () => {
  assert.equal(inferShortRegionLabelFromCodes(["11110"]), "서울");
});
