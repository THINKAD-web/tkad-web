import test from "node:test";
import assert from "node:assert/strict";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { parseFreetextMediaIntents } from "@/lib/recommend/freetext-media-intents";
import {
  stripQueryModifiers,
  effectiveFreetextForMediaParsing,
} from "@/lib/planner/strip-query-modifiers";

test("stripQueryModifiers: 지하철광고 비용 → core keyword preserved", () => {
  const r = stripQueryModifiers("지하철광고 비용");
  assert.equal(r.applied, true);
  assert.equal(r.text, "지하철광고");
  assert.ok(r.stripped.some((s) => s.category === "cost"));
});

test("parsePlannerFreetextBrief: 지하철광고 비용 matches 지하철광고", () => {
  const withCost = parsePlannerFreetextBrief("서울 지하철광고 비용 3000만원");
  const plain = parsePlannerFreetextBrief("서울 지하철광고 3000만원");
  assert.deepEqual(
    withCost.fields.categories.value,
    plain.fields.categories.value,
  );
  assert.ok(parseFreetextMediaIntents(withCost.raw).includes("subway"));
});

test("stripQueryModifiers: agency-only without media keyword → no strip", () => {
  const r = stripQueryModifiers("옥외광고 대행사");
  assert.equal(r.applied, true);
  assert.match(r.text, /옥외광고/);
});

test("stripQueryModifiers: modifier-only → unmatched, no strip", () => {
  const r = stripQueryModifiers("대행사 견적");
  assert.equal(r.applied, false);
  assert.equal(r.text, "대행사 견적");
  const parsed = parsePlannerFreetextBrief("대행사 견적");
  assert.equal(parsed.fields.categories.value, null);
  assert.deepEqual(parseFreetextMediaIntents("대행사 견적"), []);
});

test("effectiveFreetextForMediaParsing: regression 서울 쉘터", () => {
  const t = effectiveFreetextForMediaParsing("서울 쉘터 3000만원");
  assert.ok(parseFreetextMediaIntents(t).includes("bus_shelter"));
});
