import assert from "node:assert/strict";
import test from "node:test";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { plannerFreetextToRecommendBrief } from "@/lib/recommend/planner-freetext-to-recommend-brief";

test("plannerFreetextToRecommendBrief: 강남 2030 브랜딩 3000만원", () => {
  const parsed = parsePlannerFreetextBrief("강남 2030 브랜딩 3000만원");
  const brief = plannerFreetextToRecommendBrief(parsed, true);
  assert.equal(brief.goal, "awareness");
  assert.equal(brief.target, "millennial");
  assert.equal(brief.budgetMaxMan, 3000);
  assert.ok(brief.region?.includes("강남"));
});

test("plannerFreetextToRecommendBrief: 강남 택시 브랜딩 — mobile only in planner, recommend goal/region", () => {
  const parsed = parsePlannerFreetextBrief("강남 택시 브랜딩");
  assert.deepEqual(parsed.fields.categories.value, ["mobile"]);
  const brief = plannerFreetextToRecommendBrief(parsed, true);
  assert.equal(brief.goal, "awareness");
  assert.ok(brief.region?.includes("강남"));
  assert.equal(brief.target, null);
});

test("plannerFreetextToRecommendBrief: 부산 해운대 금융 프로모션", () => {
  const parsed = parsePlannerFreetextBrief(
    "부산 해운대 40대 금융 프로모션 5천만원",
  );
  const brief = plannerFreetextToRecommendBrief(parsed, true);
  assert.equal(brief.goal, "consideration");
  assert.equal(brief.industry, "fintech");
  assert.equal(brief.target, "family");
  assert.equal(brief.budgetMaxMan, 5000);
});
