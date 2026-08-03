import test from "node:test";
import assert from "node:assert/strict";
import {
  detectMediaSubwayLine,
  parseSubwayLineFromText,
  subwayLinesMatch,
} from "@/lib/planner/subway-line";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { mediaMatchesPlannerSubwayIntent } from "@/lib/planner-logic";
import type { MediaItem } from "@/lib/media-data";

test("parseSubwayLineFromText: numeric and named lines", () => {
  assert.deepEqual(parseSubwayLineFromText("9호선 지하철광고"), {
    key: "9",
    labelKo: "9호선",
  });
  assert.deepEqual(parseSubwayLineFromText("2호선 역사"), {
    key: "seoul:2",
    labelKo: "2호선",
  });
  assert.deepEqual(parseSubwayLineFromText("대구 2호선"), {
    key: "daegu:2",
    labelKo: "대구 2호선",
  });
  assert.deepEqual(parseSubwayLineFromText("신분당선 브랜딩"), {
    key: "shinbundang",
    labelKo: "신분당선",
  });
  assert.deepEqual(parseSubwayLineFromText("공항철도 AREX"), {
    key: "arex",
    labelKo: "공항철도",
  });
  assert.deepEqual(parseSubwayLineFromText("경의중앙선"), {
    key: "gyeongui-jungang",
    labelKo: "경의중앙선",
  });
  assert.deepEqual(parseSubwayLineFromText("대구 지하철 3호선"), {
    key: "daegu:3",
    labelKo: "대구 3호선",
  });
});

test("parsePlannerFreetextBrief: 9호선 → subwayLine + unmatched cleanup", () => {
  const r = parsePlannerFreetextBrief("9호선 지하철광고");
  assert.equal(r.fields.subwayLine.value, "9");
  assert.equal(r.fields.subwayLine.confidence, "high");
  assert.ok(r.fields.subwayLine.source?.includes("9호선"));
  assert.ok(!r.unmatchedTokens.includes("9호선"));
});

test("mediaMatchesPlannerSubwayIntent: taxi media bar is not subway", () => {
  const taxiBar = {
    id: "taxi-bar",
    name: "택시 미디어바 광고",
    mediaSubCategory: "subway_station",
    subCategory: "택시 미디어바",
    type: "mobile",
  } as MediaItem;
  assert.equal(mediaMatchesPlannerSubwayIntent(taxiBar), false);
});

test("subwayLinesMatch: seoul default vs provincial same number", () => {
  assert.equal(subwayLinesMatch("seoul:2", "seoul:2"), true);
  assert.equal(subwayLinesMatch("seoul:2", "daegu:2"), false);
  assert.equal(subwayLinesMatch("daegu:2", "daegu:2"), true);
});

test("detectMediaSubwayLine: 대구 반월당 → daegu:2", () => {
  const m = {
    name: "대구 반월당역 사각기둥 광고",
    location: "대구광역시 중구 달구벌대로 2100 반월당역 2호선",
    regionMain: "daegu",
  } as MediaItem;
  assert.equal(detectMediaSubwayLine(m)?.key, "daegu:2");
});

test("detectMediaSubwayLine: seoul 2호선", () => {
  const m = {
    name: "2호선 사당역 디지털포스터 지하철 광고",
    location: "서울 동작구",
    regionMain: "seoul",
  } as MediaItem;
  assert.equal(detectMediaSubwayLine(m)?.key, "seoul:2");
});

test("detectMediaSubwayLine: 9호선 canvas9", () => {
  const m = {
    name: "지하철 9호선 신논현역 캔버스9 광고",
    location: "서울 강남구",
  } as MediaItem;
  assert.equal(detectMediaSubwayLine(m)?.key, "9");
});
