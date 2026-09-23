/** DB 미연결·count 0일 때만 사용하는 보수적 폴백 (2026-07 기준 verified active). */
export const MEDIA_COUNT_LABEL_FALLBACK = "660+";

export const MEDIA_COUNT_PLACEHOLDER = "{count}";

import en from "@/messages/en.json";
import ja from "@/messages/ja.json";
import ko from "@/messages/ko.json";
import zh from "@/messages/zh.json";
import { normalizeMediaDetailTextLocale } from "@/lib/media-i18n";

const HOME_META_BY_LOCALE = {
  ko: ko.homePage.metadata,
  en: en.homePage.metadata,
  ja: ja.homePage.metadata,
  zh: zh.homePage.metadata,
} as const;

function homeMetadata(locale: string) {
  const bucket = normalizeMediaDetailTextLocale(locale);
  return HOME_META_BY_LOCALE[bucket];
}

/** 내림 10단위 + "+" (예: 527 → "520+", 8 → "8") */
export function formatTrustCount(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return "0";
  if (n < 10) return String(Math.floor(n));
  return `${Math.floor(n / 10) * 10}+`;
}

/**
 * countLabel 은 시그니처 호환을 위해 남겨두되 카피에는 더 이상 넣지 않는다 —
 * "전국 {N} 매체" 처럼 총량을 단정하는 문구는 해외 매체가 섞인 카탈로그
 * 실태와 안 맞는다 (v10 Task H). 대신 매체 유형으로 커버리지를 설명한다.
 */
export function homePageMetadataTitle(locale: string, countLabel: string): string {
  void countLabel;
  return homeMetadata(locale).homeTitle;
}

export function homePageSrOnlyH1(locale: string, countLabel: string): string {
  void countLabel;
  return homeMetadata(locale).homeSrOnlyH1;
}

export function mediaListingMetadataDescription(
  locale: string,
  countLabel: string,
): string {
  void countLabel;
  return homeMetadata(locale).mediaListingDescription;
}

export function injectMediaCountPlaceholder(
  text: string,
  countLabel: string,
): string {
  return text.replaceAll(MEDIA_COUNT_PLACEHOLDER, countLabel);
}
