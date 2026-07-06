import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlannerBriefPath,
  decodeBriefFromPlannerQuery,
  encodeBriefForPlannerQuery,
  isValidFreetextBrief,
} from "@/lib/planner/freetext-brief-url";

test("encode/decode brief round-trip", () => {
  const raw = "강남 2030 브랜딩 3000만원";
  const enc = encodeBriefForPlannerQuery(raw);
  assert.ok(enc);
  assert.equal(decodeBriefFromPlannerQuery(enc), raw);
});

test("buildPlannerBriefPath", () => {
  const path = buildPlannerBriefPath("강남 브랜딩");
  assert.ok(path?.startsWith("/planner?brief="));
});

test("rejects too short brief", () => {
  assert.equal(isValidFreetextBrief("ab"), false);
  assert.equal(encodeBriefForPlannerQuery("ab"), null);
});

test("decode invalid returns null", () => {
  assert.equal(decodeBriefFromPlannerQuery("%E0%A4%A"), null);
});
