import {
  type ContactBudgetV2,
  type ContactCampaignGoal,
} from "@/lib/contact-lead-schema";
import { normalizeCampaignGoal } from "@/lib/planner/normalize-campaign-goal";
import { PLANNER_BUDGET_MAX, PLANNER_BUDGET_MIN } from "@/lib/planner/types";
import type { MediaItem } from "@/lib/media-data";

/** `SavedPlannerPlan.planJson` — `/api/planner/save` 직렬화 형태 */
export type SavedPlannerPlanJson = {
  campaignGoal?: string | null;
  regions?: string[];
  categories?: string[];
  budget?: string;
  months?: number;
  ageKeys?: string[];
  ageKey?: string;
  industryKey?: string;
  campaignMediaIds?: string[];
  creativeUploadedUrl?: string | null;
  mediaPlacements?: Record<string, unknown>;
};

const PLAN_ID_RE = /^c[a-z0-9]{24,}$/i;

const PLANNER_GOAL_TO_CONTACT: Partial<
  Record<string, ContactCampaignGoal>
> = {
  brand: "brand_awareness",
  launch: "product_launch",
  event: "event_promo",
  sales: "store_traffic",
  local: "store_traffic",
};

export function plannerGoalToContactGoals(
  campaignGoal: string | null | undefined,
): ContactCampaignGoal[] {
  if (!campaignGoal) return [];
  const normalized = normalizeCampaignGoal(campaignGoal);
  const legacyMapped = PLANNER_GOAL_TO_CONTACT[normalized.displayKey];
  if (legacyMapped) return [legacyMapped];
  if (normalized.tags.includes("launch")) return ["product_launch"];
  if (normalized.funnel === "consideration" || normalized.tags.includes("event")) {
    return ["event_promo"];
  }
  if (normalized.funnel === "conversion") return ["store_traffic"];
  if (normalized.funnel === "awareness") return ["brand_awareness"];
  return ["other"];
}

export function isSavedPlannerPlanId(id: string): boolean {
  return PLAN_ID_RE.test(id.trim());
}

export function normalizePlannerBudgetManwon(budget: string | undefined): number {
  const n = Number(String(budget ?? "").replace(/[^\d]/g, ""));
  if (!Number.isFinite(n)) return PLANNER_BUDGET_MIN;
  return Math.min(
    PLANNER_BUDGET_MAX,
    Math.max(PLANNER_BUDGET_MIN, Math.round(n)),
  );
}

/** 플래너 총 예산(만원) + 기간 → contact v2 `budget` (월 환산) */
export function plannerBudgetToContactBudgetV2(
  budgetManwon: number,
  months: number,
): ContactBudgetV2 {
  const monthly = Math.round(budgetManwon / Math.max(1, months));
  if (monthly < 500) return "under_5m";
  if (monthly < 1000) return "5m_10m";
  if (monthly < 3000) return "10m_30m";
  return "over_30m";
}

function formatManwon(amount: number, isKo: boolean): string {
  if (isKo) {
    return `${amount.toLocaleString("ko-KR")}만원`;
  }
  return `₩${(amount * 10_000).toLocaleString("en-US")} (≈${amount.toLocaleString("en-US")}×10k KRW)`;
}

export function buildPlannerContactMessage(opts: {
  isKo: boolean;
  plan: SavedPlannerPlanJson;
  mediaItems: MediaItem[];
  goalLabel?: string | null;
  regionsText?: string | null;
}): string {
  const { isKo, plan, mediaItems, goalLabel, regionsText } = opts;
  const budgetManwon = normalizePlannerBudgetManwon(plan.budget);
  const months = Math.max(1, Number(plan.months) || 1);
  const lines: string[] = [];

  lines.push(
    isKo
      ? "[AI 미디어 플래너 — 견적 요청]"
      : "[AI Media Planner — quote request]",
  );
  lines.push("");

  if (goalLabel?.trim()) {
    lines.push(
      isKo ? `캠페인 목표: ${goalLabel.trim()}` : `Campaign goal: ${goalLabel.trim()}`,
    );
  }
  if (regionsText?.trim()) {
    lines.push(
      isKo ? `희망 지역: ${regionsText.trim()}` : `Target regions: ${regionsText.trim()}`,
    );
  }
  lines.push(
    isKo
      ? `예산: ${formatManwon(budgetManwon, true)} · 기간 ${months}개월 (월 약 ${formatManwon(Math.round(budgetManwon / months), true)})`
      : `Budget: ${formatManwon(budgetManwon, false)} · ${months} month(s) (≈${formatManwon(Math.round(budgetManwon / months), false)}/mo)`,
  );
  lines.push("");

  lines.push(isKo ? "희망 매체:" : "Preferred media:");
  if (mediaItems.length === 0) {
    const ids = plan.campaignMediaIds ?? [];
    if (ids.length === 0) {
      lines.push(isKo ? "(선택 매체 없음)" : "(no media selected)");
    } else {
      for (const id of ids) {
        lines.push(`- ${id}`);
      }
    }
  } else {
    for (const m of mediaItems) {
      const title = isKo ? m.name : m.nameEn || m.name;
      const loc = m.location;
      lines.push(`- ${title} (ID ${m.id}${loc ? ` · ${loc}` : ""})`);
    }
  }

  lines.push("");
  lines.push(
    isKo
      ? "위 플랜 기준으로 견적·일정 상담을 요청드립니다."
      : "Please follow up with a quote and schedule based on this plan.",
  );

  return lines.join("\n");
}
