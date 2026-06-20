/**
 * Client-safe entitlement constants — no server/DB/Prisma imports.
 * Single source for numeric limits and pricing; legacy modules re-export from here.
 */

/** PRO 구독 월 요금 (KRW) */
export const PRO_MONTHLY_KRW = 99_000;

/** 신규 가입 PRO 체험 기간 (일) */
export const PRO_TRIAL_DAYS = 14;

/** FREE 회원 플래너 PDF 1회 무료 (리드 수집) */
export const FREE_PLANNER_PDF_LIMIT = 1;

/** 비회원·FREE — 내 플랜·추천·비교 카트 공통 상한 */
export const CART_COMPARE_MAX_FREE = 10;

/** PRO·PRO_TRIAL·ENTERPRISE — 카트·비교 실질 무제한 */
export const PLAN_CART_UNLIMITED = Number.MAX_SAFE_INTEGER;

/** 일일 AI 사용 한도 (guest / 로그인 FREE / PRO) */
export const AI_DAILY_LIMITS = { guest: 1, user: 5, pro: 30 } as const;

/** 시간당 동일 IP AI 어뷰징 한도 */
export const AI_HOURLY_ABUSE_LIMIT = 20;

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
