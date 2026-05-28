"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { getPlanCart, replacePlanCart } from "@/lib/plan-cart";

/** 로그인 시 localStorage 플랜 → DB 동기화, DB가 더 최신이면 병합 */
export function PlanCartSessionSync() {
  const pathname = usePathname();
  const syncedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
        const sessionData = await sessionRes.json();
        if (cancelled || !sessionData?.ok || !sessionData.data) {
          syncedRef.current = false;
          return;
        }
        if (syncedRef.current) return;

        const local = getPlanCart();
        const res = await fetch("/api/my/plan/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: local.items,
            campaignGoal: local.campaignGoal,
            totalBudget: local.totalBudget,
            duration: local.duration,
            updatedAt: local.updatedAt,
          }),
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          ok?: boolean;
          data?: {
            items: typeof local.items;
            campaignGoal?: string;
            totalBudget?: number;
            duration?: number;
            updatedAt: string;
          };
        };
        if (data?.ok && data.data) {
          const merged = {
            items: data.data.items.length > 0 ? data.data.items : local.items,
            campaignGoal: data.data.campaignGoal ?? local.campaignGoal,
            totalBudget: data.data.totalBudget ?? local.totalBudget,
            duration: data.data.duration ?? local.duration,
            updatedAt: data.data.updatedAt,
          };
          replacePlanCart(merged);
        }
        syncedRef.current = true;
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return null;
}
