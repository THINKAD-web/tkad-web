import type { MediaOnlineSpecView } from "@/lib/media-data";

/**
 * Slug-level billing when CPC/CPM rates alone misrepresent PR5-d copy
 * (e.g. baemin CPC+commission+flat, kakao CPMS).
 */
const ONLINE_BILLING_BY_SLUG: Record<string, readonly string[]> = {
  "baemin-ad-visit": ["CPC", "정률", "정액"],
  "kakao-moment-message": ["CPMS"],
  "naver-brand-search": ["정액"],
  "youtube-action": ["CPV", "CPA"],
  "app-uai-install": ["CPI", "CPA"],
  "naver-gfa-traffic": ["CPC", "CPM"],
  "karrot-local-traffic": ["CPC"],
  "coupang-ad-traffic": ["CPC"],
  "native-taboola-traffic": ["CPC"],
  "meta-advantage-plus": ["CPC", "CPM"],
  "google-pmax-conversion": ["CPC", "CPM", "CPA"],
};

const ONLINE_BILLING_BY_SLUG_EN: Record<string, readonly string[]> = {
  "baemin-ad-visit": ["CPC", "Commission", "Flat fee"],
  "kakao-moment-message": ["CPMS"],
  "naver-brand-search": ["Flat fee"],
  "youtube-action": ["CPV", "CPA"],
  "app-uai-install": ["CPI", "CPA"],
  "naver-gfa-traffic": ["CPC", "CPM"],
  "karrot-local-traffic": ["CPC"],
  "coupang-ad-traffic": ["CPC"],
  "native-taboola-traffic": ["CPC"],
  "meta-advantage-plus": ["CPC", "CPM"],
  "google-pmax-conversion": ["CPC", "CPM", "CPA"],
};

function labelsFromRates(spec: MediaOnlineSpecView | null | undefined): string[] {
  if (!spec) return [];
  const parts: string[] = [];
  if (spec.cpcMin != null || spec.cpcMax != null) parts.push("CPC");
  if (spec.cpmMin != null || spec.cpmMax != null) parts.push("CPM");
  return parts;
}

/** Spec-table 「과금방식」 row — rates first, slug override when no rates. */
export function onlineBillingTypeLabel(
  spec: MediaOnlineSpecView | null | undefined,
  slug: string | undefined,
  isKo: boolean,
): string {
  const fromRates = labelsFromRates(spec);
  if (fromRates.length > 0) {
    return fromRates.join(" · ");
  }

  const slugKey = slug?.trim();
  if (slugKey) {
    const override = isKo
      ? ONLINE_BILLING_BY_SLUG[slugKey]
      : ONLINE_BILLING_BY_SLUG_EN[slugKey];
    if (override?.length) {
      return override.join(" · ");
    }
  }

  return isKo ? "문의" : "Inquire";
}
