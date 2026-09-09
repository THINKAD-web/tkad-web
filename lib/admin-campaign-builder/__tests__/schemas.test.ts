import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  campaignBuilderPayloadSchema,
} from "@/lib/admin-campaign-builder/schemas";

const validPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital" as const,
  documentType: "proposal" as const,
  title: "테스트 제안",
  digitalLines: [{ slug: "ig-awareness-reach", budgetWon: 1_000_000 }],
  oohLines: [],
  customLines: [],
};

describe("campaignBuilderPayloadSchema", () => {
  it("accepts valid payload v1", () => {
    const parsed = campaignBuilderPayloadSchema.safeParse(validPayload);
    assert.equal(parsed.success, true);
  });

  it("rejects missing title", () => {
    const parsed = campaignBuilderPayloadSchema.safeParse({
      ...validPayload,
      title: "",
    });
    assert.equal(parsed.success, false);
  });

  it("rejects negative budgetWon", () => {
    const parsed = campaignBuilderPayloadSchema.safeParse({
      ...validPayload,
      digitalLines: [{ slug: "ig-awareness-reach", budgetWon: -1 }],
    });
    assert.equal(parsed.success, false);
  });

  it("rejects version mismatch", () => {
    const parsed = campaignBuilderPayloadSchema.safeParse({
      ...validPayload,
      version: 2,
    });
    assert.equal(parsed.success, false);
  });

  it("rejects digital line without slug", () => {
    const parsed = campaignBuilderPayloadSchema.safeParse({
      ...validPayload,
      digitalLines: [{ slug: "", budgetWon: 0 }],
    });
    assert.equal(parsed.success, false);
  });

  it("accepts insightsOverride partial shape", () => {
    const parsed = campaignBuilderPayloadSchema.safeParse({
      ...validPayload,
      insightsOverride: {
        creativeDirections: ["UGC 소재 2종 준비"],
        pacingPlan: [
          {
            label: "Learning",
            sharePct: 20,
            description: "초기 학습",
          },
        ],
      },
    });
    assert.equal(parsed.success, true);
  });
});
