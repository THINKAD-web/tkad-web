"use client";

import { useEffect, useRef } from "react";
import { useAuthSession } from "@/components/auth/auth-session-provider";
import {
  applySyncedPlanCart,
  getPlanCart,
  PLAN_CART_CHANGE_EVENT,
} from "@/lib/plan-cart";
import { pushPlanCartToServer } from "@/lib/plan-cart-server-sync";

function parseUpdatedAt(iso: string | undefined): number {
  if (!iso) return 0;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : 0;
}

/** 로그인 시 localStorage 플랜 ↔ DB 동기화 (삭제·추가·순서 반영) */
export function PlanCartSessionSync() {
  const { user, loading } = useAuthSession();
  const loggedIn = Boolean(user?.id);
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncGenerationRef = useRef(0);
  const applyingFromServerRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    async function syncCart(): Promise<void> {
      if (!loggedIn || cancelled) return;

      const cartAtStart = getPlanCart();
      const sentUpdatedAt = cartAtStart.updatedAt;
      const sentUpdatedMs = parseUpdatedAt(sentUpdatedAt);
      const generation = ++syncGenerationRef.current;

      const merged = await pushPlanCartToServer(cartAtStart);
      if (cancelled || generation !== syncGenerationRef.current) return;
      if (!merged) return;

      const cartNow = getPlanCart();
      const nowUpdatedMs = parseUpdatedAt(cartNow.updatedAt);
      if (nowUpdatedMs > sentUpdatedMs) {
        void syncCart();
        return;
      }

      applyingFromServerRef.current = true;
      applySyncedPlanCart(merged);
      queueMicrotask(() => {
        applyingFromServerRef.current = false;
      });
    }

    if (loggedIn) {
      void syncCart();
    }

    const onCartChange = () => {
      if (!loggedIn || applyingFromServerRef.current) return;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      syncTimerRef.current = setTimeout(() => {
        void syncCart();
      }, 400);
    };

    window.addEventListener(PLAN_CART_CHANGE_EVENT, onCartChange);
    return () => {
      cancelled = true;
      syncGenerationRef.current += 1;
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
      window.removeEventListener(PLAN_CART_CHANGE_EVENT, onCartChange);
    };
  }, [loading, loggedIn]);

  return null;
}
