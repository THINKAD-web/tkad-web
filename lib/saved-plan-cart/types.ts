import type { PlanCart, PlanCartItem } from "@/lib/plan-cart";

export const SAVED_PLAN_CART_STATUSES = ["saved", "deleted"] as const;
export type SavedPlanCartStatus = (typeof SAVED_PLAN_CART_STATUSES)[number];

export const SAVED_PLAN_PUBLISH_INTENTS = [
  "case",
  "community",
] as const;
export type SavedPlanPublishIntent = (typeof SAVED_PLAN_PUBLISH_INTENTS)[number];

export type SavedPlanCartSource = "plan_cart" | "plan_report";

export type SavedPlanCartReportSummary = {
  goalTitle?: string;
  regionsText?: string;
  categoriesText?: string;
  mediaCount?: number;
  budgetMan?: number;
  months?: number;
  regionalBreakdown?: {
    regionKey: string;
    label: string;
    mediaCount: number;
    budgetPct: number;
  }[];
};

export type SavedPlanCartSnapshot = {
  items: PlanCartItem[];
  campaignGoal?: string;
  totalBudget?: number;
  duration?: number;
  updatedAt: string;
};

export type SavedPlanCartListItem = {
  id: string;
  title: string;
  description: string | null;
  source: SavedPlanCartSource;
  mediaCount: number;
  regionsText: string | null;
  goalTitle: string | null;
  publishIntent: SavedPlanPublishIntent | null;
  createdAt: string;
  updatedAt: string;
};

export type SavedPlanCartDetail = SavedPlanCartListItem & {
  items: PlanCartItem[];
  campaignGoal: string | null;
  totalBudget: number | null;
  duration: number | null;
  reportSummary: SavedPlanCartReportSummary | null;
};

export function planCartToSnapshot(cart: PlanCart): SavedPlanCartSnapshot {
  return {
    items: cart.items,
    campaignGoal: cart.campaignGoal,
    totalBudget: cart.totalBudget,
    duration: cart.duration,
    updatedAt: cart.updatedAt,
  };
}

export function snapshotToPlanCart(snapshot: SavedPlanCartSnapshot): PlanCart {
  return {
    items: snapshot.items,
    campaignGoal: snapshot.campaignGoal,
    totalBudget: snapshot.totalBudget,
    duration: snapshot.duration,
    updatedAt: snapshot.updatedAt || new Date().toISOString(),
  };
}

export function defaultSavedPlanTitle(
  cart: PlanCart,
  isKo: boolean,
): string {
  const count = cart.items.length;
  const date = new Date().toLocaleDateString(isKo ? "ko-KR" : "en-US", {
    month: "short",
    day: "numeric",
  });
  return isKo ? `내 플랜 ${count}개 · ${date}` : `My plan · ${count} media · ${date}`;
}
