/**
 * one-off 매체 교정 스크립트용 — DB 쓰기를 마친 뒤 마지막에 호출.
 *
 * 스크립트는 Next.js 런타임 밖의 독립 프로세스라 next/cache 의
 * revalidateTag 를 직접 호출해도 조용히 no-op 된다(workAsyncStorage 가
 * 없음). 그래서 배포된 앱의 `/api/cron/revalidate-media-list` 를 HTTP 로
 * 호출해, 그 요청을 처리하는 실제 Next.js 서버 컨텍스트 안에서
 * revalidateTag 가 실행되게 한다. `.env.local` 의 SITE_URL/CRON_SECRET 을
 * 그대로 재사용 — 새 시크릿 불필요.
 */

export async function revalidateMediaListAfterScript(): Promise<void> {
  const siteUrl = process.env.SITE_URL?.trim();
  const secret = process.env.CRON_SECRET?.trim();

  if (!siteUrl || !secret) {
    console.warn(
      "[revalidate-media-list-after-script] SITE_URL 또는 CRON_SECRET 미설정 — " +
        "list 캐시가 갱신될 때까지 최대 1시간 stale 할 수 있음. " +
        ".env.local 확인 필요.",
    );
    return;
  }

  const url = `${siteUrl.replace(/\/$/, "")}/api/cron/revalidate-media-list`;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: `Bearer ${secret}` },
    });
    if (!res.ok) {
      console.warn(
        `[revalidate-media-list-after-script] ${res.status} ${res.statusText} — ` +
          "list 캐시 무효화 실패. 최대 1시간 후 자연 반영됨.",
      );
      return;
    }
    console.log("[revalidate-media-list-after-script] list 캐시 무효화 완료");
  } catch (e) {
    console.warn(
      "[revalidate-media-list-after-script] 호출 실패 —",
      e instanceof Error ? e.message : e,
    );
  }
}
