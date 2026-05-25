"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

const banners = [
  {
    id: 1,
    bg: "from-violet-600 via-purple-600 to-cyan-500",
    badge: "🎉 정식 오픈 기념",
    title: "첫 30명 PRO",
    titleHighlight: "1개월 무료",
    sub: "지금 가입하면 상세 데이터·PDF 보고서 모두 무료",
    cta: "지금 신청하기",
    href: "/ko/pricing",
  },
  {
    id: 2,
    bg: "from-gray-900 via-slate-800 to-violet-900",
    badge: "📖 이용 방법",
    title: "3분이면",
    titleHighlight: "충분해요",
    sub: "매체 검색 → AI 플래너 → 견적 요청",
    cta: "사용 가이드 보기",
    href: "/ko/guide/how-to-use",
  },
  {
    id: 3,
    bg: "from-pink-600 via-rose-500 to-violet-600",
    badge: "🎤 팬덤 광고",
    title: "아이돌 생일광고",
    titleHighlight: "전문 플랫폼",
    sub: "강남역·홍대·코엑스 팬덤 광고 매체 한눈에",
    cta: "매체 보기",
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
        className={`relative h-44 overflow-hidden rounded-2xl bg-gradient-to-r md:h-56 ${banner.bg}`}
      >
        <div className="absolute inset-0 flex flex-col justify-between p-5">
          <span className="w-fit rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white/80">
            {banner.badge}
          </span>
          <div>
            <h2 className="text-2xl font-bold leading-tight text-white md:text-3xl">
              {banner.title}
              <br />
              <span className="text-yellow-300">{banner.titleHighlight}</span>
            </h2>
            <p className="mt-1 mb-3 text-sm text-white/70">{banner.sub}</p>
            <Link
              href={banner.href}
              className="inline-flex items-center gap-1 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-gray-900 transition hover:bg-gray-100"
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
              className={`h-1.5 rounded-full transition-all ${
                i === current ? "w-4 bg-white" : "w-1.5 bg-white/40"
              }`}
              aria-label={`Banner ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
