import assert from "node:assert/strict";
import { test } from "node:test";
import { parseInquiryRegionBlocks, REAL_INQUIRY_ACCEPTANCE_CASE } from "./parse-inquiry-regions";
import {
  parseFreetextMediaIntentsDetailed,
  MEDIA_INTENT_CATALOG,
} from "@/lib/recommend/freetext-media-intents";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";

export const REAL_INQUIRY_CASE = REAL_INQUIRY_ACCEPTANCE_CASE;

test("real inquiry: 4 regions with sigungu names", () => {
  const parsed = parseInquiryRegionBlocks(REAL_INQUIRY_CASE);
  assert.equal(parsed.blocks.length, 4);
  assert.equal(parsed.perRegionBudget, true);
  assert.equal(parsed.blocks.every((b) => b.budgetWon === 2_000_000), true);

  const labels = parsed.blocks.map((b) => b.label);
  assert.ok(labels.some((l) => /기장/.test(l)));
  assert.ok(labels.some((l) => /울주/.test(l)));
  assert.ok(labels.some((l) => /영광/.test(l)));
  assert.ok(labels.some((l) => /경주/.test(l)));

  const codes = new Set(parsed.blocks.flatMap((b) => b.regionCodes));
  assert.ok(codes.has("busan"));
  assert.ok(codes.has("ulsan"));
  assert.ok(codes.has("jeolla"));
  assert.ok(codes.has("gyeongsang"));
});

test("real inquiry: media intents distinguished", () => {
  const media = parseFreetextMediaIntentsDetailed(REAL_INQUIRY_CASE);
  assert.ok(media.intents.includes("delivery_vehicle"));
  assert.ok(media.intents.includes("subway"));
  assert.ok(media.intents.includes("intercity_bus_terminal"));
  assert.ok(media.intents.includes("express_bus_terminal"));
  assert.ok(media.intents.includes("train_station"));
  assert.ok(media.intents.includes("bus_shelter"));

  assert.equal(MEDIA_INTENT_CATALOG.intercity_bus_terminal.available, false);
  assert.ok(media.unavailable.some((u) => u.intent === "intercity_bus_terminal"));

  assert.ok(
    media.conditions.some(
      (c) => c.intent === "subway" && c.condition === "subway_where_available",
    ),
  );
});

test("real inquiry: public sector industry", () => {
  const brief = parsePlannerFreetextBrief(REAL_INQUIRY_CASE);
  assert.equal(brief.fields.industryKey.value, "indOther");
  assert.ok(/공공/.test(brief.fields.industryKey.source ?? ""));
});

test("per-region budget not applied to single region", () => {
  const parsed = parseInquiryRegionBlocks("서울 강남 예산 500만원 1개월");
  assert.equal(parsed.blocks.length, 0);
  assert.ok(parsed.single);
});

test("legacy single region still parses", () => {
  const parsed = parseInquiryRegionBlocks(
    "인천공항 예산 3000만원 1개월 지하철 광고",
  );
  assert.equal(parsed.blocks.length, 0);
  assert.ok(parsed.single);
  assert.equal(parsed.single!.budgetWon, 30_000_000);
});
