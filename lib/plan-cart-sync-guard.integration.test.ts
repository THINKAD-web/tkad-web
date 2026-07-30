/**
 * Plan cart atomic mutation + sync grace integration smoke test.
 */
import assert from "node:assert/strict";
import { beforeEach, describe, it } from "node:test";
import {
  resetPlanCartLocalGuardForTests,
  setPlanCartUserEditing,
  shouldDeferServerPlanCartApply,
  touchPlanCartLocalEdit,
} from "@/lib/plan-cart-local-guard";

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  resetPlanCartLocalGuardForTests();
  (globalThis as { window?: Window }).window = {
    localStorage: {
      getItem: (k: string) => (storage.has(k) ? storage.get(k)! : null),
      setItem: (k: string, v: string) => {
        storage.set(k, v);
      },
      removeItem: (k: string) => {
        storage.delete(k);
      },
    },
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  } as unknown as Window;
});

describe("plan cart sync guard scenario", () => {
  it("budget edit grace blocks stale server apply window", async () => {
    const { savePlanCartMeta, getPlanCart, applySyncedPlanCart, clearPlanCart } =
      await import("@/lib/plan-cart");

    clearPlanCart();
    savePlanCartMeta({ totalBudget: 50_000_000 });

    setPlanCartUserEditing(true);
    savePlanCartMeta({ totalBudget: 48_000_000 });
    assert.equal(getPlanCart().totalBudget, 48_000_000);

    const staleServer = {
      ...getPlanCart(),
      totalBudget: 50_000_000,
      updatedAt: new Date(Date.now() - 60_000).toISOString(),
    };

    if (!shouldDeferServerPlanCartApply()) {
      applySyncedPlanCart(staleServer);
    }

    assert.equal(getPlanCart().totalBudget, 48_000_000);

    setPlanCartUserEditing(false);
    touchPlanCartLocalEdit();
    assert.equal(shouldDeferServerPlanCartApply(), true);
  });

  it("rapid adds retain all items via atomic mutation", async () => {
    const { addToPlanCart, getPlanCart, clearPlanCart } = await import(
      "@/lib/plan-cart"
    );

    clearPlanCart();
    const maxItems = 30;
    for (let i = 0; i < 20; i++) {
      addToPlanCart(
        {
          mediaId: `m${i}`,
          mediaName: `Media ${i}`,
          mediaType: "billboard",
          region: "서울",
          price: 1000,
          addedFrom: "search",
        },
        maxItems,
      );
    }
    assert.equal(getPlanCart().items.length, 20);
  });
});
