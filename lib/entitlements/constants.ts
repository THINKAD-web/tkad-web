/**
 * Client-safe entitlement constants — no server/DB/Prisma imports.
 * Single source for numeric limits and pricing; legacy modules re-export from here.
 */

/** PRO 구독 월 요금 (KRW) */
export const PRO_MONTHLY_KRW = 99_000;

/** LITE 구독 월 요금 (KRW) — 플래너 결과 + PDF */
export const LITE_MONTHLY_KRW = 39_000;

/** AGENCY 구독 월 요금 (KRW) — PRO 기능 + 팀 좌석 */
export const AGENCY_MONTHLY_KRW = 290_000;

/** AGENCY 기본 팀 좌석 (본인 포함) */
export const AGENCY_TEAM_SEATS = 5;

/** 신규 가입 PRO 체험 기간 (일) */
export const PRO_TRIAL_DAYS = 14;

/** FREE 회원 플래너 PDF 1회 무료 (리드 수집) */
export const FREE_PLANNER_PDF_LIMIT = 1;

/** FREE 플래너 입력 허용 마지막 단계 (결과·PDF는 LITE+, 시뮬은 PRO) */
export const FREE_PLANNER_INPUT_LAST_STEP = 6;

/** FREE 회원 플랜·추천 카트 최대 개수 */
export const PLAN_CART_MAX_ITEMS_FREE = 10;

/** 내 플랜·추천 카트 — PRO·Enterprise 무제한 */
export const PLAN_CART_UNLIMITED = Number.MAX_SAFE_INTEGER;

/** PRO·Enterprise 플랜·추천 카트 최대 개수 */
export const PLAN_CART_MAX_ITEMS_PRO = PLAN_CART_UNLIMITED;

/** 일일 AI 사용 한도 (guest / 로그인 FREE / PRO) */
export const AI_DAILY_LIMITS = { guest: 1, user: 5, pro: 30 } as const;

/** 시간당 동일 IP AI 어뷰징 한도 (토큰 AI: recommend·planner 등) */
export const AI_HOURLY_ABUSE_LIMIT = 20;

/** 시간당 동일 IP — 규칙 챗봇(0토큰) abuse 방지 (일일 한도 없음) */
export const AI_CHATBOT_HOURLY_ABUSE_LIMIT = 80;

/** 매체 비교함 최대 개수 (URL·PDF·UI 공통) */
export const COMPARE_MAX_ITEMS = Number.MAX_SAFE_INTEGER;

/** 비로그인 찜 목록 localStorage 상한 */
export const FAVORITES_GUEST_MAX = 10;

export const FAVORITES_STORAGE_KEY = "tkad-media-favorites-v1";

export const FAVORITES_CHANGE_EVENT = "tkad-media-favorites-change";

/** Public API 키 월간 요청 한도 (ENTERPRISE = null → 무제한) */
export const API_KEY_MONTHLY_LIMITS = {
  FREE: 1000,
  PRO: 10_000,
  ENTERPRISE: null,
} as const;

/** 분당 요청 수가 이 값을 넘으면 이상 트래픽으로 표시 */
export const ANOMALY_REQUESTS_PER_MINUTE = 100;
