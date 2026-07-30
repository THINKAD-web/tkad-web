/** 로컬 플랜 카트 편집 직후 서버 스냅샷 덮어쓰기 유예 (ms) */
export const PLAN_CART_LOCAL_EDIT_GRACE_MS = 5_000;

let localEditGraceUntil = 0;
let userEditingCount = 0;

/** 사용자 로컬 변경 직후 — sync apply 유예 갱신 */
export function touchPlanCartLocalEdit(): void {
  localEditGraceUntil = Date.now() + PLAN_CART_LOCAL_EDIT_GRACE_MS;
}

/** 입력 포커스 등 명시적 편집 세션 (중첩 가능) */
export function setPlanCartUserEditing(active: boolean): void {
  if (active) {
    userEditingCount += 1;
    touchPlanCartLocalEdit();
    return;
  }
  userEditingCount = Math.max(0, userEditingCount - 1);
  if (userEditingCount === 0) {
    touchPlanCartLocalEdit();
  }
}

/** 서버 응답으로 localStorage 를 덮어쓰면 안 되는 시점 */
export function shouldDeferServerPlanCartApply(): boolean {
  return userEditingCount > 0 || Date.now() < localEditGraceUntil;
}

/** apply 허용까지 남은 ms (재스케줄용) */
export function msUntilPlanCartApplyAllowed(): number {
  if (userEditingCount > 0) return 500;
  const remaining = localEditGraceUntil - Date.now();
  return remaining > 0 ? remaining : 0;
}

/** 테스트 전용 */
export function resetPlanCartLocalGuardForTests(): void {
  localEditGraceUntil = 0;
  userEditingCount = 0;
}
