/**
 * 매체 카탈로그 list 캐시 무효화 — 온디맨드 (Vercel Cron 스케줄 아님).
 *
 * one-off 데이터 교정 스크립트(scripts/*.ts, Next.js 런타임 밖에서 실행되는
 * 독립 프로세스)는 next/cache 의 revalidateTag/revalidatePath 를 직접 호출할
 * 수 없다 — workAsyncStorage 가 활성 Next.js 요청 컨텍스트 안에서만 존재하기
 * 때문에, 스크립트에서 호출하면 조용히 no-op 된다. 그래서 그런 스크립트는
 * DB 쓰기를 마친 뒤 이 엔드포인트를 HTTP 로 호출해 실제 배포 환경 안에서
 * revalidateTag 가 실행되게 한다.
 *
 * - 인증: `Authorization: Bearer ${CRON_SECRET}` (기존 크론과 동일 패턴)
 * - list tag 1회만 무효화 — 매체별 detail path fan-out 없음. 교정 스크립트는
 *   보통 다수 매체를 한 번에 건드리므로, 건별로 revalidatePath 를 걸면
 *   이번에 잡으려는 ISR write 증폭을 스크립트 쪽에서 재현하게 된다.
 *   (see reports/isr-writes-root-cause-20260907.md)
 */

import { NextRequest } from "next/server";
import { json } from "@/lib/admin-guard";
import { revalidatePublicMediaListTagOnly } from "@/lib/media-cache-revalidate";

export const dynamic = "force-dynamic";

function authOk(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const h = request.headers.get("authorization");
  return h === `Bearer ${secret}`;
}

export async function POST(request: NextRequest) {
  if (!authOk(request)) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    revalidatePublicMediaListTagOnly();
    return json({ ok: true });
  } catch (e) {
    console.error("[cron/revalidate-media-list]", e);
    return json(
      { ok: false, error: e instanceof Error ? e.message : "revalidate_failed" },
      500,
    );
  }
}
