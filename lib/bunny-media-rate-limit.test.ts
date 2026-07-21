import assert from "node:assert/strict";
import test from "node:test";
import {
  BUNNY_MEDIA_RATE_LIMIT,
  allowBunnyMediaRequest,
} from "./bunny-media-rate-limit";

test("allowBunnyMediaRequest: normal page-sized burst stays under limit", () => {
  const key = `page-burst-${Date.now()}-${Math.random()}`;
  // 한 페이지 수십 장 × 몇 뷰 — 정상 트래픽
  for (let i = 0; i < 80; i++) {
    assert.equal(allowBunnyMediaRequest(key), true, `request ${i} should pass`);
  }
});

test("allowBunnyMediaRequest: exceeds per-IP window → blocked", () => {
  const key = `flood-${Date.now()}-${Math.random()}`;
  for (let i = 0; i < BUNNY_MEDIA_RATE_LIMIT; i++) {
    assert.equal(allowBunnyMediaRequest(key), true);
  }
  assert.equal(allowBunnyMediaRequest(key), false);
});

test("allowBunnyMediaRequest: separate IPs have independent budgets", () => {
  const a = `ip-a-${Date.now()}-${Math.random()}`;
  const b = `ip-b-${Date.now()}-${Math.random()}`;
  for (let i = 0; i < BUNNY_MEDIA_RATE_LIMIT; i++) {
    assert.equal(allowBunnyMediaRequest(a), true);
  }
  assert.equal(allowBunnyMediaRequest(a), false);
  assert.equal(allowBunnyMediaRequest(b), true);
});
