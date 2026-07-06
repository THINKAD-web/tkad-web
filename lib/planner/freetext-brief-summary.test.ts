import assert from "node:assert/strict";
import test from "node:test";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import {
  buildFreetextBriefSummarySentence,
  buildFreetextBriefSummaryShort,
  buildFreetextEvidenceRows,
} from "@/lib/planner/freetext-brief-summary";

test("buildFreetextBriefSummarySentence: 강남 2030 브랜딩 3000만원", () => {
  const r = parsePlannerFreetextBrief("강남 2030 브랜딩 3000만원");
  const sentence = buildFreetextBriefSummarySentence(r, true);
  assert.match(sentence, /강남/);
  assert.match(sentence, /20대·30대 타깃|2030/);
  assert.match(sentence, /브랜딩 목표/);
  assert.match(sentence, /3,?000만원/);
  assert.match(sentence, /으로 이해했습니다/);
});

test("buildFreetextBriefSummaryShort: banner labels", () => {
  const r = parsePlannerFreetextBrief("강남 2030 브랜딩 3000만원");
  const short = buildFreetextBriefSummaryShort(r, true);
  assert.ok(short);
  assert.match(short!, /강남/);
  assert.match(short!, /2030/);
  assert.match(short!, /브랜딩/);
});

test("buildFreetextEvidenceRows: source on recognized fields", () => {
  const r = parsePlannerFreetextBrief("강남 2030 브랜딩 3000만원");
  const rows = buildFreetextEvidenceRows(r, true);
  assert.ok(rows.some((row) => row.key === "goal" && row.source?.includes("브랜딩")));
  assert.ok(rows.some((row) => row.key === "region"));
  assert.ok(rows.every((row) => row.valueText.length > 0));
});

test("buildFreetextEvidenceRows: categories row", () => {
  const r = parsePlannerFreetextBrief("지하철 광고만 1000만");
  const rows = buildFreetextEvidenceRows(r, true);
  assert.ok(rows.some((row) => row.key === "categories" && row.source?.includes("지하철")));
});

test("buildFreetextBriefSummarySentence: empty parse fallback", () => {
  const r = parsePlannerFreetextBrief("   ");
  assert.match(buildFreetextBriefSummarySentence(r, true), /인식된 조건이 없습니다/);
});
