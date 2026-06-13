/**
 * 자동 기능 점검 — 점검 대상 정의 + 순수 분류 헬퍼.
 * DB·서버 의존성 없음 (cron 서버 + CLI 스크립트 + 브라우저 검사 공용).
 */

/** 페이지 생존 확인 대상 (locale 포함 절대 경로) */
export const HEALTH_PAGE_ROUTES: string[] = [
  "/ko",
  "/ko/media",
  "/ko/media/map",
  "/ko/media/targets",
  "/ko/media/packages",
  "/ko/recommend",
  "/ko/planner",
  "/ko/planner/integrated",
  "/ko/quote",
  "/ko/contact",
  "/ko/report",
  "/ko/cases",
  "/ko/academy",
  "/ko/guides",
  "/ko/faq",
  "/ko/about",
  "/ko/pricing",
  "/ko/my",
  "/ko/special/fandom",
  "/ko/special/popup",
];

/** 모바일 가로 넘침 검사 대상 (375px) — 재발 잦은 핵심 화면 위주 */
export const HEALTH_MOBILE_ROUTES: string[] = [
  "/ko",
  "/ko/media",
  "/ko/recommend",
  "/ko/planner",
  "/ko/planner/integrated",
  "/ko/quote",
  "/ko/contact",
  "/ko/media/packages",
];

export type ApiCheck = {
  name: string;
  path: string;
  method?: "GET" | "POST";
  body?: unknown;
  /** 응답 JSON 에 반드시 있어야 하는 키 (있으면 정상 판정 강화) */
  expectKey?: string;
};

/** API 헬스체크 — 부작용 없는 호출만 (실데이터 생성 금지) */
export const HEALTH_API_CHECKS: ApiCheck[] = [
  { name: "health", path: "/api/health", expectKey: "ok" },
  { name: "public media", path: "/api/public/media?limit=1", expectKey: "data" },
  { name: "public media-catalog", path: "/api/public/media-catalog" },
  { name: "public cases", path: "/api/public/cases" },
  { name: "public reports", path: "/api/public/reports" },
  { name: "public success-cases", path: "/api/public/success-cases" },
  // 챗봇: GET 은 비허용 메서드(405)지만 라우트 생존 확인 — 토큰 소비 없음
  { name: "chat endpoint", path: "/api/chat", method: "GET" },
];

/** 본문에 등장하면 깨진 페이지로 간주하는 텍스트 */
export const HEALTH_ERROR_TEXTS: string[] = [
  "SYSTEM ERROR",
  "일시적 오류",
  "Application error: a client-side exception",
  "Internal Server Error",
  "500 - Internal",
  "This page could not be found",
];

export type HealthCheckRow = {
  name: string;
  kind: "page" | "api" | "mobile";
  url: string;
  status: number;
  ok: boolean;
  ms: number;
  issue?: string;
};

export type HealthResult = {
  ranAt: string;
  base: string;
  total: number;
  pass: number;
  fail: number;
  durationMs: number;
  rows: HealthCheckRow[];
};

/** 페이지 응답 분류 — 상태코드 + 본문 에러 텍스트 스캔 */
export function classifyPage(
  status: number,
  body: string,
): { ok: boolean; issue?: string } {
  if (status === 0) return { ok: false, issue: "network/timeout" };
  if (status >= 500) return { ok: false, issue: `HTTP ${status}` };
  if (status === 404) return { ok: false, issue: "HTTP 404" };
  for (const t of HEALTH_ERROR_TEXTS) {
    if (body.includes(t)) return { ok: false, issue: `본문 오류: "${t}"` };
  }
  if (status >= 400) return { ok: false, issue: `HTTP ${status}` };
  return { ok: true };
}
