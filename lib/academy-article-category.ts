import type { AcademyArticleCategory } from "@prisma/client";

export const ACADEMY_CATEGORY_ORDER: AcademyArticleCategory[] = [
  "BASICS",
  "MEDIA_GUIDE",
  "BUDGET",
  "EXECUTION",
];

const LABELS: Record<
  AcademyArticleCategory,
  { ko: string; en: string }
> = {
  BASICS: { ko: "OOH 기초", en: "OOH basics" },
  MEDIA_GUIDE: { ko: "매체 선정", en: "Media selection" },
  BUDGET: { ko: "예산 계획", en: "Budget planning" },
  EXECUTION: { ko: "집행 가이드", en: "Execution" },
};

export function labelForAcademyCategory(
  category: AcademyArticleCategory,
  isKo: boolean,
): string {
  const row = LABELS[category];
  return isKo ? row.ko : row.en;
}
