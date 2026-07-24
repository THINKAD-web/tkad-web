"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  optimizeHeroMarqueeUrl,
  shouldUseUnoptimizedImage,
} from "@/lib/optimized-image-url";

const EXPLORE_SECTION_ID = "home-explore";

type HeroSlide = {
  id: string;
  image: string;
  altKo: string;
  altEn: string;
};

/**
 * Hero slides — Bunny CDN 직결 (Strategy A).
 * 로컬 `public/images/hero/hero-slide*-828.webp` 는 롤백용으로 유지하되 참조하지 않음.
 *
 * 슬라이드1 파일명은 NFD 한글(광화문…). NFC 인코딩 URL은 404.
 */
const SLIDES: HeroSlide[] = [
  {
    id: "gwanghwamun-kt",
    image:
      "https://tkad-cdn.b-cdn.net/%E1%84%80%E1%85%AA%E1%86%BC%E1%84%92%E1%85%AA%E1%84%86%E1%85%AE%E1%86%AB%20KT%20%E1%84%89%E1%85%B3%E1%84%8F%E1%85%B0%E1%84%8B%E1%85%A5.jpg",
    altKo: "광화문 KT 스퀘어 미디어월",
    altEn: "Gwanghwamun KT Square media wall",
  },
  {
    id: "outdoor-led",
    image:
      "https://tkad-cdn.b-cdn.net/tkad/admin/2026/07/f558dfc5-b3d8-4741-897a-53aab65513f0.jpg",
    altKo: "도심 건물 외벽 대형 LED 전광판",
    altEn: "Large outdoor LED billboard on a city building",
  },
];

/** max-w-5xl 히어로 프레임 기준 — CDN 원본(~1168–1280w)보다 크게 요청하지 않음 */
const HERO_SIZES = "(max-width: 1024px) 100vw, 1024px";

function scrollToExplore() {
  document.getElementById(EXPLORE_SECTION_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

export function HomeHeroBanner() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("homePage");
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

  const ctaLabel = isKo ? "아래에서 시작하기" : "Get started below";
  const slogan = t("heroBannerSlogan");

  return (
    <div className="px-4 pt-3 pb-2 md:px-6 md:pt-4 md:pb-3 lg:px-8">
      <div
        className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-lg bg-gray-100 shadow-sm ring-1 ring-black/5 dark:bg-white/5 dark:ring-white/10"
        role="region"
        aria-roledescription="carousel"
        aria-label={isKo ? "프로모션" : "Promotions"}
      >
        {SLIDES.map((s, i) => {
          const src = optimizeHeroMarqueeUrl(s.image) ?? s.image;
          const alt = isKo ? s.altKo : s.altEn;
          const isFirst = i === 0;
          const active = i === current;
          return (
            <div
              key={s.id}
              className={cn(
                "absolute inset-0 transition-opacity duration-700",
                active
                  ? "z-[1] opacity-100"
                  : "pointer-events-none z-0 opacity-0",
              )}
              aria-hidden={!active}
            >
              <Image
                src={src}
                alt={alt}
                fill
                className="object-cover object-center"
                priority={isFirst}
                loading={isFirst ? "eager" : "lazy"}
                sizes={HERO_SIZES}
                unoptimized={shouldUseUnoptimizedImage(src)}
              />
            </div>
          );
        })}

        {/* 밝은 주간 사진 위 슬로건/CTA 가독성 — 상·하단 이중 그라데이션 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10 rounded-lg bg-gradient-to-t from-black/75 via-black/25 to-black/45"
        />

        <div className="absolute inset-x-0 bottom-10 z-20 flex flex-col items-center px-5 text-center md:bottom-12 md:px-8">
          <p className="text-balance text-2xl font-black leading-tight tracking-tight text-white drop-shadow-md md:text-4xl lg:text-5xl">
            {slogan}
          </p>
          <button
            type="button"
            onClick={scrollToExplore}
            className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-white/30 bg-black/40 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition hover:bg-black/55 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 md:mt-4 md:text-base"
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
                  ? "h-1.5 w-6 bg-hermes shadow-sm"
                  : "h-1.5 w-1.5 bg-white/70 hover:bg-white",
              )}
              aria-label={isKo ? `${i + 1}번째 배너` : `Banner ${i + 1}`}
              aria-current={i === current ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
