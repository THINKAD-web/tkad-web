import type { MediaPriceOption } from "@/lib/media-data";

/**
 * 가산/할증(부가) 옵션 — 대표가(최저가) 후보에서 제외.
 * 스키마 플래그 없음 → 정밀 키워드만 사용.
 * 단독 `가산`/`할증`/`추가` 는 오탐(지명·단기할증·연장단가)으로 쓰지 않음.
 */
const ADDON_BLOB_RE =
  /특수업종|특수\s*업종|가산금|가산비|가산료|할증료|할증금|추가요금|추가\s*요금|추가금|\+\s*\d[\d,]*\s*원|장당[\s\S]{0,12}추가|추가[\s\S]{0,12}장당|surcharge|add[\s-]?on/i;

const ADDON_LABEL_EXTRA_PAREN_RE = /추가\s*\(/;

export function isAddonSurchargePriceOption(
  opt: Pick<MediaPriceOption, "label" | "description">,
): boolean {
  const label = String(opt.label ?? "");
  const description = String(opt.description ?? "");
  const blob = `${label}\n${description}`;
  if (ADDON_BLOB_RE.test(blob)) return true;
  if (ADDON_LABEL_EXTRA_PAREN_RE.test(label)) return true;
  return false;
}
