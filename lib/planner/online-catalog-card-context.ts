/**
 * 온라인 플래너 3-6 — 플래너 세션 → 카탈로그(`/media/online`) 카드 컨텍스트 핸드오프.
 *
 * Step3 결과 화면에서 "카탈로그에서 보기"로 이동할 때, 이 세션의 추천 결과(채널별
 * 배분 비중·예상 노출/클릭, 예산 부족으로 제외된 채널)를 세션스토리지에 실어 보낸다.
 * `/media/online`은 마운트 시 한 번 읽어 플랫폼명으로 카탈로그 카드에 매칭한다.
 *
 * 세션 정리: 새 플랜을 저장할 때마다 같은 키를 통째로 덮어써 이전 실행 결과가
 * 남지 않는다. 추가로 TTL(1시간)을 둬서, 오래 전에 저장된 뒤 다시 클릭하지 않고
 * 같은 탭에서 나중에 직접 `/media/online`에 들어온 경우에도 낡은 정보가 얹히지
 * 않게 한다.
 */

import type { PlannerOnlineCardContextEntry } from "@/lib/media-card-display";
import type { OnlineCatalogRecommendResult } from "@/lib/planner/recommend-online-catalog";

export const PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY =
  "tkad-planner-online-card-context-v1";

const TTL_MS = 60 * 60 * 1000;

export type PlannerOnlineCardContextByPlatform = Record<
  string,
  PlannerOnlineCardContextEntry
>;

type StoredPayload = {
  savedAt: number;
  byPlatform: PlannerOnlineCardContextByPlatform;
};

export function buildPlannerOnlineCardContextByPlatform(
  result: Pick<OnlineCatalogRecommendResult, "platforms" | "excludedForBudget">,
  isKo: boolean,
): PlannerOnlineCardContextByPlatform {
  const byPlatform: PlannerOnlineCardContextByPlatform = {};
  for (const p of result.platforms) {
    byPlatform[p.platform] = {
      recommendedBudgetPct: p.budgetPct,
      estimatedMetricMin: p.estimatedMetricMin,
      estimatedMetricMax: p.estimatedMetricMax,
      metricType: p.metricType,
    };
  }
  for (const e of result.excludedForBudget) {
    byPlatform[e.platform] = {
      excludedForBudgetReason: isKo ? e.reasonKo : e.reasonEn,
    };
  }
  return byPlatform;
}

export function savePlannerOnlineCardContext(
  byPlatform: PlannerOnlineCardContextByPlatform,
): void {
  try {
    if (typeof window === "undefined") return;
    const payload: StoredPayload = { savedAt: Date.now(), byPlatform };
    window.sessionStorage.setItem(
      PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY,
      JSON.stringify(payload),
    );
  } catch {
    // 세션스토리지 접근 불가(프라이빗 모드 등) — 카드 얹기 기능만 조용히 스킵
  }
}

function isStoredPayload(value: unknown): value is StoredPayload {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.savedAt === "number" &&
    v.byPlatform != null &&
    typeof v.byPlatform === "object"
  );
}

export function readPlannerOnlineCardContext(): PlannerOnlineCardContextByPlatform | null {
  try {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(
      PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY,
    );
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!isStoredPayload(parsed)) return null;
    if (Date.now() - parsed.savedAt > TTL_MS) {
      window.sessionStorage.removeItem(PLANNER_ONLINE_CARD_CONTEXT_STORAGE_KEY);
      return null;
    }
    return parsed.byPlatform;
  } catch {
    return null;
  }
}
