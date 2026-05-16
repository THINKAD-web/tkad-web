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
};
