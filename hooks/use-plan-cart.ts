"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addManyToPlanCart,
  addToPlanCart,
  clearPlanCart,
  getPlanCart,
  getPlanCartCount,
  isInPlanCart,
  PLAN_CART_CHANGE_EVENT,
  PLAN_CART_KEY,
  removeFromPlanCart,
  savePlanCartMeta,
  type AddToPlanCartResult,
  type BulkAddToPlanCartResult,
  type PlanCart,
  type PlanCartItem,
} from "@/lib/plan-cart";

const EMPTY_PLAN_CART: PlanCart = {
  items: [],
  updatedAt: new Date(0).toISOString(),
};

export function usePlanCart() {
  const [cart, setCart] = useState<PlanCart>(EMPTY_PLAN_CART);

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
      addToPlanCart(item),
    [],
  );

  const addMany = useCallback(
    (items: Omit<PlanCartItem, "addedAt">[]): BulkAddToPlanCartResult =>
      addManyToPlanCart(items),
    [],
  );

  const remove = useCallback((mediaId: string) => {
    removeFromPlanCart(mediaId);
  }, []);

  const clear = useCallback(() => {
    clearPlanCart();
  }, []);

  const updateMeta = useCallback(
    (
      patch: Partial<
        Pick<PlanCart, "campaignGoal" | "totalBudget" | "duration">
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
    add,
    addMany,
    remove,
    clear,
    updateMeta,
    has,
    isInPlanCart,
    getPlanCartCount,
  };
}
