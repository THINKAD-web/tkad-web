"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const banners = [
  {
    id: 1,
    style: "neon" as const,
    bg: "bg-[#05050a] tkad-neon-depth",
    grid: true,
    badge: "🎉 정식 오픈 기념",
    title: "첫 30명 PRO",
    titleHighlight: "1개월 무료",
    highlightClass: "tkad-home-accent-text",
    sub: "지금 가입하면 상세 데이터·PDF 보고서 모두 무료",
    cta: "지금 신청하기",
    ctaClass: "tkad-neon-cta-clean text-white transition-transform hover:-translate-y-0.5",
    href: "/ko/pricing",
  },
  {
    id: 2,
    style: "gradient" as const,
    bg: "from-gray-900 via-slate-800 to-violet-900",
    badge: "📖 이용 방법",
    title: "3분이면",
    titleHighlight: "충분해요",
    highlightClass: "text-yellow-300",
    sub: "매체 검색 → AI 플래너 → 견적 요청",
    cta: "사용 가이드 보기",
    ctaClass: "bg-white text-gray-900 transition hover:bg-gray-100",
    href: "/ko/guide/how-to-use",
  },
  {
    id: 3,
    style: "gradient" as const,
    bg: "from-pink-600 via-rose-500 to-violet-600",
    badge: "🎤 팬덤 광고",
    title: "아이돌 생일광고",
    titleHighlight: "전문 플랫폼",
    highlightClass: "text-yellow-300",
    sub: "강남역·홍대·코엑스 팬덤 광고 매체 한눈에",
    cta: "매체 보기",
    ctaClass: "bg-white text-gray-900 transition hover:bg-gray-100",
    href: "/ko/special/fandom",
  },
];

export function HomeHeroBanner() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  const banner = banners[current]!;

  return (
    <div className="px-4 pt-4 pb-2">
      <div
        className={cn(
          "relative h-44 overflow-hidden rounded-2xl md:h-56",
          banner.style === "neon"
            ? cn("tkad-neon-border", banner.bg)
            : cn("bg-gradient-to-r", banner.bg),
        )}
      >
        {banner.style === "neon" && banner.grid ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 opacity-20 tkad-neon-grid"
          />
        ) : null}
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <span
            className={cn(
              "w-fit rounded-full px-3 py-1 text-xs font-medium text-white/80",
              banner.style === "neon"
                ? "border border-white/15 bg-white/10 text-white/85 backdrop-blur-sm"
                : "bg-white/20",
            )}
          >
            {banner.badge}
          </span>
          <div>
            <h2 className="text-2xl font-bold leading-tight text-white md:text-3xl">
              {banner.title}
              <br />
              <span className={banner.highlightClass}>{banner.titleHighlight}</span>
            </h2>
            <p className="mt-1 mb-3 text-sm text-white/70">{banner.sub}</p>
            <Link
              href={banner.href}
              className={cn(
                "inline-flex items-center gap-1 rounded-xl px-4 py-2 text-sm font-semibold",
                banner.ctaClass,
              )}
            >
              {banner.cta} →
            </Link>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            setCurrent((prev) => (prev - 1 + banners.length) % banners.length)
          }
          className="absolute left-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white"
          aria-label="Previous banner"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setCurrent((prev) => (prev + 1) % banners.length)}
          className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-black/30 text-white"
          aria-label="Next banner"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-1.5">
          {banners.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setCurrent(i)}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === current
                  ? banners[i]?.style === "neon"
                    ? "w-4 bg-gradient-to-r from-violet-400 to-cyan-400"
                    : "w-4 bg-white"
                  : "w-1.5 bg-white/40",
              )}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
