"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { HomeHeroMapPin } from "@/lib/public-media-catalog";
import { HomeHeroMarquee } from "@/components/home/home-hero-marquee";

const HomeHeroMapCard = dynamic(
  () => import("@/components/home/home-hero-map-card"),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-72 w-full animate-pulse rounded-2xl border border-border bg-muted sm:h-80"
        aria-hidden
      />
    ),
  },
);

const MARQUEE_MASK =
  "linear-gradient(to right, transparent, black 10%, black 90%, transparent)";

/** BrutalNav 높이 — globals.css `--nav-height` (mobile 3.5rem, sm+ 4rem) */
const HERO_MIN_HEIGHT = "calc(100dvh - var(--nav-height, 4rem))";

type Props = {
  isKo: boolean;
  marqueeImageUrls: string[];
  mapPins: HomeHeroMapPin[];
};

function MarqueeBackground({ imageUrls }: { imageUrls: string[] }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden opacity-[0.12] blur-sm dark:opacity-[0.25]"
      style={{
        maskImage: MARQUEE_MASK,
        WebkitMaskImage: MARQUEE_MASK,
        maskSize: "100% 100%",
        WebkitMaskSize: "100% 100%",
      }}
    >
      <HomeHeroMarquee imageUrls={imageUrls} />
    </div>
  );
}

function LiveBar({
  isKo,
  impressions,
  activeBrands,
}: {
  isKo: boolean;
  impressions: number;
  activeBrands: number;
}) {
  const items = [
    {
      label: isKo ? "오늘 누적 노출" : "Today impressions",
      value: impressions.toLocaleString(),
      live: true,
    },
    {
      label: isKo ? "활성 브랜드" : "Active brands",
      value: `${activeBrands}+`,
    },
    {
      label: isKo ? "평균 응답" : "Avg. response",
      value: "24h",
    },
  ];

  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/80 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-foreground shadow-sm backdrop-blur-sm"
        >
          {item.live ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />
              LIVE
              <span className="text-muted-foreground">•</span>
            </span>
          ) : null}
          <span className="text-muted-foreground">{item.label}</span>
          <span className="tabular-nums text-foreground">{item.value}</span>
        </div>
      ))}
      <p className="hidden font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground sm:block">
        {isKo ? "검증 후 등록만" : "Verified-only inventory"}
      </p>
    </div>
  );
}

export function HomeHeroNeo({ isKo, marqueeImageUrls, mapPins }: Props) {
  const [seed, setSeed] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setSeed(Date.now()));
    const id = window.setInterval(() => setTick((t) => (t + 1) % 10_000), 900);
    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(id);
    };
  }, []);

  const liveImpressions = useMemo(() => {
    const base = 1_862_000;
    return base + (seed % 7000) + tick * 137;
  }, [seed, tick]);

  const liveActiveBrands = useMemo(() => 128 + ((tick % 9) - 4), [tick]);

  const tags = isKo
    ? ["4단계 검증", "가격·입지 비교", "AI 매체 믹스"]
    : ["4-step verification", "Price & location", "AI mix"];

  return (
    <section
      style={{ minHeight: HERO_MIN_HEIGHT }}
      className="relative flex w-full shrink-0 items-center overflow-hidden bg-background text-foreground"
    >
      <div className="absolute inset-0 z-0">
        <MarqueeBackground imageUrls={marqueeImageUrls} />
      </div>

      <div
        aria-hidden
        className="absolute inset-0 z-[1] bg-gradient-to-br from-background/90 via-background/70 to-background/40"
      />

      <div className="relative z-[2] mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
        <LiveBar
          isKo={isKo}
          impressions={liveImpressions}
          activeBrands={liveActiveBrands}
        />

        <div className="mt-8 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              {isKo ? "// PREMIUM OOH MARKETPLACE" : "// PREMIUM OOH MARKETPLACE"}
            </p>

            <h1 className="text-balance text-5xl font-black leading-tight tracking-tight lg:text-6xl">
              {isKo ? (
                <>
                  검증된 <span className="tkad-home-accent-text">광고매체.</span>
                  <br />
                  예측 가능한 성과.
                </>
              ) : (
                <>
                  Verified <span className="tkad-home-accent-text">OOH.</span>
                  <br />
                  Predictable outcomes.
                </>
              )}
            </h1>

            <p className="max-w-md text-base text-muted-foreground">
              {isKo
                ? "현장 검증 데이터로 매체를 비교하고, 예산에 맞는 믹스를 3분 만에 설계하세요. 견적부터 집행까지 원스톱으로."
                : "Compare media with verified on-site data and build a budget-fit mix in minutes—from quote to execution."}
            </p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/media"
                className="tkad-neon-cta inline-flex items-center gap-2 rounded-[14px] px-6 py-3 font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a855f7] focus-visible:ring-offset-2"
              >
                {isKo ? "지금 시작하기" : "Start now"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/planner"
                className="inline-flex items-center border-2 border-foreground px-6 py-3 font-bold transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
              >
                {isKo ? "AI 플래너 써보기 →" : "Try AI Planner →"}
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="border border-foreground/30 px-3 py-1 font-mono text-xs uppercase tracking-wide text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full min-w-0">
            <p className="mb-3 font-mono text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              {isKo ? "전국 매체 분포" : "Nationwide footprint"}
            </p>
            <HomeHeroMapCard pins={mapPins} isKo={isKo} />
            <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {isKo
                ? `핀 ${mapPins.length} · 클릭 시 매체명`
                : `${mapPins.length} pins · tap for name`}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
