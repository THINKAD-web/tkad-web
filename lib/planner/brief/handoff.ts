/**
 * 딥링크 인계 — 매체 상세·비교·찜·내 플랜·챗봇에서 `/planner` 로 넘어올 때
 * 쿼리에 실린 값을 3단계 브리프 흐름으로 옮긴다.
 *
 * 구 6단계 클라이언트(`planner-page-client.tsx`)가 처리하던 파라미터들이다.
 * 그 파일은 더 이상 라우팅되지 않아 값이 조용히 버려지고 있었다.
 *
 * React 를 쓰지 않는 순수 로직만 둔다 — 우선순위·매핑을 테스트로 고정하기 위해서다.
 */

import type { MediaItem } from "@/lib/media-data";
import type { PlanCart } from "@/lib/plan-cart";
import { isOnlineCatalogMedia } from "@/lib/pricing-unavailable";
import { planCartToCampaignQuantities } from "@/lib/plan-cart-pricing";
import {
  isPlannerCampaignGoalKey,
  isProposalCampaignGoalKey,
  isRecommendCampaignGoalKey,
  normalizeCampaignGoal,
} from "@/lib/planner/normalize-campaign-goal";
import type { SavedPlannerPlanJson } from "@/lib/planner/contact-prefill";
import { browseMainIdToSidoCodes, normalizeSidoCodes } from "@/lib/planner/brief/regions";
import { durationToFlight } from "@/lib/planner/brief/natural-language";
import {
  type BriefAgeBand,
  type BriefGoal,
  type BriefIndustry,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";

/** 인계 시나리오. 우선순위 순으로 하나만 고른다. */
export type BriefHandoff =
  /** 저장된 CampaignPlan 결과 보기 — Step 3 가 이미 처리하므로 여기선 손대지 않는다 */
  | { kind: "savedPlan"; planId: string }
  /** 구 SavedPlannerPlan 이어서 편집 */
  | { kind: "loadPlan"; planId: string }
  /** 내 플랜 카트에서 시작 */
  | { kind: "planCart" }
  /** 자연어 브리프로 시작 */
  | { kind: "brief"; raw: string }
  /** 매체를 담은 채로 시작 */
  | { kind: "media"; mediaIds: string[]; units: number | null };

export type HandoffQuery = {
  plan?: string | null;
  loadPlan?: string | null;
  from?: string | null;
  brief?: string | null;
  mediaIds?: string | null;
  addMedia?: string | null;
  units?: string | null;
};

/** 인계에 쓰이는 쿼리 키 — 소비 후 URL 에서 지운다 */
export const BRIEF_HANDOFF_QUERY_KEYS = [
  "loadPlan",
  "from",
  "brief",
  "mediaIds",
  "addMedia",
  "units",
] as const;

function trimmed(v: string | null | undefined): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

function parseUnits(raw: string | null | undefined): number | null {
  const n = Number.parseInt(String(raw ?? ""), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * 우선순위:
 *   1. `plan`      — 저장된 결과를 여는 중이므로 신규 시작 값을 덮지 않는다
 *   2. `loadPlan`  — 저장 플랜 이어서 편집
 *   3. `from=plan` — 내 플랜 카트
 *   4. `brief`     — 자연어 브리프 (구 클라이언트도 매체 파라미터보다 먼저 처리했다)
 *   5. `mediaIds` → `addMedia`
 */
export function resolveBriefHandoff(q: HandoffQuery): BriefHandoff | null {
  const plan = trimmed(q.plan);
  if (plan) return { kind: "savedPlan", planId: plan };

  const loadPlan = trimmed(q.loadPlan);
  if (loadPlan) return { kind: "loadPlan", planId: loadPlan };

  if (trimmed(q.from) === "plan") return { kind: "planCart" };

  const brief = trimmed(q.brief);
  if (brief) return { kind: "brief", raw: brief };

  const units = parseUnits(q.units);

  const mediaIds = trimmed(q.mediaIds);
  if (mediaIds) {
    const ids = mediaIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.length > 0) return { kind: "media", mediaIds: ids, units };
  }

  const addMedia = trimmed(q.addMedia);
  if (addMedia) return { kind: "media", mediaIds: [addMedia], units };

  return null;
}

export type HandoffMixLine = { mediaId: string; units: number };

export type HandoffMixResult = {
  lines: HandoffMixLine[];
  /** 카탈로그에 없어 버려진 id — 사용자에게 알린다 */
  missing: string[];
  /** PR3 — online 매체는 PR5까지 플래너 믹스에 담지 않는다 */
  blockedOnline: string[];
};

/**
 * 요청 매체를 카탈로그로 검증해 믹스 라인으로 바꾼다.
 * `units` 는 단일 매체일 때만 적용한다(구 동작과 동일).
 */
export function resolveHandoffMix(params: {
  catalog: readonly MediaItem[];
  mediaIds: readonly string[];
  units: number | null;
}): HandoffMixResult {
  const { catalog, mediaIds, units } = params;
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const known = new Set(catalog.map((m) => m.id));
  const lines: HandoffMixLine[] = [];
  const missing: string[] = [];
  const blockedOnline: string[] = [];
  const seen = new Set<string>();

  for (const id of mediaIds) {
    if (!known.has(id)) {
      if (!missing.includes(id)) missing.push(id);
      continue;
    }
    const row = byId.get(id);
    if (row && isOnlineCatalogMedia(row)) {
      if (!blockedOnline.includes(id)) blockedOnline.push(id);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    lines.push({ mediaId: id, units: 1 });
  }

  if (lines.length === 1 && units != null) {
    lines[0]!.units = units;
  }

  return { lines, missing, blockedOnline };
}

/** `tkad_plan_cart` → 브리프 입력 + 믹스 */
export function planCartToBriefHandoff(
  cart: PlanCart,
  catalog: readonly MediaItem[],
): { patch: Partial<CampaignBriefInput>; mix: HandoffMixResult } {
  const patch: Partial<CampaignBriefInput> = {};

  if (cart.totalBudget != null && cart.totalBudget > 0) {
    // 카트의 totalBudget 은 원 단위 월예산으로 쓰인다 (plan-cart-planner-bridge 와 동일 해석)
    patch.budgetInputWon = Math.round(cart.totalBudget);
    patch.budgetMode = "monthly";
  }

  if (cart.duration != null && cart.duration > 0) {
    const { flightStart, flightEnd } = durationToFlight(
      Math.round(cart.duration * 30),
    );
    patch.flightStart = flightStart;
    patch.flightEnd = flightEnd;
  }

  const goal = briefGoalFromRawGoal(cart.campaignGoal);
  if (goal) patch.goal = goal;

  const industry = briefIndustryFromKey(cart.industryKey);
  if (industry) patch.industry = industry;

  const quantities = planCartToCampaignQuantities(cart);
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const known = new Set(catalog.map((m) => m.id));
  const lines: HandoffMixLine[] = [];
  const missing: string[] = [];
  const blockedOnline: string[] = [];
  for (const item of cart.items) {
    if (!known.has(item.mediaId)) {
      if (!missing.includes(item.mediaId)) missing.push(item.mediaId);
      continue;
    }
    const row = byId.get(item.mediaId);
    if (row && isOnlineCatalogMedia(row)) {
      if (!blockedOnline.includes(item.mediaId)) blockedOnline.push(item.mediaId);
      continue;
    }
    const raw = quantities[item.mediaId] ?? item.quantity ?? 1;
    const units = Math.max(1, Math.floor(raw));
    lines.push({ mediaId: item.mediaId, units });
  }

  return { patch, mix: { lines, missing, blockedOnline } };
}

const INDUSTRY_BY_PLANNER_KEY: Record<string, BriefIndustry> = {
  indFb: "fb",
  indRetail: "retail",
  indTech: "tech",
  indFinance: "finance",
  indEnt: "ent",
  indOther: "other",
};

export function briefIndustryFromKey(
  key: string | null | undefined,
): BriefIndustry | null {
  if (!key) return null;
  return INDUSTRY_BY_PLANNER_KEY[key] ?? null;
}

const AGE_BAND_BY_PLANNER_KEY: Record<string, BriefAgeBand> = {
  age20s: "20s",
  age30s: "30s",
  age40s: "40s",
  age50plus: "50s+",
};

export function briefAgeBandsFromKeys(
  keys: readonly string[] | null | undefined,
): BriefAgeBand[] {
  if (!Array.isArray(keys)) return [];
  const out: BriefAgeBand[] = [];
  for (const k of keys) {
    const band = AGE_BAND_BY_PLANNER_KEY[k];
    if (band && !out.includes(band)) out.push(band);
  }
  return out;
}

/**
 * 구 플래너 목표 문자열 → 브리프 퍼널 목표.
 *
 * `normalizeCampaignGoal` 은 알 수 없는 값도 awareness 로 기본 처리하므로,
 * 실제로 알려진 키일 때만 채운다 — 인계 때 목표를 임의로 단정하지 않는다.
 */
export function briefGoalFromRawGoal(
  raw: string | null | undefined,
): BriefGoal | null {
  const key = trimmed(raw)?.toLowerCase();
  if (!key) return null;
  const known =
    isPlannerCampaignGoalKey(key) ||
    isRecommendCampaignGoalKey(key) ||
    isProposalCampaignGoalKey(key);
  if (!known) return null;
  return normalizeCampaignGoal(key).funnel;
}

/** 구 SavedPlannerPlan(6단계 저장본) → 브리프 입력 + 믹스 */
export function savedPlannerPlanToBriefHandoff(
  plan: SavedPlannerPlanJson,
  catalog: readonly MediaItem[],
): { patch: Partial<CampaignBriefInput>; mix: HandoffMixResult } {
  const patch: Partial<CampaignBriefInput> = {};

  const manwon = Number(String(plan.budget ?? "").replace(/[^\d]/g, ""));
  if (Number.isFinite(manwon) && manwon > 0) {
    // 구 플래너의 budget 은 만원 단위 월예산이다
    patch.budgetInputWon = Math.round(manwon) * 10_000;
    patch.budgetMode = "monthly";
  }

  const months = Number(plan.months);
  if (Number.isFinite(months) && months > 0) {
    const { flightStart, flightEnd } = durationToFlight(
      Math.round(months * 30),
    );
    patch.flightStart = flightStart;
    patch.flightEnd = flightEnd;
  }

  if (Array.isArray(plan.regions) && plan.regions.length > 0) {
    const codes = plan.regions.flatMap((r) => browseMainIdToSidoCodes(r));
    const normalized = normalizeSidoCodes(codes);
    if (normalized.length > 0) patch.regionCodes = normalized;
  }

  const ages = briefAgeBandsFromKeys(
    plan.ageKeys ?? (plan.ageKey ? [plan.ageKey] : []),
  );
  if (ages.length > 0) patch.ageBands = ages;

  const goal = briefGoalFromRawGoal(plan.campaignGoal);
  if (goal) patch.goal = goal;

  const industry = briefIndustryFromKey(plan.industryKey);
  if (industry) patch.industry = industry;

  const known = new Set(catalog.map((m) => m.id));
  const byId = new Map(catalog.map((m) => [m.id, m]));
  const quantities = plan.campaignMediaQuantities ?? {};
  const lines: HandoffMixLine[] = [];
  const missing: string[] = [];
  const blockedOnline: string[] = [];
  for (const id of plan.campaignMediaIds ?? []) {
    if (!known.has(id)) {
      if (!missing.includes(id)) missing.push(id);
      continue;
    }
    const row = byId.get(id);
    if (row && isOnlineCatalogMedia(row)) {
      if (!blockedOnline.includes(id)) blockedOnline.push(id);
      continue;
    }
    const raw = quantities[id] ?? 1;
    const units = Number.isFinite(raw) ? Math.max(1, Math.floor(raw)) : 1;
    lines.push({ mediaId: id, units });
  }

  return { patch, mix: { lines, missing, blockedOnline } };
}
