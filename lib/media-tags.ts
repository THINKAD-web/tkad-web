/**
 * 매체 태그 표준 카테고리 — `Media.tags` String[].
 */

export const MEDIA_TAG_LOCATION = [
  "역세권",
  "대학가",
  "오피스밀집",
  "쇼핑상권",
  "관광지",
  "주거지",
] as const;

export const MEDIA_TAG_MEDIA = [
  "대형",
  "고가시성",
  "야간조명",
  "디지털",
  "즉시예약가능",
] as const;

export const MEDIA_TAG_TARGET = [
  "MZ",
  "직장인",
  "관광객",
  "가족",
  "럭셔리",
] as const;

export type MediaTagLocation = (typeof MEDIA_TAG_LOCATION)[number];
export type MediaTagMedia = (typeof MEDIA_TAG_MEDIA)[number];
export type MediaTagTarget = (typeof MEDIA_TAG_TARGET)[number];

export const MEDIA_TAG_ALL = [
  ...MEDIA_TAG_LOCATION,
  ...MEDIA_TAG_MEDIA,
  ...MEDIA_TAG_TARGET,
] as const;

export type MediaTagStandard = (typeof MEDIA_TAG_ALL)[number];

const TAG_SET = new Set<string>(MEDIA_TAG_ALL);

export const MEDIA_TAG_CATEGORIES = {
  location: { labelKo: "위치특성", labelEn: "Location", tags: MEDIA_TAG_LOCATION },
  media: { labelKo: "매체특성", labelEn: "Media", tags: MEDIA_TAG_MEDIA },
  target: { labelKo: "타겟", labelEn: "Target", tags: MEDIA_TAG_TARGET },
} as const;

export function isStandardMediaTag(tag: string): tag is MediaTagStandard {
  return TAG_SET.has(tag);
}

export function normalizeMediaTags(tags: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tags) {
    const k = t.trim();
    if (k.length < 1 || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

export function mergeStandardTags(
  existing: string[],
  suggested: string[],
): string[] {
  return normalizeMediaTags([...existing, ...suggested.filter(isStandardMediaTag)]);
}

/** 텍스트에서 표준 태그 추천 */
export function suggestMediaTagsFromText(text: string): MediaTagStandard[] {
  const blob = text.toLowerCase();
  const out: MediaTagStandard[] = [];
  const add = (t: MediaTagStandard) => {
    if (!out.includes(t)) out.push(t);
  };

  if (/역세권|역\s*\(|지하철|전철|환승/.test(blob)) add("역세권");
  if (/대학|캠퍼스|학교/.test(blob)) add("대학가");
  if (/오피스|업무|biz|business|테헤란|여의도/.test(blob)) add("오피스밀집");
  if (/백화점|쇼핑|몰|상권|아울렛/.test(blob)) add("쇼핑상권");
  if (/관광|여행|해변|리조트|공항/.test(blob)) add("관광지");
  if (/아파트|주거|단지|주택/.test(blob)) add("주거지");

  if (/대형|초대형|와이드|고층/.test(blob)) add("대형");
  if (/가시성|시인성|visibility|눈에/.test(blob)) add("고가시성");
  if (/야간|조명|네온|night/.test(blob)) add("야간조명");
  if (/디지털|led|전광|사이니지|스크린/.test(blob)) add("디지털");
  if (/즉시|실시간|예약/.test(blob)) add("즉시예약가능");

  if (/mz|1020|2030|젊은|z세대/.test(blob)) add("MZ");
  if (/직장인|출퇴근|commuter|office/.test(blob)) add("직장인");
  if (/관광객|foreign|tourist/.test(blob)) add("관광객");
  if (/가족|패밀리|육아/.test(blob)) add("가족");
  if (/럭셔리|프리미엄|하이엔드|luxury/.test(blob)) add("럭셔리");

  return out;
}
