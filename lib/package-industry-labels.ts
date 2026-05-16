import type { PackageIndustryBadge } from "@/data/packages";

export const PACKAGE_INDUSTRY_LABELS: Record<
  PackageIndustryBadge,
  { ko: string; en: string }
> = {
  beauty: { ko: "뷰티", en: "Beauty" },
  tech: { ko: "테크", en: "Tech" },
  entertainment: { ko: "엔터", en: "Entertainment" },
  fashion: { ko: "패션", en: "Fashion" },
  fmcg: { ko: "FMCG", en: "FMCG" },
  finance: { ko: "금융", en: "Finance" },
  tourism: { ko: "관광", en: "Tourism" },
  luxury: { ko: "럭셔리", en: "Luxury" },
  lifestyle: { ko: "라이프스타일", en: "Lifestyle" },
  fnb: { ko: "F&B", en: "F&B" },
  global: { ko: "글로벌", en: "Global" },
  retail: { ko: "유통", en: "Retail" },
  telecom: { ko: "통신", en: "Telecom" },
  corporate: { ko: "기업 브랜딩", en: "Corporate" },
};
