import assert from "node:assert/strict";
import test from "node:test";
import { stripMarkdown } from "@/lib/strip-markdown";
import {
  isUnusableSummaryLine,
  normalizeSummaryKo,
} from "@/lib/content-auto/success-case-summary";

test("stripMarkdown removes bold and table pipes", () => {
  assert.equal(stripMarkdown('*정량적 성과**'), "정량적 성과");
  assert.equal(stripMarkdown("| 지표 | 수치 |"), "지표 수치");
  assert.equal(
    stripMarkdown('**"저렴하고 트렌디하지 않다"**'),
    '"저렴하고 트렌디하지 않다"',
  );
});

test("isUnusableSummaryLine rejects table headers and section titles", () => {
  assert.equal(isUnusableSummaryLine("| 지표 | 수치 |"), true);
  assert.equal(isUnusableSummaryLine("*정량적 성과**"), true);
  assert.equal(isUnusableSummaryLine("*[정량 성과]**"), true);
  assert.equal(
    isUnusableSummaryLine(
      "강남 DOOH 중심으로 신제품 런칭 인지도를 끌어올린 3개월 캠페인입니다.",
    ),
    false,
  );
});

test("normalizeSummaryKo skips bad candidates", () => {
  assert.equal(
    normalizeSummaryKo(
      ["| 지표 | 수치 |", "*정량적 성과**"],
      "홍대 지하철 집행으로 앱 다운로드를 높인 2개월 캠페인입니다.",
    ),
    "홍대 지하철 집행으로 앱 다운로드를 높인 2개월 캠페인입니다.",
  );
});
