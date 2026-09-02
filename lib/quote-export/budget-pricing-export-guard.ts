import { NextResponse } from "next/server";
import { BUDGET_PRICING_NOT_IMPLEMENTED } from "@/lib/pricing/budget-pricing";

/** `BudgetPricing` throw — export/PDF 경로에서 레거시 폴백 금지 판별용 */
export function isBudgetPricingNotImplementedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return msg.includes(BUDGET_PRICING_NOT_IMPLEMENTED);
}

/** 견적서 export — 위저드 「가격 문의」와 동일 톤 */
export function budgetPricingExportUserMessage(isKo: boolean): string {
  return isKo
    ? "온라인 매체는 아직 견적서에 포함할 수 없습니다. 가격 문의로 안내해 주세요."
    : "Online media cannot be included in this quote export yet. Please contact us for pricing.";
}

export function budgetPricingExportNextResponse(isKo: boolean): NextResponse {
  return NextResponse.json(
    {
      error: budgetPricingExportUserMessage(isKo),
      code: BUDGET_PRICING_NOT_IMPLEMENTED,
    },
    {
      status: 422,
      headers: { "Cache-Control": "no-store, private" },
    },
  );
}
