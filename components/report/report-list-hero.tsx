"use client";

import { useLocale } from "next-intl";
import { CategoryExploreHero } from "@/components/category-explore-hero";

export function ReportListHero() {
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <CategoryExploreHero
      code="// 02 · REPORT"
      showBeta
      headlineBefore={isKo ? "OOH 시장 " : "OOH market "}
      headlineGradient={isKo ? "트렌드 리포트" : "trend reports"}
      subtitle={
        isKo
          ? "광고 업계 인사이트와 매체 트렌드를 정리합니다."
          : "Industry insight and OOH media trends, curated for marketers."
      }
    />
  );
}
