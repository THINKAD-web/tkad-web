import type { PlanCart } from "@/lib/plan-cart";

/** 로그인 사용자: localStorage 플랜 카트를 서버에 반영하고 병합 결과를 반환 */
export async function pushPlanCartToServer(
  cart: PlanCart,
): Promise<PlanCart | null> {
  try {
    const sessionRes = await fetch("/api/auth/session", { cache: "no-store" });
    const sessionData = await sessionRes.json();
    if (!sessionData?.ok || !sessionData.data) return null;

    const res = await fetch("/api/my/plan/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.items,
        campaignGoal: cart.campaignGoal,
        totalBudget: cart.totalBudget,
        duration: cart.duration,
        updatedAt: cart.updatedAt,
      }),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as {
      ok?: boolean;
      data?: {
        items: PlanCart["items"];
        campaignGoal?: string;
        totalBudget?: number;
        duration?: number;
        updatedAt: string;
      };
    };
    if (!data?.ok || !data.data) return null;

    return {
      items: data.data.items,
      campaignGoal: data.data.campaignGoal,
      totalBudget: data.data.totalBudget,
      duration: data.data.duration,
      updatedAt: data.data.updatedAt,
    };
  } catch {
    return null;
  }
}
