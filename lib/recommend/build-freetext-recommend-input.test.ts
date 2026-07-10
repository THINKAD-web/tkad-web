import test from "node:test";
import assert from "node:assert/strict";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { plannerFreetextToRecommendBrief } from "@/lib/recommend/planner-freetext-to-recommend-brief";
import {
  buildAiRecommendInputFromFreetext,
  type FreetextRecommendDraft,
} from "@/lib/recommend/build-freetext-recommend-input";
import {
  applyFreetextRecommendDraftDefaults,
  FREETEXT_RECOMMEND_DEFAULT_BUDGET_MAN,
} from "@/lib/recommend/freetext-recommend-defaults";
import {
  extractFreetextLocationKeywords,
  parseFreetextMediaIntents,
} from "@/lib/recommend/freetext-media-intents";

const emptyDraft: FreetextRecommendDraft = {
  goal: "",
  target: "",
  budgetMan: "",
  region: "",
  industry: "",
};

test("applyFreetextRecommendDraftDefaults fills industry target budget", () => {
  const parsed = parsePlannerFreetextBrief("강남 2030 브랜딩 3000만원");
  const { draft, budgetDefaulted } = applyFreetextRecommendDraftDefaults(
    emptyDraft,
    parsed,
    true,
  );
  assert.equal(draft.goal, "awareness");
  assert.equal(draft.target, "millennial");
  assert.equal(draft.industry, "other");
  assert.equal(draft.budgetMan, "3000");
  assert.equal(budgetDefaulted, false);
});

test("buildAiRecommendInputFromFreetext: missing industry no longer blocks", () => {
  const raw = "강남 2030 브랜딩 3000만원";
  const parsed = parsePlannerFreetextBrief(raw);
  const input = buildAiRecommendInputFromFreetext(
    parsed,
    fieldsToDraft(plannerFreetextToRecommendBrief(parsed, true)),
    raw,
    true,
  );
  assert.ok(input);
  assert.equal(input?.industry, "other");
});

test("buildAiRecommendInputFromFreetext: budget default 500만", () => {
  const raw = "강남 택시 브랜딩";
  const parsed = parsePlannerFreetextBrief(raw);
  const { draft } = applyFreetextRecommendDraftDefaults(emptyDraft, parsed, true);
  const input = buildAiRecommendInputFromFreetext(parsed, draft, raw, true);
  assert.ok(input);
  assert.equal(input?.budgetMaxMan, FREETEXT_RECOMMEND_DEFAULT_BUDGET_MAN);
});

test("parseFreetextMediaIntents: subway and bus wrap", () => {
  assert.deepEqual(parseFreetextMediaIntents("지하철 IT 런칭 500만"), ["subway"]);
  assert.deepEqual(parseFreetextMediaIntents("버스 래핑 브랜딩 1000만"), [
    "bus_wrap",
  ]);
});

test("extractFreetextLocationKeywords: 을지로·명동", () => {
  assert.ok(extractFreetextLocationKeywords("을지로 F&B").includes("을지로"));
  assert.ok(extractFreetextLocationKeywords("명동 로컬").includes("명동"));
});

test("을지로 parses with 을지로 display region text", () => {
  const parsed = parsePlannerFreetextBrief("을지로 F&B 매출 700만원");
  const brief = plannerFreetextToRecommendBrief(parsed, true);
  assert.equal(brief.region, "을지로");
});

function fieldsToDraft(f: ReturnType<typeof plannerFreetextToRecommendBrief>) {
  return {
    goal: f.goal ?? "",
    target: f.target ?? "",
    budgetMan: f.budgetMaxMan != null ? String(f.budgetMaxMan) : "",
    region: f.region ?? "",
    industry: f.industry ?? "",
  };
}
