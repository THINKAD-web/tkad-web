/**
 * PR-6c L-1/L-2 — 세션 모달 판단 (React 외 순수 로직, 테스트 가능).
 */

import type { BriefStoreState } from "@/lib/planner/brief/store";
import {
  countMixUnits,
  isMixBriefStale,
} from "@/lib/planner/brief/brief-fingerprint";
import type { BriefWizardStep } from "@/lib/planner/brief/types";

/** L-2: 재진입 시 이어하기 모달을 띄울지 */
export function shouldPromptResumeSession(params: {
  hydrated: boolean;
  planFromUrl: string | null;
  alreadyPrompted: boolean;
  mixUnits: Record<string, number>;
  /**
   * 딥링크 인계가 진행 중이면 묻지 않는다. 사용자는 이미 "이 매체로 시작"을
   * 눌러 의사를 밝혔고, 여기서 "새로 시작"을 고르면 방금 넘어온 값이 사라진다.
   */
  handoffActive?: boolean;
}): boolean {
  if (!params.hydrated) return false;
  if (params.planFromUrl) return false;
  if (params.handoffActive) return false;
  if (params.alreadyPrompted) return false;
  return countMixUnits(params.mixUnits) >= 1;
}

/** L-1: Step 2/3 진입 전 stale mix 확인 모달 */
export function shouldPromptStaleMixBeforeStep(params: {
  targetStep: BriefWizardStep;
  state: Pick<
    BriefStoreState,
    | "mixUnits"
    | "mixBriefFingerprint"
    | "budgetInputWon"
    | "budgetMode"
    | "regionCodes"
    | "genders"
    | "ageBands"
    | "flightStart"
    | "flightEnd"
    | "goal"
    | "industry"
  >;
}): boolean {
  if (params.targetStep !== 2 && params.targetStep !== 3) return false;
  return isMixBriefStale({
    mixUnits: params.state.mixUnits,
    mixBriefFingerprint: params.state.mixBriefFingerprint,
    brief: params.state,
  });
}

/** stale·resume 모달이 동시에/연속으로 뜨지 않도록 단일 진입점 */
export function shouldOpenStaleMixDialog(params: {
  targetStep: BriefWizardStep;
  state: Parameters<typeof shouldPromptStaleMixBeforeStep>[0]["state"];
  resumeDialogOpen: boolean;
  staleDialogOpen: boolean;
}): boolean {
  if (params.resumeDialogOpen || params.staleDialogOpen) return false;
  return shouldPromptStaleMixBeforeStep({
    targetStep: params.targetStep,
    state: params.state,
  });
}

/** React 19 useSyncExternalStore — selector는 원시값/안정 참조만 반환 */
export function selectMixIsStale(s: BriefStoreState): boolean {
  return isMixBriefStale({
    mixUnits: s.mixUnits,
    mixBriefFingerprint: s.mixBriefFingerprint,
    brief: s,
  });
}

export function selectMixCount(s: BriefStoreState): number {
  return countMixUnits(s.mixUnits);
}

/** Q-1: React 19 — 원시 enum 값만 반환 */
export function selectEntryMode(s: BriefStoreState): BriefStoreState["entryMode"] {
  return s.entryMode;
}

/** Q-1: React 19 — 원시 enum 값만 반환 */
export function selectChannelMode(
  s: BriefStoreState,
): BriefStoreState["channelMode"] {
  return s.channelMode;
}

/**
 * N-3: effect 시뮬레이션 — 동일 입력에 setState(open)가 1회만 발생하는지.
 * (React 렌더 없이 resume prompt idempotency 검증)
 */
export function simulateResumePromptEffect(params: {
  hydrated: boolean;
  planFromUrl: string | null;
  alreadyPrompted: boolean;
  mixUnits: Record<string, number>;
}): { openResume: boolean; alreadyPromptedAfter: boolean } {
  const openResume = shouldPromptResumeSession(params);
  return {
    openResume,
    alreadyPromptedAfter: params.alreadyPrompted || openResume,
  };
}

/** N-3: React 19 getSnapshot 안정성 — 연속 호출 시 Object.is 유지 여부 */
export function isStableSnapshot<T>(
  selector: () => T,
  iterations = 100,
): boolean {
  const first = selector();
  for (let i = 0; i < iterations; i++) {
    if (!Object.is(first, selector())) return false;
  }
  return true;
}
