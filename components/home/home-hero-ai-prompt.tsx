"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  buildRecommendAiBriefPath,
  buildRecommendAiModePath,
} from "@/lib/planner/freetext-brief-url";

export const HERO_AI_PLANNER_EXAMPLES = [
  "강남 2030 브랜딩 3000만원",
  "강남역 한 달 3천만원",
  "뷰티 신제품 런칭 · 서울·경기 2030 여성 2주",
  "금융·보험 프로모션 · 서울 3040 1개월",
  "이커머스 브랜드 인지도 캠페인",
] as const;

const ROTATE_MS = 3200;

export function HomeHeroAiPrompt() {
  const t = useTranslations("homePage");
  const [index, setIndex] = useState(0);
  const current = HERO_AI_PLANNER_EXAMPLES[index] ?? HERO_AI_PLANNER_EXAMPLES[0];
  const aiPath = buildRecommendAiModePath();

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_AI_PLANNER_EXAMPLES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="ooh-home-hero__ai">
      <p className="ooh-home-hero__ai-label">{t("mediaFinder.promptLabel")}</p>
      <Link href={aiPath} className="ooh-home-hero__ai-box">
        <span className="ooh-home-hero__ai-placeholder" aria-hidden>
          {current}
        </span>
        <span className="sr-only">{t("mediaFinder.cta")}</span>
      </Link>
      <p className="ooh-home-hero__ai-hint">{t("mediaFinder.aiHint")}</p>
      <div className="ooh-home-hero__ai-chips" role="list">
        {HERO_AI_PLANNER_EXAMPLES.map((example) => (
          <Link
            key={example}
            href={buildRecommendAiBriefPath(example)}
            className="ooh-home-hero__ai-chip"
            role="listitem"
          >
            {example}
          </Link>
        ))}
      </div>
      <div className="ooh-home-hero__ctas">
        <Link
          href={aiPath}
          className="ooh-home-hero__cta ooh-home-hero__cta--primary"
        >
          {t("mediaFinder.cta")}
        </Link>
        <Link href="/media" className="ooh-home-hero__cta-link">
          {t("heroBannerCtaBrowse")}
        </Link>
      </div>
    </div>
  );
}
