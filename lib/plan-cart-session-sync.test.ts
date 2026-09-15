import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlanCart } from "@/lib/plan-cart";

function wouldResurrectDeletedItems(local: PlanCart, merged: PlanCart): boolean {
  if (merged.items.length <= local.items.length) return false;
  const localIds = new Set(local.items.map((i) => i.mediaId));
  return merged.items.some((i) => !localIds.has(i.mediaId));
}

test("wouldResurrectDeletedItems detects stale server merge", () => {
  const local: PlanCart = {
    items: [
      {
        mediaId: "a",
        mediaName: "A",
        mediaType: "billboard",
        region: "서울",
        price: 1,
        addedFrom: "search",
        addedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    updatedAt: "2026-01-02T00:00:00.000Z",
  };
  const merged: PlanCart = {
    items: [
      local.items[0]!,
      {
        mediaId: "b",
        mediaName: "B",
        mediaType: "billboard",
        region: "서울",
        price: 1,
        addedFrom: "search",
        addedAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    updatedAt: "2026-01-03T00:00:00.000Z",
  };
  assert.equal(wouldResurrectDeletedItems(local, merged), true);
});
