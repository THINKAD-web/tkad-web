"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { HomeHeroMapPin } from "@/lib/public-media-catalog";
import { HomeHeroMarquee } from "@/components/home/home-hero-marquee";
import { accentTag } from "@/lib/render-accent-title";

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

type Props = {
  marqueeImageUrls: string[];
  mapPins: HomeHeroMapPin[];
};

function MarqueeBackground({ imageUrls }: { imageUrls: string[] }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none flex h-full w-full items-center justify-center overflow-hidden opacity-[0.22] blur-[2px] dark:opacity-[0.42]"
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
        className="absolute inset-0 z-[1] bg-gradient-to-br from-background/78 via-background/55 to-background/28 dark:from-background/70 dark:via-background/45 dark:to-background/20"
      />

      <div className="relative z-[2] mx-auto w-full max-w-7xl px-6 py-10 lg:px-8">
        <LiveBar impressions={liveImpressions} activeBrands={liveActiveBrands} />

        <div className="mt-8 grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <p className="font-mono text-xs tracking-widest text-muted-foreground">
              {t("heroEyebrow")}
            </p>

            <h1 className="text-balance text-5xl font-black leading-tight tracking-tight lg:text-6xl">
              {t.rich("heroTitleLine1", { accent: accentTag })}
              <br />
              {t("heroTitleLine2")}
            </h1>

            <p className="max-w-md text-base text-muted-foreground">{t("heroSubtitle")}</p>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/media"
                className="tkad-neon-cta inline-flex items-center gap-2 rounded-[14px] px-6 py-3 font-bold text-white transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#a855f7] focus-visible:ring-offset-2"
              >
                {t("heroCtaStart")}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/planner"
                className="inline-flex items-center border-2 border-foreground px-6 py-3 font-bold transition-colors hover:bg-foreground hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground focus-visible:ring-offset-2"
              >
                {t("heroCtaPlanner")}
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
              {t("heroMapTitle")}
            </p>
            <HomeHeroMapCard pins={mapPins} />
            <p className="mt-3 font-mono text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("heroMapHint", { count: mapPins.length })}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
