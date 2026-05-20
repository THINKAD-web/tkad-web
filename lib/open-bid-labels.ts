import type { ContactBudgetV2, ContactIndustry, ContactRegion } from "@/lib/contact-lead-schema";
import { budgetRangeManwonFromCode } from "@/lib/quote-calculator";

const INDUSTRY_ANON: Record<ContactIndustry, string> = {
  beauty_fashion: "뷰티 브랜드",
  fnb: "F&B 브랜드",
  it_tech: "IT·테크 기업",
  finance: "금융사",
  entertainment: "엔터테인먼트",
  real_estate: "부동산",
  other: "광고주",
};

const REGION_KO: Record<ContactRegion, string> = {
  seoul_gangnam: "강남권",
  seoul_downtown: "서울 도심",
  seoul_other: "서울 기타",
  metro_area: "수도권",
  regional_cities: "지방 주요 도시",
  nationwide: "전국",
};

export function anonymizeIndustryFromCode(
  code: ContactIndustry | undefined,
): string {
  if (!code) return "광고주";
  return INDUSTRY_ANON[code] ?? "광고주";
}

export function regionSummaryKo(regions: ContactRegion[]): string {
  if (regions.length === 0) return "지역 미지정";
  return regions.map((r) => REGION_KO[r] ?? r).join(", ");
}

export function parseMediaTypesFromText(text: string): string[] {
  const types: string[] = [];
  if (/디지털|digital|DOOH|사이니지|signage/i.test(text)) types.push("digital");
  if (/버스|bus|차량|mobile/i.test(text)) types.push("mobile");
  if (/지하철|metro|subway|역사/i.test(text)) types.push("subway");
  if (/옥외|billboard|대형|static/i.test(text)) types.push("static");
  return [...new Set(types)];
}

export function mediaTypeLabelKo(type: string): string {
  const map: Record<string, string> = {
    digital: "디지털 사이니지",
    mobile: "이동형·버스",
    subway: "지하철",
    static: "옥외·정적",
  };
  return map[type] ?? type;
}

export function buildMatchSummaryKo(opts: {
  regionLabel: string;
  mediaTypes: string[];
  budgetLabel?: string;
  periodLabel?: string;
  industryAnonymized: string;
}): string {
  const typePart =
    opts.mediaTypes.length > 0
      ? opts.mediaTypes.map(mediaTypeLabelKo).join(", ")
      : "OOH 매체";
  const budgetPart = opts.budgetLabel ? `예산: ${opts.budgetLabel}` : "";
  const periodPart = opts.periodLabel ? `기간: ${opts.periodLabel}` : "";
  const parts = [
    `${opts.regionLabel} ${typePart} 문의`,
    budgetPart,
    periodPart,
    `광고주: ${opts.industryAnonymized} (익명)`,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function budgetRangeFromCode(
  code: ContactBudgetV2 | undefined,
  budgetLabel?: string,
): { min: number | null; max: number | null; label: string } {
  const range = budgetRangeManwonFromCode(code);
  if (!range && !budgetLabel) {
    return { min: null, max: null, label: "미정" };
  }
  return {
    min: range?.min ?? null,
    max: range?.max ?? null,
    label: budgetLabel?.trim() || "미정",
  };
}
