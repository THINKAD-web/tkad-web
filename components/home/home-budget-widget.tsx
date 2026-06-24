"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  recommendUrlFromHomeBudget,
  type HomeBudgetIndustry,
  type HomeBudgetRegion,
} from "@/lib/home-budget-recommend";
import {
  getOrCreateTrackingSessionId,
  trackJourneyStep,
} from "@/lib/tracking/client";
import { cn } from "@/lib/utils";

const REGIONS: { id: HomeBudgetRegion; labelKo: string; labelEn: string }[] = [
  { id: "gangnam", labelKo: "강남", labelEn: "Gangnam" },
  { id: "hongdae", labelKo: "홍대", labelEn: "Hongdae" },
  { id: "seongsu", labelKo: "성수", labelEn: "Seongsu" },
  { id: "downtown", labelKo: "도심", labelEn: "Downtown" },
  { id: "national", labelKo: "전국", labelEn: "Nationwide" },
];

const INDUSTRIES: { id: HomeBudgetIndustry; labelKo: string; labelEn: string }[] = [
  { id: "beauty", labelKo: "뷰티", labelEn: "Beauty" },
  { id: "fnb", labelKo: "F&B", labelEn: "F&B" },
  { id: "it", labelKo: "IT", labelEn: "IT" },
  { id: "fashion", labelKo: "패션", labelEn: "Fashion" },
  { id: "other", labelKo: "기타", labelEn: "Other" },
];

export function HomeBudgetWidget() {
  const locale = useLocale();
  const t = useTranslations("homePage.budgetWidget");
  const isKo = locale.startsWith("ko");

  const [budgetMan, setBudgetMan] = useState(1500);
  const [region, setRegion] = useState<HomeBudgetRegion>("gangnam");
  const [industry, setIndustry] = useState<HomeBudgetIndustry>("beauty");

  const href = recommendUrlFromHomeBudget(budgetMan, region, industry);

  const onCtaClick = () => {
    getOrCreateTrackingSessionId();
    trackJourneyStep({
      step: "budget_widget_cta",
      mark: "budget_preview",
      metadata: { budgetMan, region, industry },
    });
  };

  return (
    <section
      className="relative mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8"
      aria-label={t("ariaLabel")}
    >
      <div
        className={cn(
          "tkad-budget-widget-panel tkad-glass-surface rounded-3xl p-6 sm:p-8",
          "tkad-neon-border",
        )}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="font-display text-xs font-medium uppercase tracking-[0.28em] text-cyan-300/90">
              [ INSTANT QUOTE ]
            </p>
            <h2 className="mt-2 text-xl font-semibold tracking-normal dark:text-white text-gray-900 sm:text-2xl">
              {t("title")}
            </h2>
            <p className="mt-1 max-w-xl text-sm dark:text-white text-gray-600">{t("subtitle")}</p>
          </div>
          <p className="font-sans text-2xl font-bold tabular-nums text-cyan-300">
            {budgetMan.toLocaleString(isKo ? "ko-KR" : "en-US")}
            <span className="ml-1 text-sm font-bold dark:text-white text-gray-500">
              {isKo ? "만원" : "M KRW"}
            </span>
          </p>
        </div>

        <div className="mt-6 space-y-5">
          <label className="block">
            <span className="font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-400">
              {t("budgetLabel")}
            </span>
            <input
              type="range"
              min={100}
              max={5000}
              step={50}
              value={budgetMan}
              onChange={(e) => setBudgetMan(Number(e.target.value))}
              className="mt-2 h-2 w-full cursor-pointer accent-cyan-400"
            />
            <div className="mt-1 flex justify-between text-[10px] dark:text-white">
              <span>100{isKo ? "만" : "M"}</span>
              <span>5,000{isKo ? "만" : "M"}</span>
            </div>
          </label>

          <div>
            <span className="font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-400">
              {t("regionLabel")}
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {REGIONS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => setRegion(r.id)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                    region === r.id
                      ? "border-cyan-400/60 bg-cyan-500/20 dark:text-white text-gray-900"
                      : "dark:border-white/14 border-gray-200 bg-white/[0.04] dark:text-white text-gray-700 hover:border-white/25",
                  )}
                >
                  {isKo ? r.labelKo : r.labelEn}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="font-display text-xs font-medium uppercase tracking-[0.2em] dark:text-white text-gray-400">
              {t("industryLabel")}
            </span>
            <div className="mt-2 flex flex-wrap gap-2">
              {INDUSTRIES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setIndustry(opt.id)}
                  className={cn(
                    "rounded-xl border px-4 py-2 text-sm font-semibold transition-colors",
                    industry === opt.id
                      ? "border-violet-400/60 bg-violet-500/20 dark:text-white text-gray-900"
                      : "dark:border-white/14 border-gray-200 bg-white/[0.04] dark:text-white text-gray-700 hover:border-white/25",
                  )}
                >
                  {isKo ? opt.labelKo : opt.labelEn}
                </button>
              ))}
            </div>
          </div>

          <Link
            href={href}
            onClick={onCtaClick}
            className="tkad-neon-cta inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-sm font-black dark:text-white text-gray-900 sm:w-auto sm:min-w-[240px] sm:px-8"
          >
            {t("ctaRecommend")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
