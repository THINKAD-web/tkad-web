import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { AbHeroImpression } from "@/components/ab/ab-tracker";
import { HomeHeroMapSlot } from "@/components/home/home-hero-map-slot";
import { HomeHeroCta } from "@/components/home/home-hero-cta";
import { getServerAbVariant } from "@/lib/ab-server";
import { heroCtaLabel } from "@/lib/ab-testing";
import { fetchHomeHeroInventoryStats } from "@/lib/home-hero-stats";
import type { HomeHeroMapPin } from "@/lib/public-media-catalog";
import { accentTag } from "@/lib/render-accent-title";

const HERO_MIN_HEIGHT = "min(100dvh, 720px)";

type Props = {
  locale: string;
  mapPins: HomeHeroMapPin[];
};

export async function HomeHeroServer({
  locale,
  mapPins,
}: Props) {
  const t = await getTranslations("homePage");
  const abVariant = await getServerAbVariant();
  const cta = heroCtaLabel(abVariant, locale);
  const stats = await fetchHomeHeroInventoryStats();

  const impressions = stats.estimatedDailyImpressions.toLocaleString(locale);
  const activeBrands = Math.max(1, stats.verifiedActiveMediaCount || 128);

  const liveItems = [
    { label: t("heroLiveToday"), value: impressions, live: true },
    { label: t("heroLiveBrands"), value: `${activeBrands}+` },
    { label: t("heroLiveResponse"), value: "24h" },
  ];

  const tags = [t("heroTag1"), t("heroTag2"), t("heroTag3")];

  return (
    <section
      style={{ minHeight: HERO_MIN_HEIGHT }}
      className="tkad-home-hero-neo relative flex w-full shrink-0 items-center overflow-hidden bg-gray-50 text-gray-900 dark:bg-[#05050a] dark:text-white"
      data-ab-variant={abVariant}
    >
      <AbHeroImpression page="/" />
      <div
        aria-hidden
        className="absolute inset-0 z-[1] bg-gradient-to-b from-gray-50 via-gray-50/95 to-gray-100 dark:bg-[linear-gradient(to_bottom,rgba(5,5,10,0.92),rgba(5,5,10,0.98))]"
      />

        <div className="relative z-[2] mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <div className="flex flex-wrap items-center gap-3">
            {liveItems.map((item) => (
              <div
                key={item.label}
                className="inline-flex items-center gap-2 rounded-2xl border border-gray-200 bg-gray-100 px-3 py-2 font-display text-xs font-medium uppercase tracking-widest text-gray-700 backdrop-blur-sm dark:border-white/20 dark:bg-white/10 dark:text-white"
              >
                {item.live ? (
                  <span className="inline-flex items-center gap-1.5">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-violet-500"
                      aria-hidden
                    />
                    LIVE
                    <span className="text-gray-400 dark:text-white/50">•</span>
                  </span>
                ) : null}
                <span className="text-gray-500 dark:text-white/60">{item.label}</span>
                <span className="tabular-nums text-gray-900 dark:text-white">{item.value}</span>
              </div>
            ))}
            <p className="hidden font-display text-xs font-medium uppercase tracking-widest text-gray-400 dark:text-white/50 sm:block">
              {t("heroVerifiedOnly")}
            </p>
          </div>

          <div className="mt-6 grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-10">
            <div className="flex flex-col gap-5">
              <p className="text-xs tracking-widest text-gray-400 dark:text-white/50">
                {t("heroEyebrow")}
              </p>

              <h1 className="text-balance text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
                {t.rich("heroTitleLine1", { accent: accentTag })}
                <br />
                {t("heroTitleLine2")}
              </h1>

              <p className="max-w-md text-base text-gray-600 dark:text-white/60">{t("heroSubtitle")}</p>

              <div className="flex flex-wrap gap-3">
                <HomeHeroCta
                  variant={abVariant}
                  label={`${cta.label}${cta.suffix}`}
                  href="/media"
                  page="/"
                />
                <Link
                  href="/planner"
                  className="inline-flex items-center rounded-2xl border dark:border-white/14 border-gray-200 dark:bg-white/6 bg-gray-50 px-6 py-3 font-bold dark:text-white text-gray-900 transition-colors hover:border-white/22 hover:dark:bg-white/10 bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black"
                >
                  {t("heroCtaPlanner")}
                </Link>
              </div>

              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <span
                    key={tag}
                    className="border dark:border-white/20 border-gray-300 px-3 py-1 font-display text-xs uppercase tracking-wide dark:text-white text-gray-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            <HomeHeroMapSlot
              pins={mapPins}
              mapTitle={t("heroMapTitle")}
              mapHint={t("heroMapHint", { count: mapPins.length })}
              className="max-h-[220px] sm:max-h-[260px] lg:max-h-none"
            />
          </div>
        </div>
    </section>
  );
}
