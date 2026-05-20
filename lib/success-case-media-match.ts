import type { PublicSuccessCaseListItem } from "@/lib/success-case-public";

export type MediaCaseMatchContext = {
  mediaId: string;
  location?: string;
  locationEn?: string;
  district?: string;
  region?: string;
  name?: string;
  nearbyStations?: string;
  nearbyLandmarks?: string;
};

function caseHaystack(item: PublicSuccessCaseListItem): string {
  return [
    item.titleKo,
    item.titleEn ?? "",
    item.summaryKo,
    ...item.mediaUsed,
  ]
    .join(" ")
    .toLowerCase();
}

function mediaHaystack(ctx: MediaCaseMatchContext): string {
  return [
    ctx.location,
    ctx.locationEn,
    ctx.district,
    ctx.region,
    ctx.name,
    ctx.nearbyStations,
    ctx.nearbyLandmarks,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/** 지명·역명 등 2자 이상 토큰 (한글·영문) */
function extractPlaceTokens(text: string): string[] {
  const tokens = new Set<string>();
  for (const part of text.split(/[\s,·/|()]+/)) {
    const t = part.trim().toLowerCase();
    if (t.length >= 2) tokens.add(t);
  }
  const koChunks = text.match(/[\uac00-\ud7a3]{2,}/g) ?? [];
  for (const c of koChunks) {
    if (c.length >= 2 && c.length <= 8) tokens.add(c.toLowerCase());
  }
  return [...tokens];
}

export function caseMatchesMedia(
  item: PublicSuccessCaseListItem,
  ctx: MediaCaseMatchContext,
): boolean {
  if (item.mediaIds.includes(ctx.mediaId)) return true;

  const caseHay = caseHaystack(item);
  const mediaHay = mediaHaystack(ctx);
  if (!caseHay || !mediaHay) return false;

  const tokens = extractPlaceTokens(mediaHay);
  return tokens.some((tok) => caseHay.includes(tok));
}

export function filterCasesForMediaContext(
  cases: PublicSuccessCaseListItem[],
  ctx: MediaCaseMatchContext,
  limit = 6,
): PublicSuccessCaseListItem[] {
  return cases.filter((c) => caseMatchesMedia(c, ctx)).slice(0, limit);
}
