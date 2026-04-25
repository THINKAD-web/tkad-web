/**
 * 시간대·시즌 가격 가중치.
 *
 * 모든 함수가 현재 1.0 을 반환한다(Q3 결정 — 출시 시점에 가중치 미적용).
 * 함수 시그니처를 미리 노출해두는 이유는 견적/Planner UI 가 호출처를 완성한 상태에서
 * 정책만 갈아끼우면 되도록 하기 위함이다. 운영팀 협의 후 docs/pricing-policy.md §3 의
 * 표를 채우고 본 파일의 TODO 분기를 구체값으로 교체한다.
 */

/** 송출 시간대 프리셋(디지털 사이니지 전용 — 이외 매체는 무시). */
export type TimeSlotKey =
  | "all_day"
  | "rush_hour"
  | "lunch_evening"
  | "night"
  | "custom";

export type MultiplierContext = {
  /** 캠페인 시작일. */
  start: Date;
  /** 캠페인 종료일(포함). */
  end: Date;
  /** 선택된 시간대 프리셋. 디지털 매체에서만 의미. */
  timeSlot?: TimeSlotKey;
  /** 매체 카탈로그 type — digital / static / mobile / network. */
  mediaType?: string;
};

/** 시간대별 가중치(현재 1.0 — pricing-policy §3-1 채택 후 교체). */
export function timeSlotMultiplier(ctx: MultiplierContext): number {
  // TODO(pricing-policy §3-1): rush_hour +30%, night −40% 등.
  void ctx;
  return 1.0;
}

/** 시즌별 가중치(현재 1.0 — pricing-policy §3-2 채택 후 교체). */
export function seasonalMultiplier(ctx: MultiplierContext): number {
  // TODO(pricing-policy §3-2): 12월 +20%, 비수기 −10% 등.
  void ctx;
  return 1.0;
}

/** 두 가중치의 곱. 견적 라인 계산이 호출하는 단일 entry. */
export function combinedMultiplier(ctx: MultiplierContext): number {
  return timeSlotMultiplier(ctx) * seasonalMultiplier(ctx);
}
