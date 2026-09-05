import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  formatTargetingSummary,
  groupTargetingOptions,
  parseTargetingTag,
  targetingGroupsDisplay,
  targetingHasValue,
} from "@/lib/online/online-targeting-tags";
import { onlineTargetingLabel } from "@/lib/online/online-detail-spec";

const SAMPLE = [
  "industry:ECOMMERCE",
  "industry:BEAUTY",
  "goal:AWARENESS",
  "age:18-24",
  "age:25-34",
  "gender:ALL",
  "geo:KR",
];

describe("online-targeting-tags", () => {
  it("parses category:value tags", () => {
    assert.deepEqual(parseTargetingTag("industry:ECOMMERCE"), {
      category: "industry",
      value: "ECOMMERCE",
    });
    assert.equal(parseTargetingTag("not-a-tag"), null);
    assert.equal(parseTargetingTag("unknown:VALUE"), null);
  });

  it("groups tags by category", () => {
    const groups = groupTargetingOptions(SAMPLE);
    assert.deepEqual(groups.industry, ["ECOMMERCE", "BEAUTY"]);
    assert.deepEqual(groups.goal, ["AWARENESS"]);
    assert.deepEqual(groups.age, ["18-24", "25-34"]);
  });

  it("targetingHasValue checks exact tag presence", () => {
    assert.equal(targetingHasValue(SAMPLE, "industry", "ECOMMERCE"), true);
    assert.equal(targetingHasValue(SAMPLE, "industry", "FNB"), false);
  });

  it("builds ko display groups with readable labels", () => {
    const groups = targetingGroupsDisplay(SAMPLE, true);
    const industry = groups.find((g) => g.category === "industry");
    assert.ok(industry);
    assert.equal(industry.groupLabel, "업종");
    assert.equal(industry.valueLabel, "이커머스·뷰티");
  });

  it("formats a one-line ko summary", () => {
    const summary = formatTargetingSummary(SAMPLE, true);
    assert.match(summary ?? "", /업종: 이커머스·뷰티/);
    assert.match(summary ?? "", /목표: 인지도/);
    assert.match(summary ?? "", /지역: 전국/);
  });

  it("onlineTargetingLabel falls back to 문의 when no tags at all", () => {
    assert.equal(
      onlineTargetingLabel({ targetingOptions: [] } as never, true),
      "문의",
    );
  });

  it("onlineTargetingLabel returns grouped summary when tags parse", () => {
    const label = onlineTargetingLabel({ targetingOptions: SAMPLE } as never, true);
    assert.match(label, /업종:/);
  });
});
