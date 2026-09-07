/**
 * one-off 매체 교정 스크립트용 — DB 쓰기를 마친 뒤 마지막에 호출.
 *
 * 스크립트는 Next.js 런타임 밖의 독립 프로세스라 next/cache 의
 * revalidateTag 를 직접 호출해도 조용히 no-op 된다(workAsyncStorage 가
 * 없음). 그래서 배포된 앱의 `/api/cron/revalidate-media-list` 를 HTTP 로
 * 호출해, 그 요청을 처리하는 실제 Next.js 서버 컨텍스트 안에서
 * revalidateTag 가 실행되게 한다. `.env.local` 의 SITE_URL/CRON_SECRET 을
 * 그대로 재사용 — 새 시크릿 불필요.
 *
 * 두 헬퍼 중 스크립트가 실제로 건드리는 필드에 맞는 쪽을 골라 쓸 것:
 * - `revalidateMediaListAfterScript()` — list tag만. 정렬/필터용 배치처럼
 *   목록 페이지에만 노출되는 필드를 바꿀 때(예: 인기점수 재계산).
 * - `revalidateMediaCachesAfterScript(refs)` — list + 매체별 detail
 *   tag/path. 가격·설명처럼 상세 페이지에도 노출되는 필드를 바꿀 때.
 */

async function callRevalidateEndpoint(
  body: Record<string, unknown> | undefined,
  label: string,
): Promise<void> {
  const siteUrl = process.env.SITE_URL?.trim();
  const secret = process.env.CRON_SECRET?.trim();

  if (!siteUrl || !secret) {
    console.warn(
      `[${label}] SITE_URL 또는 CRON_SECRET 미설정 — 캐시가 갱신될 때까지 ` +
        "최대 1시간 stale 할 수 있음. .env.local 확인 필요.",
    );
    return;
  }

  const url = `${siteUrl.replace(/\/$/, "")}/api/cron/revalidate-media-list`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      console.warn(
        `[${label}] ${res.status} ${res.statusText} — 캐시 무효화 실패. ` +
          "최대 1시간 후 자연 반영됨.",
      );
      return;
    }
    console.log(`[${label}] 캐시 무효화 완료`);
  } catch (e) {
    console.warn(`[${label}] 호출 실패 —`, e instanceof Error ? e.message : e);
  }
}

/** list tag만 무효화 — 정렬/필터에만 영향을 주는 필드용. */
export async function revalidateMediaListAfterScript(): Promise<void> {
  await callRevalidateEndpoint(undefined, "revalidate-media-list-after-script");
}

/**
 * list tag + 매체별 detail tag/path 무효화 — 가격·설명 등 detail 페이지에도
 * 노출되는 필드용. refs 는 실제로 쓰기가 일어난 매체만 담을 것(전체 처리
 * 대상이 아니라).
 */
export async function revalidateMediaCachesAfterScript(
  refs: ReadonlyArray<{ id: string; slug?: string | null }>,
): Promise<void> {
  if (refs.length === 0) return;
  await callRevalidateEndpoint(
    { refs: refs.map((r) => ({ id: r.id, slug: r.slug ?? null })) },
    "revalidate-media-caches-after-script",
  );
}
