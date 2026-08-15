"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HomeHeroMapPin } from "@/lib/public-media-catalog";
import { HomeHeroMarquee } from "@/components/home/home-hero-marquee";
import { accentTag } from "@/lib/render-accent-title";
import { cn } from "@/lib/utils";

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

const HERO_MIN_HEIGHT = "calc(100dvh - var(--nav-height, 4rem))";

// 낮/밤 외형은 `html.dark` 파생(Tailwind `dark:`). 과거 JS `darkHero`(=day) 분기를 CSS 로
// 이관 — 라이트(base)·다크(`dark:`) 토큰이 예전 day/night 브랜치와 1:1 대응한다.
const HERO_MUTED_CLASS = "text-gray-500 dark:text-muted-foreground";

type Props = {
  marqueeImageUrls: string[];
  mapPins: HomeHeroMapPin[];
};

function MarqueeBackground({ imageUrls }: { imageUrls: string[] }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden blur-[2px] opacity-[0.32] dark:opacity-[0.42]"
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
  impressions,
  activeBrands,
}: {
  impressions: number;
  activeBrands: number;
}) {
  const t = useTranslations("homePage");
  const locale = useLocale();
  const items = [
    {
      label: t("heroLiveToday"),
      value: impressions.toLocaleString(locale),
      live: true,
    },
    {
      label: t("heroLiveBrands"),
      value: `${activeBrands}+`,
    },
    {
      label: t("heroLiveResponse"),
      value: "24h",
    },
  ];

  const chipClass =
    "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 font-display text-xs font-medium uppercase tracking-widest text-gray-900 backdrop-blur-sm dark:border-border/60 dark:bg-background/80 dark:text-foreground dark:shadow-sm";
  const mutedClass = HERO_MUTED_CLASS;
  const valueClass = "tabular-nums text-gray-900 dark:text-foreground";

  return (
    <div className="flex flex-wrap items-center gap-3">
      {items.map((item) => (
        <div key={item.label} className={chipClass}>
          {item.live ? (
            <span className="inline-flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-violet-500" aria-hidden />
              LIVE
              <span className={mutedClass}>•</span>
            </span>
          ) : null}
          <span className={mutedClass}>{item.label}</span>
          <span className={valueClass}>{item.value}</span>
        </div>
      ))}
      <p
        className={cn(
          "hidden font-display text-xs font-medium uppercase tracking-widest sm:block",
          mutedClass,
        )}
      >
        {t("heroVerifiedOnly")}
      </p>
    </div>
  );
}

export function HomeHeroNeo({ marqueeImageUrls, mapPins }: Props) {
  const t = useTranslations("homePage");
  const [seed, setSeed] = useState(0);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const raf = requestAnimationFrame(() => setSeed(Date.now()));
    const id = window.setInterval(() => setTick((n) => (n + 1) % 10_000), 900);
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

  const tags = [t("heroTag1"), t("heroTag2"), t("heroTag3")];
  const mutedClass = HERO_MUTED_CLASS;

  return (
    <section
      style={{ minHeight: HERO_MIN_HEIGHT }}
      className="tkad-home-hero-neo relative flex w-full shrink-0 items-center overflow-hidden bg-gray-50 text-gray-900 dark:text-foreground"
    >
      <div className="absolute inset-0 z-0">
        <MarqueeBackground imageUrls={marqueeImageUrls} />
      </div>

      {/* 데이(라이트) 전용 네온 레이어 — 다크에선 숨김 */}
      <div aria-hidden className="absolute inset-0 z-[1] tkad-neon-depth dark:hidden" />
      <div
        aria-hidden
        className="absolute inset-0 z-[1] opacity-20 tkad-neon-grid dark:hidden"
      />
      <div
        aria-hidden
        className="absolute inset-0 z-[1] tkad-hero-noise opacity-[0.07] mix-blend-overlay dark:hidden"
      />

      <div
        aria-hidden
        className="absolute inset-0 z-[1] bg-[linear-gradient(to_bottom,rgba(5,5,10,0.55),rgba(5,5,10,0.82),rgba(5,5,10,0.94))] dark:bg-gradient-to-br dark:from-background/70 dark:via-background/45 dark:to-background/20"
      />

      <div className="relative z-[2] mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
        <LiveBar impressions={liveImpressions} activeBrands={liveActiveBrands} />

        <div className="mt-8 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <p className={cn(" text-xs tracking-widest", mutedClass)}>
              {t("heroEyebrow")}
            </p>

            <h1 className="text-balance text-5xl font-semibold leading-tight tracking-normal lg:text-6xl">
              {t.rich("heroTitleLine1", { accent: accentTag })}
              <br />
              {t("heroTitleLine2")}
            </h1>

            <p className={cn("max-w-md text-base", mutedClass)}>{t("heroSubtitle")}</p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/media"
                className="tkad-neon-cta inline-flex items-center gap-2 rounded-[14px] px-6 py-3 font-bold dark:text-white text-gray-900 transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a855f7] focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {t("heroCtaStart")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/planner"
                className="inline-flex items-center px-6 py-3 font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded-2xl border border-gray-200 bg-gray-50 bg-gray-100 text-gray-900 hover:border-white/22 focus-visible:ring-white/40 focus-visible:ring-offset-black dark:rounded-none dark:border-2 dark:border-foreground dark:bg-transparent dark:text-foreground dark:hover:border-foreground dark:hover:bg-foreground dark:hover:text-background dark:focus-visible:ring-foreground dark:focus-visible:ring-offset-background"
              >
                {t("heroCtaPlanner")}
              </Link>
            </div>

            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="border px-3 py-1 font-display text-xs uppercase tracking-wide border-gray-300 text-gray-500 dark:border-foreground/30 dark:text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="w-full min-w-0">
            <p
              className={cn(
                "mb-3 font-display text-xs font-medium uppercase tracking-widest",
                mutedClass,
              )}
            >
              {t("heroMapTitle")}
            </p>
            <div className="border-gray-200 bg-gray-50 [&>div]:shadow-[0_18px_48px_rgba(0,0,0,0.45)] dark:bg-transparent dark:[&>div]:shadow-none">
              <HomeHeroMapCard pins={mapPins} />
            </div>
            <p
              className={cn(
                "mt-3 font-display text-[10px] font-semibold uppercase tracking-wider",
                mutedClass,
              )}
            >
              {t("heroMapHint", { count: mapPins.length })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
