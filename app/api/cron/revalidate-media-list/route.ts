/**
 * 매체 카탈로그 캐시 무효화 — 온디맨드 (Vercel Cron 스케줄 아님).
 *
 * one-off 데이터 교정 스크립트(scripts/*.ts, Next.js 런타임 밖에서 실행되는
 * 독립 프로세스)는 next/cache 의 revalidateTag/revalidatePath 를 직접 호출할
 * 수 없다 — workAsyncStorage 가 활성 Next.js 요청 컨텍스트 안에서만 존재하기
 * 때문에, 스크립트에서 호출하면 조용히 no-op 된다. 그래서 그런 스크립트는
 * DB 쓰기를 마친 뒤 이 엔드포인트를 HTTP 로 호출해 실제 배포 환경 안에서
 * revalidateTag 가 실행되게 한다.
 *
 * - 인증: `Authorization: Bearer ${CRON_SECRET}` (기존 크론과 동일 패턴)
 * - body 없음(또는 refs 없음): list tag 1회만 — 매체별 detail path fan-out
 *   없음. 다수 매체를 한 번에 건드리는 정렬/필터용 배치(예: 인기점수 재계산)가
 *   건별로 revalidatePath 를 걸면 이번에 잡으려는 ISR write 증폭을 스크립트
 *   쪽에서 재현하게 된다. (see reports/isr-writes-root-cause-20260907.md)
 * - body `{ refs: [{ id, slug? }] }`: list tag + 매체별 detail tag/path 도
 *   무효화. 가격처럼 detail 페이지에도 노출되는 필드를 바꾸는 스크립트용 —
 *   호출부에서 실제로 detail 이 영향받는 필드인지 판단한 뒤에 refs 를 넘길 것.
 */

import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import {
  revalidateMediaCachesBulk,
  revalidatePublicMediaListTagOnly,
} from "@/lib/media-cache-revalidate";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

type Body = { refs?: { id?: unknown; slug?: unknown }[] };

function parseRefs(body: Body): { id: string; slug?: string | null }[] {
  if (!Array.isArray(body.refs)) return [];
  return body.refs
    .filter(
      (r): r is { id: string; slug?: string | null } =>
        !!r && typeof r.id === "string" && r.id.length > 0,
    )
    .map((r) => ({ id: r.id, slug: typeof r.slug === "string" ? r.slug : null }));
}

export async function POST(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    /* no body — list-only mode */
  }

  try {
    const refs = parseRefs(body);
    if (refs.length > 0) {
      revalidateMediaCachesBulk(refs);
      return json({ ok: true, mode: "bulk", count: refs.length });
    }
    revalidatePublicMediaListTagOnly();
    return json({ ok: true, mode: "list-only" });
  } catch (e) {
    console.error("[cron/revalidate-media-list]", e);
    return json(
      { ok: false, error: e instanceof Error ? e.message : "revalidate_failed" },
      500,
    );
  }
}
