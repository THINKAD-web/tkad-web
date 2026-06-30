"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
  optimizeHeroMarqueeUrl,
  shouldUseUnoptimizedImage,
} from "@/lib/optimized-image-url";

type HeroSlide = {
  id: string;
  image: string;
  titleKo: string;
  titleEn: string;
  ctaKo: string;
  ctaEn: string;
  href: "/media" | "/planner";
};

/** G-1: 브랜드(투명화) + 플래너 2장. PRO·팬덤 슬라이드 제거 */
const SLIDES: HeroSlide[] = [
  {
    id: "brand",
    image:
      "https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/0d44e972-2876-4145-b552-6c8641c53867.jpg",
    titleKo: "OOH 단가, 한눈에 비교",
    titleEn: "Compare OOH rates at a glance",
    ctaKo: "매체 탐색하기",
    ctaEn: "Explore media",
    href: "/media",
  },
  {
    id: "planner",
    image:
      "https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/0fa1cb83-dc2e-45ee-9210-4c2f433cbaa1.jpg",
    titleKo: "AI로 캠페인 설계",
    titleEn: "Plan campaigns with AI",
    ctaKo: "플래너 시작",
    ctaEn: "Start planner",
    href: "/planner",
  },
];

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
  const cta = isKo ? slide.ctaKo : slide.ctaEn;

  return (
    <div className="px-4 pt-3 pb-2 md:px-6 md:pt-4 md:pb-3 lg:px-8">
      <div
        className="relative h-40 overflow-hidden rounded-2xl md:h-56 md:rounded-3xl lg:h-64"
        role="region"
        aria-roledescription="carousel"
        aria-label={isKo ? "프로모션" : "Promotions"}
      >
        {SLIDES.map((s, i) => {
          const src = optimizeHeroMarqueeUrl(s.image) ?? s.image;
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
                alt=""
                fill
                className="object-cover"
                priority={i === 0}
                sizes="(max-width: 768px) 100vw, 1280px"
                unoptimized={shouldUseUnoptimizedImage(src)}
              />
            </div>
          );
        })}

        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/45 to-black/15"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"
        />

        <div className="absolute inset-0 flex flex-col justify-end p-4 md:p-6 lg:p-8">
          <div className="max-w-2xl">
            <h2 className="mb-3 text-xl font-bold leading-snug text-white md:mb-4 md:text-3xl lg:text-4xl">
              {title}
            </h2>
            <Link
              href={slide.href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-95 md:px-5 md:py-2.5"
            >
              {cta} →
            </Link>
          </div>
        </div>

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-4">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={() => goTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "h-1.5 w-6 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  : "h-1.5 w-1.5 bg-white/45 hover:bg-white/70",
              )}
              aria-label={
                isKo
                  ? `${i + 1}번째 배너`
                  : `Banner ${i + 1}`
              }
              aria-current={i === current ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
