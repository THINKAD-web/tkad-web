/** 견적서 부가비용(제작비 등) 라인 판별 — HTML·PDF 공용 */
export function isQuoteAddonLineId(id: string | null | undefined): boolean {
  if (!id) return true;
  return id.startsWith("custom-");
}
