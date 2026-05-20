import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type MediaItem } from "@/lib/media-data";
import {
  fetchHomeFeaturedMedia,
  fetchHomeHeroVisualAssets,
  fetchHomeInstantBookingMedia,
  fetchHomeNewMedia,
  fetchHomeWeeklyPopularMedia,
} from "@/lib/public-media-catalog";
import { attachRecommendReason } from "@/lib/media-recommend-reasons";
import { recommendPersonalizedHomeMedia } from "@/lib/media-personalized-recommend";
import {
  ArrowRight,
  BarChart3,
  Eye,
  FileCheck,
} from "lucide-react";

import { HomeHeroServer } from "@/components/home/home-hero-server";
import { HomeMediaHorizontalScroll } from "@/components/home/home-media-horizontal-scroll";
import { testimonials } from "@/data/testimonials";
import { Link } from "@/i18n/navigation";
import { HomeVerificationStepsServer } from "@/components/home/home-verification-steps-server";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { HomeAppearanceShell } from "@/components/home/home-appearance-shell";
import { listHomeCommunityPosts } from "@/lib/community/queries";
import { getLatestPublishedSuccessCases } from "@/lib/public-content-queries";
import { HomeSuccessCasesSection } from "@/components/home/home-success-cases-section";
import type { CommunityPostListItem } from "@/lib/community/types";
import { accentTag } from "@/lib/render-accent-title";
import { HomeMediaPartnerCta } from "@/components/home-media-partner-cta";
import { getCurrentUser } from "@/lib/user-session";
import { getUserPreferenceByUserId } from "@/lib/user-preference";
import { fetchPublicMediaCatalog } from "@/lib/public-media-catalog";
import { HomePersonalizedMedia } from "@/components/home/home-personalized-media";

import {
  HomeClientLogosWhenVisible,
  HomeCommunitySectionLazy,
  HomeFloatingCta,
  HomeRecentlyViewedLazy,
  HomePwaWidget,
  HomeScrollAnimate,
  HomeTestimonialsCarouselLazy,
} from "@/components/home/home-client-widgets";

/** 홈 — ISR 60초 (히어로·매체 그리드·통계 크롤러 노출) */
export const revalidate = 60;
type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations();
  const th = await getTranslations("homePage");
  /**
   * 추천 매체: Prisma `isFeatured`·`featuredOrder` (관리자에서 지정).
   * 인기 매체: Prisma `isPopular`·`popularOrder` (관리자에서 별도 지정).
   */
  const user = await getCurrentUser();

  const [
    featuredCatalog,
    weeklyPopularCatalog,
    newMediaCatalog,
    instantBookingCatalog,
    communityPosts,
    heroVisuals,
    latestCases,
    pref,
    fullCatalog,
  ] = await Promise.all([
    fetchHomeFeaturedMedia(8),
    fetchHomeWeeklyPopularMedia(6),
    fetchHomeNewMedia(6),
    fetchHomeInstantBookingMedia(6),
    listHomeCommunityPosts(),
    fetchHomeHeroVisualAssets(),
    getLatestPublishedSuccessCases(locale, 3),
    user ? getUserPreferenceByUserId(user.id) : Promise.resolve(null),
    user ? fetchPublicMediaCatalog() : Promise.resolve([] as MediaItem[]),
  ]);

  const personalizedItems = user
    ? await recommendPersonalizedHomeMedia(
        user.id,
        pref,
        fullCatalog,
        locale,
        6,
      )
    : [];

  const weeklyPopularItems = attachRecommendReason(
    weeklyPopularCatalog,
    "weekly_popular",
    locale,
  );
  const newMediaItems = attachRecommendReason(
    newMediaCatalog,
    "new_listing",
    locale,
  );
  const instantBookingItems = attachRecommendReason(
    instantBookingCatalog,
    "instant_booking",
    locale,
  );
  const displayName = user
    ? (user.name ?? user.email.split("@")[0])
    : null;

  return (
    <HomeContent
      locale={locale}
      t={t}
      th={th}
      featuredCatalog={featuredCatalog}
      weeklyPopularItems={weeklyPopularItems}
      newMediaItems={newMediaItems}
      instantBookingItems={instantBookingItems}
      communityPosts={communityPosts}
      heroVisuals={heroVisuals}
      latestCases={latestCases}
      personalizedItems={personalizedItems}
      displayName={displayName}
    />
  );
}

function HomeContent({
  locale,
  t,
  th,
  featuredCatalog,
  weeklyPopularItems,
  newMediaItems,
  instantBookingItems,
  communityPosts,
  heroVisuals,
  latestCases,
  personalizedItems,
  displayName,
}: {
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
  th: Awaited<ReturnType<typeof getTranslations<"homePage">>>;
  featuredCatalog: MediaItem[];
  weeklyPopularItems: MediaItem[];
  newMediaItems: MediaItem[];
  instantBookingItems: MediaItem[];
  communityPosts: CommunityPostListItem[];
  heroVisuals: Awaited<ReturnType<typeof fetchHomeHeroVisualAssets>>;
  latestCases: Awaited<ReturnType<typeof getLatestPublishedSuccessCases>>;
  personalizedItems: MediaItem[];
  displayName: string | null;
}) {
  /** 캐러셀 — 추천 매체 전체 활용 (TOP3 라벨은 첫 3개에만) */
  const featuredItems = featuredCatalog.slice(0, 8);
  const featuredIds = new Set(featuredItems.map((m) => m.id));
  const dedupe = (list: MediaItem[]) =>
    list.filter((m) => !featuredIds.has(m.id));

  const weeklyPopularDeduped = dedupe(weeklyPopularItems).slice(0, 6);
  const newMediaDeduped = dedupe(newMediaItems).slice(0, 6);
  const instantBookingDeduped = dedupe(instantBookingItems).slice(0, 6);

  const whyCards = [
    {
      icon: Eye,
      title: th("whyCard1Title"),
      desc: th("whyCard1Desc"),
      highlight: th("whyCard1Highlight"),
    },
    {
      icon: BarChart3,
      title: th("whyCard2Title"),
      desc: th("whyCard2Desc"),
      highlight: th("whyCard2Highlight"),
    },
    {
      icon: FileCheck,
      title: th("whyCard3Title"),
      desc: th("whyCard3Desc"),
      highlight: th("whyCard3Highlight"),
    },
  ] as const;

  return (
    <HomeAppearanceShell>
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        <HomePwaWidget />
      </div>
      <HomeHeroServer
        locale={locale}
        marqueeImageUrls={heroVisuals.marqueeImageUrls}
        mapPins={heroVisuals.mapPins}
      />

      {displayName && personalizedItems.length > 0 ? (
        <div className="tkad-landing-neon">
          <HomePersonalizedMedia
            locale={locale}
            displayName={displayName}
            items={personalizedItems}
          />
        </div>
      ) : null}

      <HomeMediaPartnerCta isKo={locale === "ko"} />

      <div className="tkad-landing-neon">
        <NeonSection className="mt-0 pt-0 pb-12 sm:pb-16 md:pb-24 lg:pb-32 xl:pb-40 2xl:pb-48">
          <HomeScrollAnimate>
            <NeonSectionHead
              number="01"
              kicker={th("verificationKicker")}
              title={th.rich("verificationTitle", { accent: accentTag })}
              meta={th("verificationMeta")}
            />
          </HomeScrollAnimate>

          <HomeVerificationStepsServer />
        </NeonSection>

        <HomeClientLogosWhenVisible />

        <NeonSection className="pt-10 pb-[calc(3rem+14px)] sm:pt-16 sm:pb-[calc(5rem+14px)] md:pt-24 md:pb-[calc(7rem+14px)]">
          <HomeScrollAnimate>
            <NeonSectionHead
              number="02"
              kicker={th("packagesKicker")}
              title={th.rich("packagesTitle", { accent: accentTag })}
              meta={th("packagesMeta")}
            />
          </HomeScrollAnimate>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm leading-relaxed text-white/78 sm:mt-8 sm:text-base">
            {th("packagesLead")}
          </p>
          <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:justify-center">
            <Link
              href="/media/packages"
              className="tkad-neon-cta group inline-flex h-14 items-center justify-center gap-2 rounded-[22px] px-10 text-base font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
            >
              {th("packagesCta")}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/contact"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/6 px-10 text-base font-black text-white backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10"
            >
              {t("contact.heroCtaQuote")}
              <ArrowRight className="h-4 w-4 text-white/80" />
            </Link>
          </div>
        </NeonSection>

        <NeonSection className="pt-10 pb-[calc(3rem+14px)] sm:pt-16 sm:pb-[calc(5rem+14px)] md:pt-24 md:pb-[calc(7rem+14px)] lg:pt-40 lg:pb-[calc(10rem+14px)] xl:pt-48 xl:pb-[calc(12rem+14px)]">
          <HomeScrollAnimate>
            <NeonSectionHead
              number="03"
              kicker={th("featuredKicker")}
              title={th.rich("featuredTitle", { accent: accentTag })}
              meta={th("featuredMeta")}
            />
          </HomeScrollAnimate>

          {featuredItems.length === 0 ? (
            <p className="mt-6 text-center font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-white/60 sm:mt-8">
              {th("featuredEmpty")}
            </p>
          ) : (
            <HomeMediaHorizontalScroll
              items={featuredItems}
              locale={locale}
              rows={1}
              showRankBadge
            />
          )}
        </NeonSection>

        {weeklyPopularDeduped.length > 0 && (
          <NeonSection className="pt-[calc(3rem+14px)] pb-12 sm:pt-[calc(5rem+14px)] sm:pb-20 md:pt-[calc(7rem+14px)] md:pb-28 lg:pt-[calc(10rem+14px)] lg:pb-40 xl:pt-[calc(12rem+14px)] xl:pb-48">
            <HomeScrollAnimate>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <NeonSectionHead
                  number="04"
                  kicker={th("weeklyPopularKicker")}
                  title={th.rich("weeklyPopularTitle", { accent: accentTag })}
                  meta={th("weeklyPopularMeta")}
                  className="mb-0 flex-1"
                />
                <Link
                  href="/media"
                  className="tkad-home-section-cta group inline-flex items-center gap-2 self-end border-b border-white/25 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85 transition-colors hover:border-white/45 hover:text-white"
                >
                  {th("viewAllMedia")}
                  <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
                </Link>
              </div>
            </HomeScrollAnimate>
            <HomeMediaHorizontalScroll
              items={weeklyPopularDeduped}
              locale={locale}
              rows={1}
              density="compact"
            />
          </NeonSection>
        )}

        {newMediaDeduped.length > 0 && (
          <NeonSection className="pt-[calc(2rem+14px)] pb-12 sm:pt-[calc(4rem+14px)] sm:pb-16 md:pb-24">
            <HomeScrollAnimate>
              <NeonSectionHead
                number="05"
                kicker={th("newMediaKicker")}
                title={th.rich("newMediaTitle", { accent: accentTag })}
                meta={th("newMediaMeta")}
              />
            </HomeScrollAnimate>
            <HomeMediaHorizontalScroll
              items={newMediaDeduped}
              locale={locale}
              rows={1}
              density="compact"
            />
          </NeonSection>
        )}

        {instantBookingDeduped.length > 0 && (
          <NeonSection className="pt-[calc(2rem+14px)] pb-12 sm:pt-[calc(4rem+14px)] sm:pb-20 md:pb-28">
            <HomeScrollAnimate>
              <NeonSectionHead
                number="06"
                kicker={th("instantBookingKicker")}
                title={th.rich("instantBookingTitle", { accent: accentTag })}
                meta={th("instantBookingMeta")}
              />
            </HomeScrollAnimate>
            <HomeMediaHorizontalScroll
              items={instantBookingDeduped}
              locale={locale}
              rows={1}
              density="compact"
            />
          </NeonSection>
        )}

        <NeonSection>
          <HomeScrollAnimate>
            <NeonSectionHead
              number="07"
              kicker={th("whyKicker")}
              title={th.rich("whyTitle", { accent: accentTag })}
              meta={th("whyMeta")}
            />
          </HomeScrollAnimate>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-10 sm:gap-4 md:mt-12 md:gap-5 lg:grid-cols-3">
            {whyCards.map((item, i) => (
              <HomeScrollAnimate key={item.title} delay={i * 100}>
                <div className="group relative h-full rounded-[28px] bg-white/6 p-5 backdrop-blur transition-all hover:-translate-y-1 tkad-neon-border tkad-neon-glow sm:p-7 lg:p-8">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/55">
                      [{String(i + 1).padStart(2, "0")}]
                    </span>
                    <item.icon
                      className="h-7 w-7 text-white/80 transition-colors group-hover:text-white"
                      strokeWidth={1.75}
                      aria-hidden
                    />
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-white/76">
                    {item.desc}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 rounded-2xl border border-white/14 bg-white/6 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white shadow-[0_18px_72px_rgba(0,0,0,0.65)] backdrop-blur">
                    <span
                      className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]"
                      aria-hidden
                    />
                    {item.highlight}
                  </div>
                </div>
              </HomeScrollAnimate>
            ))}
          </div>
        </NeonSection>

        <NeonSection>
          <HomeScrollAnimate>
            <NeonSectionHead
              number="06"
              kicker={th("testimonialsKicker")}
              title={th.rich("testimonialsTitle", { accent: accentTag })}
              meta={th("testimonialsMeta")}
            />
          </HomeScrollAnimate>
          {latestCases.length > 0 ? (
            <HomeSuccessCasesSection cases={latestCases} />
          ) : (
            <div className="mt-5 sm:mt-8 lg:mt-10">
              <HomeTestimonialsCarouselLazy items={testimonials} />
            </div>
          )}
        </NeonSection>

        <HomeScrollAnimate>
          <HomeCommunitySectionLazy posts={communityPosts} locale={locale} />
        </HomeScrollAnimate>

        <HomeRecentlyViewedLazy locale={locale} />

        <NeonSection innerClassName="text-center">
          <HomeScrollAnimate className="mx-auto max-w-4xl">
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-white/65">
              {`// ${th("ctaKicker")}`}
            </p>
            <h2 className="tkad-neon-text mt-4 text-balance text-4xl font-black leading-[1.02] tracking-[-0.06em] text-white sm:mt-6 sm:text-5xl lg:text-6xl">
              {t("ctaBanner.title")}
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/82 sm:mt-6 sm:text-lg">
              {t("ctaBanner.description")}
            </p>
            <div className="mt-6 flex flex-col items-stretch justify-center gap-3 sm:mt-9 sm:flex-row sm:items-center sm:gap-4 lg:mt-10">
              <Link
                href="/contact"
                className="tkad-neon-cta group inline-flex h-16 items-center justify-center gap-2 rounded-[22px] px-10 text-base font-black text-white transition-transform hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/35 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
              >
                {t("ctaBanner.cta")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                href="/media"
                className="group inline-flex h-16 items-center justify-center gap-2 rounded-[22px] border border-white/14 bg-white/6 px-10 text-base font-black text-white shadow-[0_30px_120px_rgba(0,0,0,0.7)] backdrop-blur transition-all hover:-translate-y-1 hover:border-white/22 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-black sm:text-lg"
              >
                {th("exploreMediaFirst")}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
            <p className="mx-auto mt-5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60 sm:mt-6 md:mt-7">
              {th("ctaFooter")}
            </p>
          </HomeScrollAnimate>
        </NeonSection>

        <HomeFloatingCta />
      </div>
    </HomeAppearanceShell>
  );
}
