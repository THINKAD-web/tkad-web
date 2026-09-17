import type { PlanCart } from "@/lib/plan-cart";

function parsePlanCartSyncPayload(data: {
  items: PlanCart["items"];
  campaignGoal?: string;
  totalBudget?: number;
  budgetTbd?: boolean;
  duration?: number;
  updatedAt: string;
}): PlanCart {
  return {
    items: data.items,
    campaignGoal: data.campaignGoal,
    totalBudget: data.totalBudget,
    budgetTbd: data.budgetTbd,
    duration: data.duration,
    updatedAt: data.updatedAt,
  };
}

/** 로그인 사용자 DB 저장 플랜 카트 조회 (계정 전환 시 로컬 교체용) */
export async function fetchPlanCartFromServer(): Promise<PlanCart | null> {
  try {
    const res = await fetch("/api/my/plan/sync", {
      method: "GET",
      credentials: "include",
      cache: "no-store",
    });
    if (res.status === 401 || !res.ok) return null;

    const data = (await res.json()) as {
      ok?: boolean;
      data?: {
        items: PlanCart["items"];
        campaignGoal?: string;
        totalBudget?: number;
        budgetTbd?: boolean;
        duration?: number;
        updatedAt: string;
      };
    };
    if (!data?.ok || !data.data) return null;
    return parsePlanCartSyncPayload(data.data);
  } catch {
    return null;
  }
}

/** 로그인 사용자: localStorage 플랜 카트를 서버에 반영하고 병합 결과를 반환 */
export async function pushPlanCartToServer(
  cart: PlanCart,
): Promise<PlanCart | null> {
  try {
    const res = await fetch("/api/my/plan/sync", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.items,
        campaignGoal: cart.campaignGoal,
        totalBudget: cart.totalBudget,
        budgetTbd: cart.budgetTbd,
        duration: cart.duration,
        updatedAt: cart.updatedAt,
      }),
    });
    if (res.status === 401 || !res.ok) return null;

    const data = (await res.json()) as {
      ok?: boolean;
      data?: {
        items: PlanCart["items"];
        campaignGoal?: string;
        totalBudget?: number;
        budgetTbd?: boolean;
        duration?: number;
        updatedAt: string;
      };
    };
    if (!data?.ok || !data.data) return null;

    return parsePlanCartSyncPayload(data.data);
  } catch {
    return null;
  }
}
