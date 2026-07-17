"use client";

import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { buildRecommendAiModePath } from "@/lib/planner/freetext-brief-url";
import { cn } from "@/lib/utils";

type Props = {
  variant?: "default" | "slim";
  /** HomeExploreSplit 카드 내부 — 외곽 섹션·이중 카드 생략 */
  embedded?: boolean;
};

export function HomeFreetextEntry({
  variant = "default",
  embedded = false,
}: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const slim = variant === "slim";
  const recommendPath = buildRecommendAiModePath();

  const ctaBody = (
    <div
      className={cn(
        "flex flex-col",
        embedded ? "mt-auto pt-4" : slim ? "mt-3" : "mt-4",
      )}
    >
      {!embedded && !slim ? (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-hermes/30 bg-hermes/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-hermes">
              {isKo ? "무료 · 규칙" : "Free · Rules"}
            </span>
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {isKo ? "빠른 추천 · 0토큰" : "Quick picks · 0 tokens"}
            </span>
          </div>
          <h2
            id="home-freetext-heading"
            className="text-lg font-semibold tracking-tight text-gray-900 dark:text-white md:text-xl"
          >
            {isKo ? "AI로 추천받기" : "AI recommendations"}
          </h2>
          <p className="text-sm leading-relaxed text-gray-600 dark:text-white/65">
            {isKo
              ? "추천 페이지에서 지역·타깃·예산을 입력하면 순위·지도·견적까지 이어집니다."
              : "Enter region, audience, and budget on the recommend page for ranked picks, map, and quote."}
          </p>
        </div>
      ) : null}

      {slim && !embedded ? (
        <span className="mb-3 inline-flex rounded-sm border border-hermes/30 bg-hermes/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-hermes">
          {isKo ? "무료 · 0토큰" : "Free · 0 tokens"}
        </span>
      ) : null}

      <p className="text-xs text-gray-500 dark:text-white/50">
        {isKo
          ? '예) "강남 2030 브랜딩 3000만원" — 매체명 검색이 아닙니다.'
          : 'e.g. "Gangnam Gen Z branding 30M KRW" — not a media name search.'}
      </p>

      <div
        className={cn(
          "mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center",
          slim && "gap-1.5",
        )}
      >
        <Link
          href={recommendPath}
          className={cn(
            "inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-bold text-white transition-colors sm:w-auto",
            "bg-hermes hover:bg-cta-hover",
            slim && "py-2.5 text-sm",
          )}
        >
          {isKo ? "AI 추천 시작" : "Start AI recommend"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link
          href="/planner"
          className={cn(
            "text-center text-xs font-semibold text-gray-500 underline-offset-2 hover:underline dark:text-white/55",
            slim ? "sm:ml-1" : "inline-flex w-full items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-3 dark:border-white/12 dark:bg-white/5 sm:w-auto",
          )}
        >
          {isKo ? "단계별 플래너 →" : "Step-by-step planner →"}
        </Link>
      </div>
    </div>
  );

  if (embedded) {
    return ctaBody;
  }

  return (
    <section
      className="px-4 pb-2 md:px-6 md:pb-3 lg:px-8"
      aria-labelledby={slim ? undefined : "home-freetext-heading"}
    >
      <div
        className={cn(
          "mx-auto max-w-5xl rounded-lg border border-gray-200 bg-white p-4 shadow-sm ring-1 ring-black/5 dark:border-white/10 dark:bg-white/[0.04] dark:ring-white/10 md:p-6",
        )}
      >
        {ctaBody}
      </div>
    </section>
  );
}
