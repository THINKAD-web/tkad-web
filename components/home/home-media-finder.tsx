"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  CheckSquare,
  Compass,
  Sparkles,
  Timer,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import {
  buildRecommendAiBriefPath,
  buildRecommendAiModePath,
} from "@/lib/planner/freetext-brief-url";
import { HomeMediaSearch } from "@/components/home/home-media-search";
import { HomeQuickAccess } from "@/components/home/home-quick-access";
import { cn } from "@/lib/utils";

type Tab = "ai" | "search";

/**
 * 홈 above-fold "매체 찾기" — 구 HomeExploreSplit(검색 카드 + AI 카드 2분할)을
 * 탭 하나로 병합. 버튼형 CTA는 이 섹션에 [AI 플래너 시작] 하나만 둔다.
 */
export function HomeMediaFinder() {
  const t = useTranslations("homePage.mediaFinder");
  const [tab, setTab] = useState<Tab>("ai");
  const aiPath = buildRecommendAiModePath();
  const example = t("aiExample");

  const steps = [
    { n: "01", title: t("step1Title"), desc: t("step1Desc"), icon: CheckSquare },
    { n: "02", title: t("step2Title"), desc: t("step2Desc"), icon: Timer },
    { n: "03", title: t("step3Title"), desc: t("step3Desc"), icon: Sparkles },
  ];

  return (
    <section
      id="home-explore"
      className="scroll-mt-16 px-4 pb-3 md:px-6 md:pb-4 lg:px-8"
      aria-label={t("title")}
    >
      <div
        className={cn(
          "mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-black/5",
          "dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/10 md:p-6",
        )}
      >
        <div className="mb-4">
          <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white md:text-xl">
            {t("title")}
          </h2>
          <p className="mt-1.5 text-base text-gray-600 dark:text-white/65">
            {t("lead")}
          </p>
        </div>

        <div
          role="tablist"
          aria-label={t("title")}
          className="mb-4 inline-flex rounded-md border border-gray-200 bg-gray-50 p-1 dark:border-white/10 dark:bg-white/5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "ai"}
            onClick={() => setTab("ai")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
              tab === "ai"
                ? "bg-white text-hermes shadow-sm dark:bg-white/10"
                : "text-gray-500 hover:text-gray-700 dark:text-white/50 dark:hover:text-white/80",
            )}
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            {t("tabAi")}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "search"}
            onClick={() => setTab("search")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-semibold transition-colors",
              tab === "search"
                ? "bg-white text-hermes shadow-sm dark:bg-white/10"
                : "text-gray-500 hover:text-gray-700 dark:text-white/50 dark:hover:text-white/80",
            )}
          >
            <Compass className="h-4 w-4" aria-hidden />
            {t("tabSearch")}
          </button>
        </div>

        {tab === "ai" ? (
          <div role="tabpanel">
            <Link
              href={buildRecommendAiBriefPath(example)}
              className="flex min-h-12 items-center rounded-md border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-colors hover:border-hermes/40 dark:border-white/12 dark:bg-white/5 dark:text-white/80"
            >
              {example}
            </Link>
            <p className="mt-2 text-xs text-gray-500 dark:text-white/50">
              {t("aiHint")}
            </p>

            <ol className="mt-4 grid gap-2 sm:grid-cols-3">
              {steps.map((s) => {
                const Icon = s.icon;
                return (
                  <li
                    key={s.n}
                    className="flex items-start gap-2 rounded-md border border-gray-100 bg-gray-50/60 p-2.5 dark:border-white/8 dark:bg-white/[0.03]"
                  >
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-sm bg-hermes/10 text-hermes">
                      <Icon className="h-3.5 w-3.5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {s.title}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-snug text-gray-500 dark:text-white/50">
                        {s.desc}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ) : (
          <div role="tabpanel">
            <p className="mb-3 text-sm text-gray-600 dark:text-white/65">
              {t("searchLead")}
            </p>
            <HomeMediaSearch prominent />
            <HomeQuickAccess compact embedded />
          </div>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-gray-100 pt-4 dark:border-white/8 sm:flex-row sm:items-center sm:justify-between">
          <Link
            href={aiPath}
            className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-hermes px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-hermes/90"
          >
            {t("cta")}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
          <Link
            href="/media"
            className="text-center text-sm font-semibold text-hermes underline-offset-2 hover:underline"
          >
            {t("viewAll")}
          </Link>
        </div>
      </div>
    </section>
  );
}
