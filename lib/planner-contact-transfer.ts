import type {
  ContactBudgetV2,
  ContactCampaignGoal,
} from "@/lib/contact-lead-schema";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";

export const PLAN_DATA_STORAGE_KEY = "tkad_plan_data";

export type PlanTransferSource = "planner" | "ai_recommend" | "integrated";

export interface PlanTransferData {
  mediaIds: string[];
  mediaNames: string[];
  /** 기간 총 예산(원) */
  totalBudget: number;
  duration: number;
  region?: string;
  goal?: string;
  estimatedReach?: number;
  estimatedCpm?: number;
  source: PlanTransferSource;
}

const GOAL_TO_CONTACT: Record<string, ContactCampaignGoal> = {
  brand_awareness: "brand_awareness",
  product_launch: "product_launch",
  event: "event_promo",
  event_promo: "event_promo",
  conversion: "store_traffic",
  store_traffic: "store_traffic",
};

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function savePlanTransferData(data: PlanTransferData): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(PLAN_DATA_STORAGE_KEY, JSON.stringify(data));
}

export function readPlanTransferData(): PlanTransferData | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PLAN_DATA_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PlanTransferData>;
    if (!Array.isArray(parsed.mediaIds) || parsed.mediaIds.length === 0) {
      return null;
    }
    return {
      mediaIds: parsed.mediaIds.filter((id): id is string => typeof id === "string"),
      mediaNames: Array.isArray(parsed.mediaNames)
        ? parsed.mediaNames.map(String)
        : [],
      totalBudget:
        typeof parsed.totalBudget === "number" ? parsed.totalBudget : 0,
      duration:
        typeof parsed.duration === "number" && parsed.duration > 0
          ? parsed.duration
          : 1,
      region: typeof parsed.region === "string" ? parsed.region : undefined,
      goal: typeof parsed.goal === "string" ? parsed.goal : undefined,
      estimatedReach:
        typeof parsed.estimatedReach === "number"
          ? parsed.estimatedReach
          : undefined,
      estimatedCpm:
        typeof parsed.estimatedCpm === "number" ? parsed.estimatedCpm : undefined,
      source:
        parsed.source === "ai_recommend" ||
        parsed.source === "integrated" ||
        parsed.source === "planner"
          ? parsed.source
          : "planner",
    };
  } catch {
    return null;
  }
}

export function clearPlanTransferData(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PLAN_DATA_STORAGE_KEY);
}

export function formatPlanTransferBudget(amountWon: number, isKo: boolean): string {
  if (amountWon <= 0) return isKo ? "문의" : "Inquire";
  return formatCatalogPriceFieldWon(amountWon, isKo ? "ko-KR" : "en-US");
}

export function buildPlanTransferContactMessage(
  plan: PlanTransferData,
  isKo: boolean,
): string {
  const lines = plan.mediaNames.map((name, i) => `${i + 1}. ${name}`);
  const budgetLabel = formatPlanTransferBudget(plan.totalBudget, isKo);
  const reachLine =
    plan.estimatedReach != null && plan.estimatedReach > 0
      ? isKo
        ? `\n예상 노출: ${plan.estimatedReach.toLocaleString("ko-KR")}회`
        : `\nEst. reach: ${plan.estimatedReach.toLocaleString("en-US")}`
      : "";
  const cpmLine =
    plan.estimatedCpm != null && Number.isFinite(plan.estimatedCpm)
      ? isKo
        ? `\n예상 CPM: ₩${Math.round(plan.estimatedCpm).toLocaleString("ko-KR")}`
        : `\nEst. CPM: ₩${Math.round(plan.estimatedCpm).toLocaleString("en-US")}`
      : "";

  if (isKo) {
    const header =
      plan.source === "ai_recommend"
        ? "[AI 추천 매체]"
        : plan.source === "integrated"
          ? "[통합 플래너 추천 매체]"
          : "[플래너 추천 매체]";
    return [
      header,
      ...lines,
      "",
      `총 예산: ${budgetLabel}`,
      `집행 기간: ${plan.duration}개월`,
      plan.goal ? `캠페인 목표: ${plan.goal}` : "",
      reachLine.replace(/^\n/, ""),
      cpmLine.replace(/^\n/, ""),
    ]
      .filter(Boolean)
      .join("\n");
  }

  const header =
    plan.source === "ai_recommend"
      ? "[AI recommended media]"
      : plan.source === "integrated"
        ? "[Integrated planner media]"
        : "[Planner recommended media]";
  return [
    header,
    ...lines,
    "",
    `Total budget: ${budgetLabel}`,
    `Duration: ${plan.duration} month(s)`,
    plan.goal ? `Campaign goal: ${plan.goal}` : "",
    reachLine.replace(/^\n/, ""),
    cpmLine.replace(/^\n/, ""),
  ]
    .filter(Boolean)
    .join("\n");
}

export function planTransferGoalToContactGoals(
  goal?: string,
): ContactCampaignGoal[] {
  if (!goal) return ["brand_awareness"];
  const key = goal.toLowerCase().replace(/\s+/g, "_");
  for (const [k, v] of Object.entries(GOAL_TO_CONTACT)) {
    if (goal.includes(k) || key.includes(k)) return [v];
  }
  return ["other"];
}

export function planTransferBudgetToContactBudgetV2(
  totalBudgetWon: number,
  duration: number,
): ContactBudgetV2 {
  const monthlyManwon = Math.round(
    totalBudgetWon / Math.max(1, duration) / 10_000,
  );
  if (monthlyManwon <= 0) return "undecided";
  if (monthlyManwon < 500) return "under_5m";
  if (monthlyManwon < 1000) return "5m_10m";
  if (monthlyManwon < 3000) return "10m_30m";
  return "over_30m";
}

export function planTransferFromParam(
  from: string | null | undefined,
): PlanTransferSource | null {
  const v = from?.trim();
  if (v === "planner") return "planner";
  if (v === "ai" || v === "ai_recommend") return "ai_recommend";
  if (v === "integrated") return "integrated";
  return null;
}
