"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addManyToPlanCart,
  addToPlanCart,
  clearPlanCart,
  getPlanCart,
  getPlanCartCount,
  isInPlanCart,
  planCartMaxItems,
  PLAN_CART_CHANGE_EVENT,
  PLAN_CART_KEY,
  removeFromPlanCart,
  reorderPlanCartItems,
  savePlanCartMeta,
  type AddToPlanCartResult,
  type BulkAddToPlanCartResult,
  type PlanCart,
  type PlanCartItem,
} from "@/lib/plan-cart";
import { useIsPro } from "@/hooks/use-is-pro";

const EMPTY_PLAN_CART: PlanCart = {
  items: [],
  updatedAt: new Date(0).toISOString(),
};

export function usePlanCart() {
  const [cart, setCart] = useState<PlanCart>(EMPTY_PLAN_CART);
  const { isPro } = useIsPro();
  const maxItems = planCartMaxItems(isPro);

  useEffect(() => {
    const sync = () => setCart(getPlanCart());
    sync();
    const onChange = (e: Event) => {
      const detail = (e as CustomEvent<PlanCart>).detail;
      setCart(detail ?? getPlanCart());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === PLAN_CART_KEY) sync();
    };
    window.addEventListener(PLAN_CART_CHANGE_EVENT, onChange);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(PLAN_CART_CHANGE_EVENT, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const add = useCallback(
    (item: Omit<PlanCartItem, "addedAt">): AddToPlanCartResult =>
      addToPlanCart(item, maxItems),
    [maxItems],
  );

  const addMany = useCallback(
    (items: Omit<PlanCartItem, "addedAt">[]): BulkAddToPlanCartResult =>
      addManyToPlanCart(items, maxItems),
    [maxItems],
  );

  const remove = useCallback((mediaId: string) => {
    removeFromPlanCart(mediaId);
  }, []);

  const reorder = useCallback((fromIndex: number, toIndex: number) => {
    reorderPlanCartItems(fromIndex, toIndex);
  }, []);

  const clear = useCallback(() => {
    clearPlanCart();
  }, []);

  const updateMeta = useCallback(
    (
      patch: Partial<
        Pick<
          PlanCart,
          "campaignGoal" | "totalBudget" | "duration" | "industryKey"
        >
      >,
    ) => {
      savePlanCartMeta(patch);
    },
    [],
  );

  const has = useCallback(
    (mediaId: string) => cart.items.some((i) => i.mediaId === mediaId),
    [cart.items],
  );

  return {
    cart,
    count: cart.items.length,
    maxItems,
    add,
    addMany,
    remove,
    reorder,
    clear,
    updateMeta,
    has,
    isInPlanCart,
    getPlanCartCount,
  };
}
