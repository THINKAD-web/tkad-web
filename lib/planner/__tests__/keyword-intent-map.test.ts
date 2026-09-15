import test from "node:test";
import assert from "node:assert/strict";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import { parseFreetextMediaIntents } from "@/lib/recommend/freetext-media-intents";
import {
  compileOohKeywordPatternRegexes,
  parseOohKeywordIntentsFromText,
  STANDALONE_BUS_RE,
} from "@/lib/planner/keyword-intent-map";

test("STANDALONE_BUS_RE: does not match 네이버", () => {
  assert.equal(STANDALONE_BUS_RE.test("네이버스마트채널"), false);
  assert.equal(STANDALONE_BUS_RE.test("버스광고"), true);
});

test("parseOohKeywordIntentsFromText: PARSER_GAP keywords", () => {
  assert.ok(parseOohKeywordIntentsFromText("공항광고").includes("airport"));
  assert.ok(parseOohKeywordIntentsFromText("스크린도어광고").includes("subway_psd"));
  assert.ok(parseOohKeywordIntentsFromText("쇼핑몰광고").includes("mall"));
  assert.ok(parseOohKeywordIntentsFromText("옥상광고").includes("rooftop"));
  assert.ok(parseOohKeywordIntentsFromText("KTX광고").includes("ktx"));
  assert.ok(parseOohKeywordIntentsFromText("e-Vision").includes("subway"));
  assert.ok(parseOohKeywordIntentsFromText("체험형OOH").includes("experiential_ooh"));
  assert.ok(parseOohKeywordIntentsFromText("기차역").includes("rail_station"));
});

test("parsePlannerFreetextBrief: 공항·쇼핑몰 freetext", () => {
  const airport = parsePlannerFreetextBrief("서울 공항광고 3000만원");
  assert.ok(parseFreetextMediaIntents(airport.raw).includes("airport"));
  assert.ok(airport.fields.categories.value?.includes("digital"));

  const mall = parsePlannerFreetextBrief("쇼핑몰 오픈 옥외광고 3000만원");
  assert.ok(parseFreetextMediaIntents(mall.raw).includes("mall"));
});

test("keyword pattern collision scan: no pattern is substring of longer same-intent pattern only", () => {
  const compiled = compileOohKeywordPatternRegexes();
  assert.ok(compiled.length > 20);
  // 네이버 + 버스 false positive regression
  for (const { pattern, re } of compiled) {
    if (pattern === "버스" || pattern === "bus") {
      assert.equal(re.test("네이버"), false, `pattern ${pattern} matched 네이버`);
    }
  }
});
