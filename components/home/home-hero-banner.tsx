"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  BarChart3,
  FileText,
  Heart,
  Monitor,
  Search,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Banner = {
  id: string;
  bgClass: string;
  titleKo: string;
  titleEn: string;
  subKo: string;
  subEn: string;
  ctaKo: string;
  ctaEn: string;
  href: string;
  illustration?: "billboard" | "steps" | "fandom";
  steps?: { icon: typeof Search; labelKo: string; labelEn: string }[];
};

const BANNERS: Banner[] = [
  {
    id: "launch",
    bgClass: "bg-gradient-to-r from-violet-600 to-cyan-500",
    titleKo: "🎉 정식 오픈 기념",
    titleEn: "🎉 Official launch",
    subKo: "첫 30명 PRO 1개월 무료 체험",
    subEn: "First 30 users get 1 month PRO free",
    ctaKo: "지금 신청하기",
    ctaEn: "Apply now",
    href: "/pricing",
    illustration: "billboard",
  },
  {
    id: "guide",
    bgClass: "bg-gradient-to-r from-gray-900 to-violet-900",
    titleKo: "처음이세요?",
    titleEn: "New here?",
    subKo: "매체 검색 → 플래너 → 견적 요청",
    subEn: "Search media → Planner → Get a quote",
    ctaKo: "사용 가이드",
    ctaEn: "View guide",
    href: "/guide/how-to-use",
    illustration: "steps",
    steps: [
      { icon: Search, labelKo: "매체 검색", labelEn: "Search" },
      { icon: BarChart3, labelKo: "플래너", labelEn: "Planner" },
      { icon: FileText, labelKo: "견적 요청", labelEn: "Quote" },
    ],
  },
  {
    id: "fandom",
    bgClass: "bg-gradient-to-r from-pink-600 to-violet-600",
    titleKo: "아이돌 생일광고",
    titleEn: "Idol birthday ads",
    subKo: "강남역·홍대·코엑스 팬덤 광고 전문",
    subEn: "Fandom OOH at Gangnam, Hongdae & COEX",
    ctaKo: "매체 보기",
    ctaEn: "Browse media",
    href: "/special/fandom",
    illustration: "fandom",
  },
];

function BannerIllustration({ type }: { type: Banner["illustration"] }) {
  if (type === "billboard") {
    return (
      <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-36 items-end justify-center pr-4 md:flex md:w-48">
        <div className="relative mb-4 rounded-xl border border-white/20 bg-white/10 p-3 backdrop-blur-sm">
          <Monitor className="h-16 w-16 text-white/90" aria-hidden />
        </div>
      </div>
    );
  }
  if (type === "fandom") {
    return (
      <div className="pointer-events-none absolute bottom-0 right-0 hidden h-full w-36 items-end justify-center pr-4 md:flex md:w-48">
        <Heart className="mb-6 h-20 w-20 fill-pink-300/30 text-pink-200/50" aria-hidden />
      </div>
    );
  }
  return null;
}

type Props = { locale: string };

export function HomeHeroBanner({ locale }: Props) {
  const isKo = locale.startsWith("ko");
  const [index, setIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const goTo = useCallback((i: number) => {
    setIndex((i + BANNERS.length) % BANNERS.length);
  }, []);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % BANNERS.length);
    }, 5000);
    return () => window.clearInterval(id);
  }, []);

  const banner = BANNERS[index]!;

  return (
    <section
      className="pt-4 md:pt-6"
      data-screenshot="home-hero-banner"
      aria-roledescription="carousel"
      aria-label={isKo ? "프로모션 배너" : "Promo banners"}
    >
      <div
        className={cn(
          "relative h-44 overflow-hidden rounded-2xl md:h-56",
          banner.bgClass,
        )}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0]?.clientX ?? null;
        }}
        onTouchEnd={(e) => {
          const start = touchStartX.current;
          touchStartX.current = null;
          if (start == null) return;
          const end = e.changedTouches[0]?.clientX ?? start;
          const delta = end - start;
          if (Math.abs(delta) < 40) return;
          if (delta < 0) goTo(index + 1);
          else goTo(index - 1);
        }}
      >
        <BannerIllustration type={banner.illustration} />
        <div className="relative flex h-full max-w-xl flex-col justify-between p-5 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white sm:text-xl md:text-2xl">
              {isKo ? banner.titleKo : banner.titleEn}
            </h2>
            <p className="mt-1 text-sm text-white/90 sm:text-base">
              {isKo ? banner.subKo : banner.subEn}
            </p>
            {banner.steps ? (
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-white/90 sm:text-xs">
                {banner.steps.map((step, i) => {
                  const Icon = step.icon;
                  return (
                    <span key={step.labelKo} className="flex items-center gap-1.5">
                      {i > 0 ? (
                        <ArrowRight
                          className="h-3 w-3 shrink-0 text-white/50"
                          aria-hidden
                        />
                      ) : null}
                      <span className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-1">
                        <Icon className="h-3 w-3" aria-hidden />
                        {isKo ? step.labelKo : step.labelEn}
                      </span>
                    </span>
                  );
                })}
              </div>
            ) : null}
          </div>
          <Link
            href={banner.href}
            className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/30"
          >
            {isKo ? banner.ctaKo : banner.ctaEn}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {banner.illustration === "steps" ? (
          <Sparkles
            className="pointer-events-none absolute right-4 top-4 h-8 w-8 text-white/20 md:hidden"
            aria-hidden
          />
        ) : null}
      </div>
      <div
        className="mt-3 flex justify-center gap-2"
        role="tablist"
        aria-label={isKo ? "배너 선택" : "Select banner"}
      >
        {BANNERS.map((b, i) => (
          <button
            key={b.id}
            type="button"
            role="tab"
            aria-selected={i === index}
            aria-label={`${isKo ? "배너" : "Banner"} ${i + 1}`}
            onClick={() => goTo(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              i === index
                ? "w-6 bg-violet-500"
                : "w-2 bg-gray-300 dark:bg-white/25",
            )}
          />
        ))}
      </div>
    </section>
  );
}
