import assert from "node:assert/strict";
import test from "node:test";
import { parseTargetingOptions } from "./parse-targeting-options.ts";

test("parseTargetingOptions — seed token shape", () => {
  const parsed = parseTargetingOptions([
    "industry:ECOMMERCE",
    "industry:BEAUTY",
    "goal:AWARENESS",
    "age:18-24",
    "age:25-34",
    "gender:ALL",
    "geo:KR",
  ]);
  assert.deepEqual(parsed.fitIndustries, ["ECOMMERCE", "BEAUTY"]);
  assert.deepEqual(parsed.fitGoals, ["AWARENESS"]);
  assert.deepEqual(parsed.ageTargets, ["18-24", "25-34"]);
  assert.equal(parsed.genderTarget, "ALL");
  assert.deepEqual(parsed.geoTargeting, ["KR"]);
});
