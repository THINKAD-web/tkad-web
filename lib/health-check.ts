import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";
import {
  HEALTH_PAGE_ROUTES,
  HEALTH_API_CHECKS,
  classifyPage,
  type HealthCheckRow,
  type HealthResult,
} from "@/lib/health-check-routes";

const HEALTH_STORE_KEY = "health_check_last";
const REQUEST_TIMEOUT_MS = 15_000;

async function timedFetch(
  url: string,
  init?: RequestInit,
): Promise<{ status: number; body: string; ms: number }> {
  const started = Date.now();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      ...init,
      cache: "no-store",
      redirect: "manual",
      signal: ctrl.signal,
      headers: {
        "user-agent": "tkad-health-check/1.0",
        ...(init?.headers ?? {}),
      },
    });
    // 3xx(리다이렉트)는 정상으로 취급하되 본문 스캔은 생략
    const body =
      res.status >= 300 && res.status < 400
        ? ""
        : await res.text().catch(() => "");
    return { status: res.status, body, ms: Date.now() - started };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { status: 0, body: aborted ? "timeout" : String(e), ms: Date.now() - started };
  } finally {
    clearTimeout(timer);
  }
}

/** 공개 목록 API 에서 매체 상세/패키지 상세 샘플 URL 을 추출 (DB 비의존) */
async function sampleDynamicRoutes(base: string): Promise<string[]> {
  const out: string[] = [];
  try {
    const { body, status } = await timedFetch(`${base}/api/public/media?limit=3`);
    if (status === 200) {
      const j = JSON.parse(body) as { data?: Array<{ slug?: string; id?: string }> };
      for (const m of (j.data ?? []).slice(0, 3)) {
        const ref = m.slug || m.id;
        if (ref) out.push(`/ko/media/${ref}`);
      }
    }
  } catch {
    /* best-effort */
  }
  return out;
}

/** 점검 1회 실행 — 페이지 생존 + API 헬스 (브라우저 미사용, 서버/스크립트 공용) */
export async function runHealthChecks(base: string): Promise<HealthResult> {
  const started = Date.now();
  const cleanBase = base.replace(/\/$/, "");
  const rows: HealthCheckRow[] = [];

  const pageRoutes = [
    ...HEALTH_PAGE_ROUTES,
    ...(await sampleDynamicRoutes(cleanBase)),
  ];

  // 페이지 (동시성 제한 6)
  await runPooled(pageRoutes, 6, async (path) => {
    const { status, body, ms } = await timedFetch(`${cleanBase}${path}`);
    const { ok, issue } = classifyPage(status, body);
    rows.push({ name: path, kind: "page", url: path, status, ok, ms, issue });
  });

  // API
  await runPooled(HEALTH_API_CHECKS, 6, async (api) => {
    const { status, body, ms } = await timedFetch(`${cleanBase}${api.path}`, {
      method: api.method ?? "GET",
      ...(api.body
        ? {
            headers: { "content-type": "application/json" },
            body: JSON.stringify(api.body),
          }
        : {}),
    });
    let ok = status > 0 && status < 500;
    let issue: string | undefined;
    if (!ok) issue = status === 0 ? "network/timeout" : `HTTP ${status}`;
    if (ok && api.expectKey && status === 200) {
      try {
        const j = JSON.parse(body) as Record<string, unknown>;
        if (!(api.expectKey in j)) {
          ok = false;
          issue = `응답에 "${api.expectKey}" 없음`;
        }
      } catch {
        ok = false;
        issue = "JSON 파싱 실패";
      }
    }
    rows.push({ name: api.name, kind: "api", url: api.path, status, ok, ms, issue });
  });

  rows.sort((a, b) => Number(a.ok) - Number(b.ok));
  const fail = rows.filter((r) => !r.ok).length;
  return {
    ranAt: new Date().toISOString(),
    base: cleanBase,
    total: rows.length,
    pass: rows.length - fail,
    fail,
    durationMs: Date.now() - started,
    rows,
  };
}

async function runPooled<T>(
  items: T[],
  concurrency: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]!);
    }
  });
  await Promise.all(workers);
}

export async function saveHealthResult(result: HealthResult): Promise<void> {
  if (!isDatabaseConfigured()) return;
  try {
    await getPrisma().siteSetting.upsert({
      where: { key: HEALTH_STORE_KEY },
      update: { value: JSON.stringify(result) },
      create: { key: HEALTH_STORE_KEY, value: JSON.stringify(result) },
    });
  } catch (e) {
    console.error("[health-check save]", e instanceof Error ? e.message : e);
  }
}

export async function getLastHealthResult(): Promise<HealthResult | null> {
  if (!isDatabaseConfigured()) return null;
  try {
    const row = await getPrisma().siteSetting.findUnique({
      where: { key: HEALTH_STORE_KEY },
    });
    if (!row) return null;
    return JSON.parse(row.value) as HealthResult;
  } catch {
    return null;
  }
}
