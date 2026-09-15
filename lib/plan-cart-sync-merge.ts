import type { PlanCartItem } from "@/lib/plan-cart";

/** 동일 시각 충돌 시에만 합집합 (다른 탭에서 동시 추가 등) */
export function mergePlanCartItemsUnion(
  local: PlanCartItem[],
  remote: PlanCartItem[],
  maxItems: number,
): PlanCartItem[] {
  const seen = new Set<string>();
  const out: PlanCartItem[] = [];

  for (const item of local) {
    if (seen.has(item.mediaId)) continue;
    seen.add(item.mediaId);
    out.push(item);
  }
  for (const item of remote) {
    if (seen.has(item.mediaId)) continue;
    seen.add(item.mediaId);
    out.push(item);
  }
  return out.slice(0, maxItems);
}

function isDeletionSubset(
  local: PlanCartItem[],
  remote: PlanCartItem[],
): boolean {
  if (local.length >= remote.length) return false;
  const remoteIds = new Set(remote.map((i) => i.mediaId));
  return local.every((i) => remoteIds.has(i.mediaId));
}

/**
 * 로그인 플랜 카트 local ↔ server 병합.
 * 삭제·초기화가 union/remote-newer로 되살아나지 않도록 subset·empty 규칙을 우선한다.
 */
export function resolveSyncedPlanCartItems(
  local: PlanCartItem[],
  remote: PlanCartItem[],
  maxItems: number,
  localUpdated: number,
  remoteUpdated: number,
): PlanCartItem[] {
  if (remote.length === 0) return local.slice(0, maxItems);

  // 최초 로그인: 로컬 비어 있고 아직 한 번도 편집하지 않음 → 서버 채택
  if (local.length === 0 && localUpdated === 0) {
    return remote.slice(0, maxItems);
  }

  // 의도적 플랜 초기화 — remote가 더 새로워도 빈 카트 유지
  if (local.length === 0 && localUpdated > 0) {
    return local.slice(0, maxItems);
  }

  // 부분 삭제 — stale remote가 더 새로워도 로컬 subset 우선
  if (localUpdated > 0 && isDeletionSubset(local, remote)) {
    return local.slice(0, maxItems);
  }

  if (localUpdated > remoteUpdated) return local.slice(0, maxItems);
  if (remoteUpdated > localUpdated) return remote.slice(0, maxItems);

  return mergePlanCartItemsUnion(local, remote, maxItems);
}
