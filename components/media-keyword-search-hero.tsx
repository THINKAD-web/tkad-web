"use client";

import { useEffect, useState } from "react";
import { Search, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { KEYWORD_FILTER_SEARCH_PLACEHOLDERS } from "@/lib/media-keyword-filter-logic";

const PLACEHOLDER_ROTATE_MS = 6000;

export type MediaKeywordSearchHeroVariant = "gradient" | "embed";

export type MediaKeywordSearchHeroProps = {
  variant: MediaKeywordSearchHeroVariant;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /**
   * `/media` 전용 — 키워드 검색을 메인으로 강조(큰 예시 문구·리드 카피·큰 입력창).
   */
  featured?: boolean;
};

/**
 * 키워드 스마트 검색 UI — `MediaKeywordFilterClient`와 `/media` 히어로에서 공통 사용.
 * 필터링 디바운스는 부모에서 `debounced` 값으로 처리합니다.
 */
export function MediaKeywordSearchHero({
  variant,
  value,
  onChange,
  className,
  featured = false,
}: MediaKeywordSearchHeroProps) {
  const t = useTranslations("media.keywordSearchHero");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const placeholders = KEYWORD_FILTER_SEARCH_PLACEHOLDERS;

  useEffect(() => {
    const n = placeholders.length;
    const id = window.setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % n);
    }, PLACEHOLDER_ROTATE_MS);
    return () => window.clearInterval(id);
  }, [placeholders.length]);

  const applySuggestion = (phrase: string) => {
    onChange(phrase);
  };

  const spotlightPhrase = placeholders[placeholderIdx];
  const isFeaturedEmbed = variant === "embed" && featured;

  const searchField = (
    <>
      {isFeaturedEmbed ? (
        <div className="relative mb-6 flex flex-col items-center gap-3 text-center sm:mb-8 sm:gap-4">
          <div
            className="pointer-events-none absolute inset-x-0 -top-8 bottom-1/2 -z-10 mx-auto max-w-2xl rounded-full bg-gold/20 blur-[72px]"
            aria-hidden
          />
          <p className="flex flex-wrap items-center justify-center gap-2.5 text-lg font-extrabold tracking-tight text-gold-light drop-shadow-[0_0_24px_rgba(212,175,55,0.35)] sm:text-2xl md:text-3xl">
            <Sparkles
              className="size-6 shrink-0 text-gold sm:size-7 md:size-8"
              strokeWidth={2}
              aria-hidden
            />
            <span className="bg-gradient-to-r from-gold-light via-white to-gold-light/90 bg-clip-text text-transparent">
              {t("keywordLead")}
            </span>
          </p>
          <p
            key={placeholderIdx}
            className="text-balance bg-gradient-to-b from-white via-white to-white/85 bg-clip-text text-3xl font-extrabold leading-[1.15] tracking-tight text-transparent drop-shadow-[0_4px_32px_rgba(0,0,0,0.35)] sm:text-4xl md:text-5xl"
            aria-live="polite"
          >
            {spotlightPhrase}
          </p>
          <p className="max-w-md text-xs text-white/60 sm:text-sm">
            {t("spotlightHint")}
          </p>
        </div>
      ) : null}

      <div
        className={cn(
          "relative mx-auto w-full",
          isFeaturedEmbed ? "max-w-3xl" : "max-w-2xl",
        )}
      >
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 text-navy/45",
            isFeaturedEmbed
              ? "left-5 size-7 sm:left-6 sm:size-9"
              : variant === "embed"
                ? "left-4 size-6"
                : "left-5 size-6",
          )}
          aria-hidden
        />
        <Input
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={
            isFeaturedEmbed ? t("inputPlaceholder") : placeholders[placeholderIdx]
          }
          className={cn(
            "rounded-2xl border-0 bg-white pr-4 text-navy shadow-2xl shadow-black/25 ring-2 ring-white/25",
            "placeholder:text-navy/35",
            isFeaturedEmbed
              ? "h-[4.25rem] min-h-[4.25rem] pl-[4.25rem] text-lg placeholder:text-base sm:h-[5rem] sm:min-h-[5rem] sm:pl-[4.75rem] sm:text-xl sm:placeholder:text-lg md:text-2xl md:placeholder:text-xl"
              : variant === "embed"
                ? "h-14 pl-12 text-lg sm:h-16 sm:pl-14 sm:text-xl"
                : "h-16 pl-14 text-lg sm:h-[4.25rem] sm:text-xl",
            variant === "embed" || isFeaturedEmbed
              ? "focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy"
              : "focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2 focus-visible:ring-offset-navy-dark",
          )}
          autoComplete="off"
          aria-label={t("ariaSearch")}
        />
      </div>

      <p
        className={cn(
          "mt-5 text-xs font-medium",
          isFeaturedEmbed
            ? "text-white/50 sm:text-sm"
            : variant === "embed"
              ? "text-white/65"
              : "text-white/55",
        )}
      >
        {t("chipHint")}
      </p>
      <div
        className={cn(
          "mt-3 flex flex-wrap items-center justify-center gap-2",
          isFeaturedEmbed && "opacity-80",
        )}
      >
        {placeholders.map((phrase) => (
          <button
            key={phrase}
            type="button"
            onClick={() => applySuggestion(phrase)}
            className={cn(
              "rounded-full border px-3.5 py-2 text-left font-medium shadow-sm backdrop-blur-md",
              "transition-all duration-200 ease-out",
              "hover:-translate-y-0.5 hover:border-gold hover:bg-gold/15 hover:text-white hover:shadow-lg hover:shadow-gold/25 motion-reduce:hover:translate-y-0",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2",
              isFeaturedEmbed
                ? "border-white/20 bg-white/10 text-xs text-white/90 focus-visible:ring-offset-navy sm:text-sm"
                : variant === "embed"
                  ? "border-white/25 bg-white/10 text-xs text-white/95 focus-visible:ring-offset-navy"
                  : "border-white/18 bg-white/[0.08] text-xs text-white/95 focus-visible:ring-offset-navy-dark",
            )}
          >
            {phrase}
          </button>
        ))}
      </div>
    </>
  );

  if (variant === "embed") {
    return (
      <div className={cn("w-full", className)}>{searchField}</div>
    );
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden border-b border-navy/10 px-4 py-12 sm:py-16",
        "bg-gradient-to-br from-navy via-[#243470] to-navy-dark",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full bg-gold/15 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 -left-16 size-[22rem] rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div className="relative mx-auto max-w-3xl text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-light backdrop-blur-sm sm:text-xs">
          <Sparkles className="size-3.5 text-gold" aria-hidden />
          {t("badge")}
        </div>
        <h1 className="mb-2 text-balance text-2xl font-bold tracking-tight text-white sm:text-3xl md:text-4xl">
          {t("title")}
        </h1>
        <p className="mx-auto mb-8 max-w-xl text-pretty text-sm text-white/75 sm:text-base">
          {t("subtitle")}
        </p>
        {searchField}
      </div>
    </section>
  );
}
