"use client";

import { useState, useEffect, useCallback } from "react";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Heart,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

type BannerSlide = {
  id: string;
  eyebrow: string;
  Icon: LucideIcon;
  title: string;
  titleHighlight: string;
  sub: string;
  cta: string;
  href: string;
  /** decorative gradient orb tones */
  orb: "violet" | "indigo" | "rose";
};

const banners: BannerSlide[] = [
  {
    id: "pro",
    eyebrow: "정식 오픈 기념",
    Icon: Sparkles,
    title: "첫 30명 PRO",
    titleHighlight: "1개월 무료",
    sub: "상세 데이터·PDF 보고서까지 — 가입 즉시 체험",
    cta: "지금 신청하기",
    href: "/pricing",
    orb: "violet",
  },
  {
    id: "guide",
    eyebrow: "시작 가이드",
    Icon: BookOpen,
    title: "3분이면",
    titleHighlight: "충분해요",
    sub: "매체 검색 → AI 플래너 → 견적 요청까지 한 흐름",
    cta: "사용 가이드 보기",
    href: "/guide/how-to-use",
    orb: "indigo",
  },
  {
    id: "fandom",
    eyebrow: "팬덤 광고",
    Icon: Heart,
    title: "아이돌 생일광고",
    titleHighlight: "전문 플랫폼",
    sub: "강남·홍대·코엑스 — 팬덤 매체를 한곳에서",
    cta: "매체 보기",
    href: "/special/fandom",
    orb: "rose",
  },
];

const orbClass: Record<BannerSlide["orb"], string> = {
  violet:
    "bg-[radial-gradient(circle_at_30%_20%,rgba(168,85,247,0.45),transparent_55%),radial-gradient(circle_at_85%_75%,rgba(34,211,238,0.35),transparent_50%)]",
  indigo:
    "bg-[radial-gradient(circle_at_20%_30%,rgba(99,102,241,0.5),transparent_55%),radial-gradient(circle_at_90%_60%,rgba(56,189,248,0.28),transparent_48%)]",
  rose:
    "bg-[radial-gradient(circle_at_25%_25%,rgba(236,72,153,0.45),transparent_52%),radial-gradient(circle_at_80%_70%,rgba(139,92,246,0.35),transparent_50%)]",
};

function SlideContent({
  slide,
  active,
}: {
  slide: BannerSlide;
  active: boolean;
}) {
  const Icon = slide.Icon;
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col transition-opacity duration-700 ease-out",
        active ? "z-10 opacity-100" : "pointer-events-none z-0 opacity-0",
      )}
      aria-hidden={!active}
    >
      <div
        className={cn("pointer-events-none absolute inset-0", orbClass[slide.orb])}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,10,0.2)_0%,rgba(5,5,10,0.65)_55%,rgba(5,5,10,0.92)_100%)]"
        aria-hidden
      />

      <div className="relative flex flex-1 items-center justify-center px-3 pb-11 pt-3 sm:px-5">
        <div className="flex w-full max-w-xl items-center gap-3 sm:max-w-2xl sm:gap-4 md:max-w-3xl md:gap-5">
          <div className="min-w-0 flex-1 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-[11px] font-semibold tracking-wide text-white/90 backdrop-blur-md">
              <Icon className="h-3.5 w-3.5 text-cyan-300/90" aria-hidden />
              {slide.eyebrow}
            </span>

            <h2 className="mt-2 text-balance text-xl font-black leading-[1.12] tracking-tight text-white sm:mt-2.5 sm:text-2xl md:text-[1.75rem]">
              {slide.title}{" "}
              <span className="tkad-home-accent-text">{slide.titleHighlight}</span>
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-white/72 sm:text-sm">
              {slide.sub}
            </p>
          </div>

          <Link
            href={slide.href}
            tabIndex={active ? 0 : -1}
            className={cn(
              "tkad-neon-cta-clean inline-flex h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[16px] px-3.5 text-xs font-bold text-white shadow-[0_8px_32px_rgba(124,58,237,0.35)] transition-transform hover:-translate-y-0.5 active:scale-[0.98] sm:h-10 sm:rounded-[18px] sm:px-4 sm:text-sm md:h-11 md:gap-2 md:px-5",
              !active && "pointer-events-none",
            )}
          >
            {slide.cta}
            <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </div>
  );
}

export function HomeHeroBanner() {
  const [current, setCurrent] = useState(0);

  const go = useCallback((delta: number) => {
    setCurrent((prev) => (prev + delta + banners.length) % banners.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => go(1), 6000);
    return () => clearInterval(timer);
  }, [go]);

  return (
    <div className="px-4 pt-4 pb-2">
      <div
        className="tkad-neon-border relative h-[11.5rem] overflow-hidden rounded-[22px] border border-white/10 bg-[#05050a] shadow-[0_24px_80px_rgba(0,0,0,0.45)] sm:h-48 md:h-56"
        role="region"
        aria-roledescription="carousel"
        aria-label="프로모션"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 tkad-neon-depth"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.18] tkad-neon-grid"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 tkad-hero-noise opacity-[0.06] mix-blend-overlay"
        />

        {banners.map((slide, i) => (
          <SlideContent key={slide.id} slide={slide} active={i === current} />
        ))}

        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2.5">
          <button
            type="button"
            onClick={() => go(-1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/90 backdrop-blur-md transition hover:bg-black/55 hover:text-white"
            aria-label="이전 배너"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-1.5 px-1">
            {banners.map((slide, i) => (
              <button
                key={slide.id}
                type="button"
                onClick={() => setCurrent(i)}
                className={cn(
                  "h-1.5 rounded-full transition-all duration-300",
                  i === current
                    ? "w-7 bg-gradient-to-r from-violet-400 to-cyan-400"
                    : "w-1.5 bg-white/35 hover:bg-white/55",
                )}
                aria-label={`${slide.eyebrow} 배너`}
                aria-current={i === current ? "true" : undefined}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => go(1)}
            className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/90 backdrop-blur-md transition hover:bg-black/55 hover:text-white"
            aria-label="다음 배너"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
