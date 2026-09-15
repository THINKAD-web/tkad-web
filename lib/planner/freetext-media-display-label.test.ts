import assert from "node:assert/strict";
import test from "node:test";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import {
  isSubwayPrimaryMediaDisplay,
  resolveFreetextMediaEvidenceLabel,
  resolveFreetextMediaSummaryLabel,
} from "@/lib/planner/freetext-media-display-label";

test("isSubwayPrimaryMediaDisplay: 지하철광고 high confidence", () => {
  const r = parsePlannerFreetextBrief("강남, 홍대 지하철광고 3,000만원");
  assert.equal(isSubwayPrimaryMediaDisplay(r), true);
  assert.equal(resolveFreetextMediaSummaryLabel(r, true), "지하철");
  assert.equal(
    resolveFreetextMediaEvidenceLabel(r, true),
    "지하철 (역사·차내)",
  );
});

test("isSubwayPrimaryMediaDisplay: 지하철 단독 low → false", () => {
  const r = parsePlannerFreetextBrief("지하철 IT 런칭 500만");
  assert.equal(isSubwayPrimaryMediaDisplay(r), false);
  assert.match(resolveFreetextMediaSummaryLabel(r, true)!, /디지털·전광판/);
});

test("isSubwayPrimaryMediaDisplay: 전광판 → false", () => {
  const r = parsePlannerFreetextBrief("전광판 LED 1500만");
  assert.equal(isSubwayPrimaryMediaDisplay(r), false);
  assert.equal(resolveFreetextMediaSummaryLabel(r, true), "디지털·전광판");
});

test("isShelterPrimaryMediaDisplay: 서울 쉘터 → 버스·쉘터", () => {
  const r = parsePlannerFreetextBrief("서울 쉘터 3000만원");
  assert.equal(resolveFreetextMediaSummaryLabel(r, true), "버스·쉘터");
  assert.equal(
    resolveFreetextMediaEvidenceLabel(r, true),
    "버스·쉘터 (정류장·스마트쉘터)",
  );
});
