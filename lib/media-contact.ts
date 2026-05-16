/** 매체 상세 → 문의 폼 딥링크 (locale 은 i18n Link 가 처리). */
export function buildMediaContactHref(mediaId: string, mediaName: string): string {
  const params = new URLSearchParams({
    mediaId: mediaId.trim(),
    mediaName: mediaName.trim(),
  });
  return `/contact?${params.toString()}`;
}

/** `?media=` 레거시와 `?mediaId=` 신규 파라미터 통합. */
export function resolveMediaIdFromSearchParams(
  params: Pick<URLSearchParams, "get">,
): string | null {
  const id =
    params.get("mediaId")?.trim() || params.get("media")?.trim() || "";
  return id || null;
}
