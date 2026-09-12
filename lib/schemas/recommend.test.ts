import assert from "node:assert/strict";
import test from "node:test";
import { recommendInputSchema } from "@/lib/schemas/recommend";

const baseInput = {
  goal: "awareness" as const,
  target: "mass" as const,
  budgetMaxMan: 500,
  region: "seoul",
  industry: "other" as const,
};

test("recommendInputSchema retains mediaIntents/subwayLine (자연어 파서 신호가 조용히 스트립되지 않아야 함)", () => {
  const parsed = recommendInputSchema.parse({
    ...baseInput,
    mediaIntents: ["subway"],
    subwayLine: "2호선",
  });
  assert.deepEqual(parsed.mediaIntents, ["subway"]);
  assert.equal(parsed.subwayLine, "2호선");
});

test("recommendInputSchema rejects unknown mediaIntents values", () => {
  const result = recommendInputSchema.safeParse({
    ...baseInput,
    mediaIntents: ["not-a-real-intent"],
  });
  assert.equal(result.success, false);
});
