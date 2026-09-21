import { describe, expect, it } from "vitest";
import {
  decidePlaceholderEngagementRate,
  isPlaceholderEngagementRate,
} from "./engagement-rate-trust.ts";

describe("isPlaceholderEngagementRate", () => {
  it("flags 0.65 band", () => {
    expect(isPlaceholderEngagementRate(0.65)).toBe(true);
    expect(isPlaceholderEngagementRate(0.5)).toBe(false);
  });
});

describe("decidePlaceholderEngagementRate", () => {
  it("clears column-only 0.65", () => {
    expect(
      decidePlaceholderEngagementRate({ engagementRate: 0.65, description: null }),
    ).toEqual({ clearRate: true, reason: "placeholder_no_source" });
  });

  it("clears kpop-style effectMemo without source", () => {
    expect(
      decidePlaceholderEngagementRate({
        engagementRate: 0.65,
        effectMemo:
          "K-POP 콘텐츠 송출 시 참여율 0.65(65%) 수준의 높은 반응을 기대할 수 있습니다.",
      }),
    ).toEqual({ clearRate: true, reason: "placeholder_no_source" });
  });

  it("keeps when copy cites rate with source", () => {
    expect(
      decidePlaceholderEngagementRate({
        engagementRate: 0.65,
        description: "2024년 실측 조사 기준 참여율 65% (출처: 매체사)",
      }),
    ).toEqual({ clearRate: false, reason: "sourced_copy" });
  });

  it("ignores non-placeholder rates", () => {
    expect(
      decidePlaceholderEngagementRate({ engagementRate: 0.08 }),
    ).toEqual({ clearRate: false, reason: "not_placeholder" });
  });
});
