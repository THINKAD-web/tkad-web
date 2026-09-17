import assert from "node:assert/strict";
import { test } from "node:test";
import { isPlanCartAccountSwitch } from "@/lib/plan-cart-session-owner";
import { resolveSyncedPlanCartItems } from "@/lib/plan-cart-sync-merge";

test("isPlanCartAccountSwitch — bound 없음이면 게스트→로그인 병합 허용", () => {
  assert.equal(isPlanCartAccountSwitch(null, "user-b"), false);
});

test("isPlanCartAccountSwitch — 동일 사용자", () => {
  assert.equal(isPlanCartAccountSwitch("user-a", "user-a"), false);
});

test("isPlanCartAccountSwitch — 계정 전환", () => {
  assert.equal(isPlanCartAccountSwitch("user-a", "user-b"), true);
});

test("계정 B 로그인 시 A 로컬을 POST하면 서버에 A 매체가 병합될 수 있음 (수정 전 버그 시나리오)", () => {
  const userAItems = [
    {
      mediaId: "media-from-a",
      mediaName: "A only",
      mediaType: "billboard",
      region: "서울",
      price: 100,
      addedFrom: "search" as const,
      addedAt: "2026-09-17T00:00:00.000Z",
    },
  ];
  const userBRemote: typeof userAItems = [];
  const localUpdated = Date.parse("2026-09-17T12:00:00.000Z");
  const remoteUpdated = 0;
  const merged = resolveSyncedPlanCartItems(
    userAItems,
    userBRemote,
    50,
    localUpdated,
    remoteUpdated,
  );
  assert.equal(merged.length, 1);
  assert.equal(merged[0]?.mediaId, "media-from-a");
});
