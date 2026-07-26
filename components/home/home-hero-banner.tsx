"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  optimizeHeroMarqueeUrl,
  shouldUseUnoptimizedImage,
} from "@/lib/optimized-image-url";
import "./home-hero-banner.css";

type HeroSlide = {
  id: string;
  image: string;
  /** Local webp fallback if Bunny CDN fails */
  fallback: string;
  altKo: string;
  altEn: string;
};

/**
 * Hero slides — Bunny CDN 직결 (Strategy A).
 * 로컬 `public/images/hero/hero-slide*-828.webp` 는 CDN onError fallback.
 */
const SLIDES: HeroSlide[] = [
  {
    id: "gwanghwamun-kt",
    image:
      "https://tkad-cdn.b-cdn.net/tkad/admin/2026/07/bdda9382-c6c8-407e-8ba0-13ecd5984d62.jpg",
    fallback: "/images/hero/hero-slide1-828.webp",
    altKo: "광화문 KT 스퀘어 미디어월",
    altEn: "Gwanghwamun KT Square media wall",
  },
  {
    id: "outdoor-led",
    image:
      "https://tkad-cdn.b-cdn.net/tkad/admin/2026/07/f558dfc5-b3d8-4741-897a-53aab65513f0.jpg",
    fallback: "/images/hero/hero-slide2-828.webp",
    altKo: "도심 건물 외벽 대형 LED 전광판",
    altEn: "Large outdoor LED billboard on a city building",
  },
];

/** max-w-5xl 히어로 프레임 기준 — CDN 원본(~1168–1280w)보다 크게 요청하지 않음 */
const HERO_SIZES = "(max-width: 1024px) 100vw, 1024px";

export function HomeHeroBanner() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const t = useTranslations("homePage");
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [failedIds, setFailedIds] = useState<Record<string, true>>({});

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

  const slogan = t("heroBannerSlogan");
  const lead = t("heroBannerLead");

  return (
    <div className="px-4 pt-3 pb-2 md:px-6 md:pt-4 md:pb-3 lg:px-8">
      <div
        className={cn(
          "ooh-home-hero relative mx-auto w-full max-w-5xl overflow-hidden rounded-lg",
          "shadow-sm ring-1 ring-black/40",
        )}
        role="region"
        aria-label={isKo ? "홈 히어로" : "Home hero"}
      >
        <div className="ooh-home-hero__base" aria-hidden />
        <div className="ooh-home-hero__glow" aria-hidden />
        <div className="ooh-home-hero__grid" aria-hidden />

        <div className="ooh-home-hero__photos" aria-hidden>
          {SLIDES.map((s, i) => {
            const useFallback = Boolean(failedIds[s.id]);
            const src = useFallback
              ? s.fallback
              : (optimizeHeroMarqueeUrl(s.image) ?? s.image);
            const active = i === current;
            const isFirst = i === 0;
            return (
              <div
                key={s.id}
                className="ooh-home-hero__slide"
                data-active={active ? "true" : "false"}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  className="ooh-home-hero__slide-img"
                  priority={isFirst}
                  loading={isFirst ? "eager" : "lazy"}
                  sizes={HERO_SIZES}
                  unoptimized={
                    useFallback ? true : shouldUseUnoptimizedImage(src)
                  }
                  onError={() => {
                    if (!failedIds[s.id]) {
                      setFailedIds((prev) => ({ ...prev, [s.id]: true }));
                    }
                  }}
                />
              </div>
            );
          })}
        </div>

        <div className="ooh-home-hero__scrim" aria-hidden />

        <div className="ooh-home-hero__content">
          <p className="ooh-home-hero__slogan">{slogan}</p>
          <p className="ooh-home-hero__lead">{lead}</p>
          <div className="ooh-home-hero__ctas">
            <Link href="/media" className="ooh-home-hero__cta ooh-home-hero__cta--primary">
              {t("heroBannerCtaBrowse")}
            </Link>
            <Link
              href="/recommend?mode=ai"
              className="ooh-home-hero__cta ooh-home-hero__cta--secondary"
            >
              {t("heroBannerCtaAi")}
            </Link>
          </div>
        </div>

        <div className="ooh-home-hero__dots">
          {SLIDES.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                goTo(i);
              }}
              className="ooh-home-hero__dot"
              data-current={i === current ? "true" : "false"}
              aria-label={
                isKo
                  ? `${i + 1}번째 배경 이미지`
                  : `Background image ${i + 1}`
              }
              aria-current={i === current ? "true" : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
