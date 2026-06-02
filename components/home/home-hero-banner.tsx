"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import {
  optimizeHeroMarqueeUrl,
  shouldUseUnoptimizedImage,
} from "@/lib/optimized-image-url";
import { PRO_TRIAL_DAYS } from "@/lib/report-pricing-constants";
import { proTrialSignupSubKo } from "@/lib/pro-trial-marketing";

const banners = [
  {
    id: 0,
    image:
      "https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/0f795047-667e-4291-8495-1c41eb6e5afe.png",
    badge: "✨ 신규 가입",
    title: "PRO",
    highlight: `${PRO_TRIAL_DAYS}일 무료`,
    titleEnd: "",
    sub: proTrialSignupSubKo(),
    cta: "무료 가입하기",
    href: "/register",
  },
  {
    id: 1,
    image:
      "https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/0d44e972-2876-4145-b552-6c8641c53867.jpg",
    badge: "🏆 국내 최초",
    title: "OOH 단가",
    highlight: "투명화",
    titleEnd: " 10년",
    sub: "수십 곳에 전화하던 시대는 끝났습니다",
    cta: "매체 탐색하기",
    href: "/media",
  },
  {
    id: 2,
    image:
      "https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/0fa1cb83-dc2e-45ee-9210-4c2f433cbaa1.jpg",
    badge: "✨ AI 플래너",
    title: "3분이면",
    highlight: "캠페인 완성",
    sub: "AI가 최적 매체를 추천하고 견적까지 자동으로",
    cta: "플래너 시작하기",
    href: "/planner",
  },
  {
    id: 3,
    image:
      "https://tkad-cdn.b-cdn.net/tkad/admin/2026/05/0f795047-667e-4291-8495-1c41eb6e5afe.png",
    badge: "🎤 팬덤 광고",
    title: "아이돌 생일광고",
    highlight: "전문 플랫폼",
    sub: "강남역·홍대·코엑스 팬덤 매체 한눈에",
    cta: "매체 보기",
    href: "/special/fandom",
  },
] as const;

export function HomeHeroBanner() {
  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const goTo = useCallback((index: number) => {
    setCurrent((index + banners.length) % banners.length);
  }, []);

  const next = useCallback(() => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrent((prev) => (prev + 1) % banners.length);
    setTimeout(() => setIsAnimating(false), 500);
  }, [isAnimating]);

  useEffect(() => {
    const timer = setInterval(next, 5000);
    return () => clearInterval(timer);
  }, [next]);

  const banner = banners[current];

  return (
    <div className="px-4 pt-4 pb-2 md:px-6 md:pt-6 md:pb-4 lg:px-8">
      <div
        className="relative h-52 overflow-hidden rounded-2xl md:h-[22rem] md:rounded-3xl lg:h-[26rem] xl:h-[28rem]"
        role="region"
        aria-roledescription="carousel"
        aria-label="프로모션"
      >
        {banners.map((b, i) => {
          const src = optimizeHeroMarqueeUrl(b.image) ?? b.image;
          return (
          <div
            key={b.id}
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
          className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/20"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"
        />

        <div className="absolute inset-0 flex flex-col justify-between p-5 md:p-8 lg:p-10">
          <div>
            <span className="inline-flex items-center rounded-full border border-white/20 bg-white/15 px-3 py-1 text-xs font-medium text-white/90 backdrop-blur-sm md:px-4 md:py-1.5 md:text-sm">
              {banner.badge}
            </span>
          </div>

          <div className="max-w-3xl">
            <h2 className="mb-1 text-2xl font-bold leading-tight text-white md:mb-2 md:text-4xl lg:text-5xl lg:leading-[1.1]">
              {banner.title}{" "}
              <span className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-transparent">
                {banner.highlight}
              </span>
              {"titleEnd" in banner && banner.titleEnd ? banner.titleEnd : null}
            </h2>
            <p className="mb-4 text-sm text-white/70 md:mb-6 md:text-base lg:text-lg lg:text-white/80">
              {banner.sub}
            </p>
            <Link
              href={banner.href}
              className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition-all hover:bg-gray-100 active:scale-95 md:px-6 md:py-2.5 md:text-base lg:px-8 lg:py-3"
            >
              {banner.cta} →
            </Link>
          </div>
        </div>

        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-2 md:bottom-6 md:gap-2.5">
          {banners.map((b, i) => (
            <button
              key={b.id}
              type="button"
              onClick={() => goTo(i)}
              className={cn(
                "rounded-full transition-all duration-300",
                i === current
                  ? "h-2 w-8 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)]"
                  : "h-2 w-2 bg-white/45 hover:bg-white/70",
              )}
              aria-label={`${b.badge} 배너`}
              aria-current={i === current ? "true" : undefined}
            />
          ))}
        </div>

        <div className="absolute right-4 top-4 rounded-full bg-black/30 px-2 py-0.5 text-xs text-white/60 backdrop-blur-sm md:right-6 md:top-6 md:px-3 md:py-1 md:text-sm">
          {current + 1} / {banners.length}
        </div>
      </div>
    </div>
  );
}
