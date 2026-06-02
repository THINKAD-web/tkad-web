"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "@/i18n/navigation";
import {
  ArrowRight,
  FileText,
  Search,
  Sparkles,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  proTrialSignupHeadlineEn,
  proTrialSignupHeadlineKo,
} from "@/lib/pro-trial-marketing";

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
  steps?: { icon: typeof Search; labelKo: string; labelEn: string }[];
};

const BANNERS: Banner[] = [
  {
    id: "launch",
    bgClass:
      "bg-gradient-to-br from-violet-600 via-purple-600 to-cyan-500",
    titleKo: "🎉 신규 가입 혜택",
    titleEn: "🎉 New signup benefit",
    subKo: proTrialSignupHeadlineKo(),
    subEn: proTrialSignupHeadlineEn(),
    ctaKo: "무료 가입하기",
    ctaEn: "Sign up free",
    href: "/register",
  },
  {
    id: "guide",
    bgClass: "bg-[#05050a] tkad-neon-depth tkad-neon-grid",
    titleKo: "3분이면 충분해요",
    titleEn: "3 minutes is enough",
    subKo: "매체 검색 → AI 플래너 → 견적 요청",
    subEn: "Search media → AI planner → Get a quote",
    ctaKo: "사용 가이드 보기",
    ctaEn: "View guide",
    href: "/guide/how-to-use",
    steps: [
      { icon: Search, labelKo: "매체 검색", labelEn: "Search" },
      { icon: Sparkles, labelKo: "AI 플래너", labelEn: "AI planner" },
      { icon: FileText, labelKo: "견적 요청", labelEn: "Quote" },
    ],
  },
  {
    id: "pro",
    bgClass: "bg-gradient-to-br from-violet-700 via-purple-700 to-violet-900",
    titleKo: "상세 데이터가 필요하다면",
    titleEn: "Need deeper insights?",
    subKo: "노출 시뮬레이션·PDF 보고서·경쟁 분석",
    subEn: "Exposure sim · PDF reports · Competitive intel",
    ctaKo: "PRO 무료 체험",
    ctaEn: "Try PRO free",
    href: "/pricing",
  },
];

type Props = { locale: string };

export function HomeHeroBannerSlider({ locale }: Props) {
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
      className="mx-4 mt-4 sm:mx-6 sm:mt-6"
      data-screenshot="home-hero-banner"
      aria-roledescription="carousel"
      aria-label={isKo ? "프로모션 배너" : "Promo banners"}
    >
      <div
        className={cn(
          "relative h-40 overflow-hidden rounded-2xl md:h-52",
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
        <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-white sm:text-xl">
              {isKo ? banner.titleKo : banner.titleEn}
            </h2>
            <p className="mt-1 text-sm text-white/85 sm:text-base">
              {isKo ? banner.subKo : banner.subEn}
            </p>
            {banner.steps ? (
              <div className="mt-3 flex items-center gap-1.5 text-[11px] font-medium text-white/90 sm:text-xs">
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
            className="inline-flex w-fit items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/25"
          >
            {isKo ? banner.ctaKo : banner.ctaEn}
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
        {banner.id === "pro" ? (
          <Zap
            className="pointer-events-none absolute -right-2 -top-2 h-24 w-24 text-white/10"
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
