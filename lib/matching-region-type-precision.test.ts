import assert from "node:assert/strict";
import test from "node:test";
import { mediaMatchesBillboardIntent } from "@/lib/planner-logic";
import { parseFreetextMediaIntents } from "@/lib/recommend/freetext-media-intents";
import {
  matchPrecisionLabel,
} from "@/lib/matching-engine";
import type { MediaItem } from "@/lib/media-data";

test("parseFreetextMediaIntents: 전광판 → billboard", () => {
  assert.ok(parseFreetextMediaIntents("홍대 전광판").includes("billboard"));
  assert.ok(parseFreetextMediaIntents("코엑스 LED 전광판").includes("billboard"));
  assert.ok(!parseFreetextMediaIntents("홍대 지하철 역사").includes("billboard"));
});

test("mediaMatchesBillboardIntent distinguishes wrap vs board", () => {
  assert.equal(
    mediaMatchesBillboardIntent({
      id: "a",
      name: "신촌 31 전광판 광고",
      type: "digital",
      subCategory: "전광판",
      mediaSubCategory: "digital_signage",
    } as MediaItem),
    true,
  );
  assert.equal(
    mediaMatchesBillboardIntent({
      id: "b",
      name: "지하철 2호선 홍대입구역 아트래핑 광고",
      type: "digital",
      subCategory: "지하철",
      mediaSubCategory: "subway_station",
    } as MediaItem),
    false,
  );
});

test("matchPrecisionLabel", () => {
  assert.equal(matchPrecisionLabel("exact", true), "정확 매칭");
  assert.equal(matchPrecisionLabel("near", true), "인근·유사 추천");
  assert.equal(matchPrecisionLabel("exact", false), "Exact match");
});
