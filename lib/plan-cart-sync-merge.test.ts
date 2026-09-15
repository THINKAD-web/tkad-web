import assert from "node:assert/strict";
import { test } from "node:test";
import type { PlanCartItem } from "@/lib/plan-cart";
import {
  mergePlanCartItemsUnion,
  resolveSyncedPlanCartItems,
} from "@/lib/plan-cart-sync-merge";

function item(id: string): PlanCartItem {
  return {
    mediaId: id,
    mediaName: id,
    mediaType: "billboard",
    region: "서울",
    price: 1000,
    addedFrom: "search",
    addedAt: "2026-01-01T00:00:00.000Z",
  };
}

test("resolveSyncedPlanCartItems: clear plan wins over newer remote", () => {
  const local: PlanCartItem[] = [];
  const remote = [item("a"), item("b")];
  const result = resolveSyncedPlanCartItems(local, remote, 30, 2000, 3000);
  assert.deepEqual(
    result.map((i) => i.mediaId),
    [],
  );
});

test("resolveSyncedPlanCartItems: partial delete wins over newer remote", () => {
  const local = [item("a")];
  const remote = [item("a"), item("b")];
  const result = resolveSyncedPlanCartItems(local, remote, 30, 2000, 3000);
  assert.deepEqual(
    result.map((i) => i.mediaId),
    ["a"],
  );
});

test("resolveSyncedPlanCartItems: first login adopts remote when local never edited", () => {
  const remote = [item("a"), item("b")];
  const result = resolveSyncedPlanCartItems([], remote, 30, 0, 1000);
  assert.deepEqual(
    result.map((i) => i.mediaId),
    ["a", "b"],
  );
});

test("resolveSyncedPlanCartItems: equal timestamps union concurrent adds", () => {
  const local = [item("a"), item("b")];
  const remote = [item("a"), item("c")];
  const result = resolveSyncedPlanCartItems(local, remote, 30, 1000, 1000);
  assert.deepEqual(
    result.map((i) => i.mediaId).sort(),
    ["a", "b", "c"],
  );
});

test("mergePlanCartItemsUnion dedupes by mediaId", () => {
  const result = mergePlanCartItemsUnion(
    [item("a"), item("b")],
    [item("a"), item("c")],
    30,
  );
  assert.deepEqual(
    result.map((i) => i.mediaId),
    ["a", "b", "c"],
  );
});
