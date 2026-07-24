import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DIGITAL_CHANNELS } from "@/lib/planner/digital-channels";
import { recommendDigitalChannels } from "@/lib/planner/recommend-digital";

/** Guard: ThinkadDigitalPackageCard must not expand or alter CPC channel catalog. */
describe("recommendDigitalChannels regression (no Thinkad Digital package in catalog)", () => {
  it("keeps DIGITAL_CHANNELS ids unchanged", () => {
    assert.deepEqual(
      DIGITAL_CHANNELS.map((c) => c.id),
      ["naver", "kakao", "google", "meta", "daangn", "buzzvil", "tiktok"],
    );
    assert.equal(
      DIGITAL_CHANNELS.some((c) => /thinkad|dmpilot|digital_package/i.test(c.id)),
      false,
    );
  });

  it("stable scores/impressions for fixed inputs", () => {
    const result = recommendDigitalChannels({
      goal: "brand",
      regions: ["seoul"],
      portfolio: [
        {
          id: "m1",
          name: "테스트전광판",
          region: "서울",
        } as never,
      ],
      budgetMan: 1000,
      digitalBudgetPct: 30,
      selectedChannelIds: ["naver", "kakao", "meta", "daangn", "buzzvil"],
    });

    assert.equal(result.digitalBudgetPct, 30);
    assert.equal(result.oohBudgetPct, 70);
    assert.equal(result.totalDigitalBudgetMan, 300);
    assert.equal(result.channels.length, 5);

    const byId = Object.fromEntries(
      result.channels.map((c) => [
        c.channel.id,
        { score: c.score, budgetPct: c.budgetPct, impressions: c.estimatedImpressions },
      ]),
    );

    // Golden snapshot — change only if scoring intentionally changes
    assert.deepEqual(byId, {
      meta: { score: 96.60000000000001, budgetPct: 7, impressions: 74157 },
      naver: { score: 90, budgetPct: 6, impressions: 86111 },
      buzzvil: { score: 90, budgetPct: 6, impressions: 193750 },
      kakao: { score: 85, budgetPct: 6, impressions: 89231 },
      daangn: { score: 75, budgetPct: 5, impressions: 89655 },
    });
  });
});
