import assert from "node:assert/strict";
import test from "node:test";
import {
  GOOGLE_QUAD_GRADIENT,
  resolveOnlinePlatformBadgeSpec,
} from "@/lib/online/online-platform-badge-spec";
import { onlineCardRecommendTags } from "@/lib/online/online-card-tags";

test("resolveOnlinePlatformBadgeSpec — Google search/display/lead share G + quad gradient", () => {
  for (const platform of [
    "Google Ads Search",
    "Google Display Network",
    "Google Ads",
  ]) {
    const spec = resolveOnlinePlatformBadgeSpec(platform);
    assert.equal(spec.initial, "G");
    assert.equal(spec.background, GOOGLE_QUAD_GRADIENT);
  }
});

test("resolveOnlinePlatformBadgeSpec — Performance Max uses PM", () => {
  const spec = resolveOnlinePlatformBadgeSpec("Google Performance Max");
  assert.equal(spec.initial, "PM");
  assert.equal(spec.background, GOOGLE_QUAD_GRADIENT);
});

test("onlineCardRecommendTags — naver-brand-search and coupang overrides", () => {
  assert.deepEqual(onlineCardRecommendTags("naver-brand-search"), [
    "브랜드존",
    "정액 고정비",
  ]);
  assert.deepEqual(onlineCardRecommendTags("coupang-ad-traffic"), [
    "마켓 노출",
    "이커머스",
  ]);
});
