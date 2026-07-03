"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";

type HeroSlide = {
  id: string;
  image: string;
  titleKo: string;
  titleEn: string;
  href: "/media" | "/planner";
};

/** 828px WebP — see public/images/hero/ and scripts/upload-hero-banners.mjs for CDN mirror */
const SLIDES: HeroSlide[] = [
  {
    id: "media",
    image: "/images/hero/main1-828.webp",
    titleKo: "OOH 단가, 한눈에 비교",
    titleEn: "Compare OOH rates at a glance",
    href: "/media",
  },
  {
    id: "planner",
    image: "/images/hero/main2-828.webp",
    titleKo: "AI로 캠페인 설계",
    titleEn: "Plan campaigns with AI",
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

  return (
    <div className="px-4 pt-3 pb-2 md:px-6 md:pt-4 md:pb-3 lg:px-8">
      <div
        className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden rounded-2xl bg-gray-100 shadow-sm ring-1 ring-black/5 md:rounded-3xl dark:bg-white/5 dark:ring-white/10"
        role="region"
        aria-roledescription="carousel"
        aria-label={isKo ? "프로모션" : "Promotions"}
      >
        {SLIDES.map((s, i) => {
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
                src={s.image}
                alt={alt}
                fill
                className="object-cover object-center"
                priority={isFirst}
                loading={isFirst ? "eager" : "lazy"}
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 1024px"
              />
            </div>
          );
        })}

        <Link
          href={slide.href}
          className="absolute inset-0 z-10 rounded-2xl md:rounded-3xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2"
          aria-label={title}
        />

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
