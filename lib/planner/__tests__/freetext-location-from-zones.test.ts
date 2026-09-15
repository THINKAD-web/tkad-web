import test from "node:test";
import assert from "node:assert/strict";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { extractLocationKeywordsFromZones } from "@/lib/planner/freetext-location-from-zones";
import {
  extractFreetextLocationKeywords,
  parseFreetextMediaIntents,
} from "@/lib/recommend/freetext-media-intents";

test("extractLocationKeywordsFromZones: 역명 단독", () => {
  const gangnam = extractLocationKeywordsFromZones("강남역 3000만원");
  assert.ok(gangnam.includes("강남역") || gangnam.includes("강남"));
  assert.equal(gangnam.includes("gangnam"), false);

  const jamsil = extractLocationKeywordsFromZones("잠실역");
  assert.ok(jamsil.includes("잠실역") || jamsil.includes("잠실"));
  assert.equal(jamsil.includes("jamsil"), false);
});

test("extractFreetextLocationKeywords: 역명+매체 — 매체만 intent, 지역은 location", () => {
  const text = "홍대입구역 스크린도어 3000만원";
  const loc = extractFreetextLocationKeywords(text);
  assert.ok(loc.some((k) => /홍대/i.test(k)));
  assert.ok(parseFreetextMediaIntents(text).includes("subway_psd"));
  assert.ok(!parseFreetextMediaIntents(text).includes("subway"));
});

test("parsePlannerFreetextBrief: 성동구 — 부산 동구 오매칭 없음", () => {
  const parsed = parsePlannerFreetextBrief("서울 성동구 간판 3000만원");
  assert.deepEqual(parsed.fields.seoulZones.value, ["seongsu"]);
  assert.equal(parsed.fields.busanZones.value?.length ?? 0, 0);
  assert.deepEqual(parsed.fields.regions.value, ["seoul"]);
});

test("extractFreetextLocationKeywords: 을지로·명동 회귀", () => {
  assert.ok(extractFreetextLocationKeywords("을지로 F&B").includes("을지로"));
  assert.ok(extractFreetextLocationKeywords("명동 로컬").includes("명동"));
});
