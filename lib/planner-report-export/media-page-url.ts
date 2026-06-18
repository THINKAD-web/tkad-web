import { siteUrl } from "@/lib/seo";

/** 플래너 보고서·PDF/PPT — 매체 상세 절대 URL */
export function plannerMediaPageUrl(
  mediaId: string | undefined | null,
  isKo: boolean,
): string | null {
  if (!mediaId || String(mediaId).startsWith("row-")) return null;
  const locale = isKo ? "ko" : "en";
  return `${siteUrl.replace(/\/$/, "")}/${locale}/media/${encodeURIComponent(mediaId)}`;
}

export function plannerMediaPageButtonLabel(isKo: boolean): string {
  return isKo ? "매체 상세 보기 →" : "View media page →";
}
