/**
 * Phase 1b — bus/taxi loop SOV override (FactSheet.forceLoopSov).
 *
 * [1b-4 execute] 10건 — 재한 승인 2026-08-20
 * [deferred] 3건 — 인쇄 쉘터 의심, 매체사 확인 전 보류
 */

/** 1b-4 execute — force_loop_sov=true UPDATE 대상 */
export const PHASE1B_EXECUTE_MEDIA_IDS = [
  "cmqz8nw3c000004legwvfs6dt", // 도심공항 리무진 내부동영상
  "cmqz98w4l000204juaxwqz27x", // 도심공항 리무진 창문상단
  "cmqkaqs8t000004l5l4p9crkn", // 경기 G버스 TV
  "cmp3v9nq7000404l1865x84wf", // 경기 버스 내부 유리창
  "cmp3aru5q000004kzxzxwourt", // 서울 시내 버스 TV
  "cmp3vb0q9000204kzu575iq32", // 경기 버스 내부 파노라마
  "cmp3cfdsy000004jo3v38d9f4", // 헤스티아 LED
  "cmp3v7v99000204l1gdoodg2q", // 택시 미디어바
  "cmqjbizs5000504if1dyoe7oj", // 광주 시내버스 내부 영상
  "cmq9cpmym000204jltw5crun4", // 서울 택시 상단 영상
] as const;

/** 별도 큐 — execute 제외 (type=static 인쇄 쉘터 의심) */
export const PHASE1B_DEFERRED_MEDIA_IDS = [
  "cmqitkt21000104l7f31igpr8", // 부산 BRT 버스쉘터
  "cmoiovojx000204ldfuoi4pwo", // 독립문역 스마트쉘터
  "cmqit76mb000004l4bwjq16q1", // 부산 스마트 쉼터형 버스쉘터
] as const;

/** dry-run·조사용 13건 합집합 */
export const PHASE1B_MIN_MEDIA_IDS = [
  ...PHASE1B_EXECUTE_MEDIA_IDS,
  ...PHASE1B_DEFERRED_MEDIA_IDS,
] as const;

export type Phase1bExecuteMediaId = (typeof PHASE1B_EXECUTE_MEDIA_IDS)[number];

export const PHASE1B_EXECUTE_MEDIA_ID_SET = new Set<string>(
  PHASE1B_EXECUTE_MEDIA_IDS,
);

/** 4a-4 빈도 검증 — 동일 10매체 믹스 (diagnose-pr3-phase4a-44-frequency.mts) */
export const PHASE4A44_MIX_MEDIA_IDS = [
  "cmp3cfdsy000004jo3v38d9f4",
  "cmnzdtqyf000204lbz82w6ipv",
  "cmr0p4wk6000004ky6mjvw3qb",
  "cmqkaqs8t000004l5l4p9crkn",
  "cmp3aru5q000004kzxzxwourt",
  "cmqjfo8ar000004jv12sudq50",
  "cmp02e0n7000a04jx1rze9gst",
  "cmp0flm3o000804l25v8pmo4x",
  "cmp3uulqi000004lb9uwuuspg",
  "cmqjgaph8000004l1l8lisi2p",
] as const;
