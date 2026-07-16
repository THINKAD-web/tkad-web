"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
  optimizeHeroMarqueeUrl,
  shouldUseUnoptimizedImage,
} from "@/lib/optimized-image-url";

const EXPLORE_SECTION_ID = "home-explore";

type HeroSlide = {
  id: string;
  image: string;
  titleKo: string;
  titleEn: string;
  subtitleKo: string;
  subtitleEn: string;
};

/** 828px WebP from user JPEG CDN (Jul 2026) — public/images/hero + Bunny mirror */
const SLIDES: HeroSlide[] = [
  {
    id: "media",
    image: "/images/hero/hero-slide1-828.webp",
    titleKo: "OOH 단가, 한눈에 비교",
    titleEn: "Compare OOH rates at a glance",
    subtitleKo: "아래에서 매체 검색·AI 추천 중 원하는 방식으로 시작하세요.",
    subtitleEn: "Search media or get AI picks — choose your path below.",
  },
  {
    id: "planner",
    image: "/images/hero/hero-slide2-828.webp",
    titleKo: "AI로 캠페인 설계",
    titleEn: "Plan campaigns with AI",
    subtitleKo: "지역·예산·타깃을 입력하면 순위·지도·견적까지 한 번에.",
    subtitleEn: "Enter region, budget, and audience for ranked picks and quotes.",
  },
];

function scrollToExplore() {
  document.getElementById(EXPLORE_SECTION_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function HomeHeroBanner() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback((index: number) => {
    setCurrent((index + SLIDES.length) % SLIDES.length);
  }, []);

  const next = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent((prev) => (prev + 1) % SLIDES.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  useEffect(() => {
    const timer = setInterval(next, 6000);
    return () => clearInterval(timer);
  }, [next]);

  const slide = SLIDES[current];
  const title = isKo ? slide.titleKo : slide.titleEn;
  const subtitle = isKo ? slide.subtitleKo : slide.subtitleEn;
  const ctaLabel = isKo ? "아래에서 시작하기" : "Get started below";

  return (
    <div className="px-4 pt-3 pb-2 md:px-6 md:pt-4 md:pb-3 lg:px-8">
      <div
        className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5 md:rounded-3xl dark:bg-white/5 dark:ring-white/10"
        role="region"
        aria-roledescription="carousel"
        aria-label={isKo ? "프로모션" : "Promotions"}
      >
        {SLIDES.map((s, i) => {
          const src = optimizeHeroMarqueeUrl(s.image) ?? s.image;
          const alt = isKo ? s.titleKo : s.titleEn;
          const isFirst = i === 0;
          return (
            <div
              key={s.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                i === current ? "opacity-100" : "opacity-0",
              )}
              aria-hidden={i !== current}
            >
              <Image
                src={src}
                alt={alt}
                fill
                className="object-cover object-center"
                priority={isFirst}
                loading={isFirst ? "eager" : "lazy"}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1024px"
                unoptimized={shouldUseUnoptimizedImage(src)}
              />
            </div>
          );
        })}

        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-[55%] rounded-b-2xl bg-gradient-to-t from-black/75 via-black/35 to-transparent md:rounded-b-3xl"
        />

        <div className="absolute inset-x-0 bottom-10 z-20 px-5 text-center md:bottom-12 md:px-8">
          <p className="text-lg font-bold tracking-tight text-white drop-shadow-sm md:text-2xl">
            {title}
          </p>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-snug text-white/85 md:text-sm">
            {subtitle}
          </p>
          <button
            type="button"
            onClick={scrollToExplore}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:text-sm"
          >
            {ctaLabel}
            <span aria-hidden>↓</span>
          </button>
        </div>

        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 gap-2 md:bottom-4">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goTo(i);
              }}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "h-1.5 w-6 bg-violet-600 shadow-sm dark:bg-violet-400"
                  : "h-1.5 w-1.5 bg-gray-400/80 hover:bg-gray-500 dark:bg-white/50 dark:hover:bg-white/70",
              )}
              aria-label={
                isKo ? `${i + 1}번째 배너` : `Banner ${i + 1}`
              }
              aria-current={i === current ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
