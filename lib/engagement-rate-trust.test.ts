import assert from "node:assert/strict";
import { test } from "node:test";
import {
  decidePlaceholderEngagementRate,
  isPlaceholderEngagementRate,
  sanitizeUnsourcedEngagementCopyInText,
} from "./engagement-rate-trust.ts";

test("isPlaceholderEngagementRate flags 0.65 band", () => {
  assert.equal(isPlaceholderEngagementRate(0.65), true);
  assert.equal(isPlaceholderEngagementRate(0.5), false);
});

test("decidePlaceholderEngagementRate clears column-only 0.65", () => {
  assert.deepEqual(
    decidePlaceholderEngagementRate({ engagementRate: 0.65, description: null }),
    { clearRate: true, reason: "placeholder_no_source" },
  );
});

test("decidePlaceholderEngagementRate clears kpop-style effectMemo without source", () => {
  assert.deepEqual(
    decidePlaceholderEngagementRate({
      engagementRate: 0.65,
      effectMemo:
        "K-POP 콘텐츠 송출 시 참여율 0.65(65%) 수준의 높은 반응을 기대할 수 있습니다.",
    }),
    { clearRate: true, reason: "placeholder_no_source" },
  );
});

test("decidePlaceholderEngagementRate keeps when copy cites rate with source", () => {
  assert.deepEqual(
    decidePlaceholderEngagementRate({
      engagementRate: 0.65,
      description: "2024년 실측 조사 기준 참여율 65% (출처: 매체사)",
    }),
    { clearRate: false, reason: "sourced_copy" },
  );
});

test("decidePlaceholderEngagementRate ignores non-placeholder rates", () => {
  assert.deepEqual(decidePlaceholderEngagementRate({ engagementRate: 0.08 }), {
    clearRate: false,
    reason: "not_placeholder",
  });
});

test("sanitizeUnsourcedEngagementCopyInText strips kpop effectMemo placeholder clause", () => {
  const before =
    "팬덤 중심의 프리미엄 매체입니다. K-POP 콘텐츠 송출 시 참여율 0.65(65%) 수준의 높은 반응을 기대할 수 있습니다.";
  const { next, changed, reason } = sanitizeUnsourcedEngagementCopyInText(before);
  assert.equal(changed, true);
  assert.equal(reason, "stripped");
  assert.equal(
    next,
    "팬덤 중심의 프리미엄 매체입니다. K-POP 콘텐츠 송출 시 높은 반응을 기대할 수 있습니다.",
  );
  assert.doesNotMatch(next, /0\.65|65%/);
});

test("sanitizeUnsourcedEngagementCopyInText keeps copy when source cited", () => {
  const text = "2024년 실측 조사 기준 참여율 65% (출처: 매체사)";
  assert.equal(sanitizeUnsourcedEngagementCopyInText(text).changed, false);
});
