export const NOTO_KR_FONT_FAMILY = "NotoSansKR";

export function krFontFamily(hasKrFont: boolean): string {
  return hasKrFont ? NOTO_KR_FONT_FAMILY : "helvetica";
}
