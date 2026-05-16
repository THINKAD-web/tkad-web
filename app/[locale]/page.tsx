import dynamic from "next/dynamic";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type MediaItem } from "@/lib/media-data";
import {
  fetchHomeFeaturedMedia,
  fetchHomeHeroVisualAssets,
  fetchHomePopularMedia,
} from "@/lib/public-media-catalog";
import {
  ArrowRight,
  BarChart3,
  Eye,
  FileCheck,
} from "lucide-react";

import { TestimonialsCarousel } from "@/components/testimonials-carousel";
import { HomeMediaCarousel } from "@/components/home-media-carousel";
import { testimonials } from "@/data/testimonials";
import { Link } from "@/i18n/navigation";
import { HomeClientLogos } from "@/components/home-client-logos";
import { FloatingCta } from "@/components/floating-cta";
import { HomeVerificationSteps } from "@/components/home-verification-steps";
import { HomeHeroNeo } from "@/components/home-hero-neo";
import { NeonSection } from "@/components/landing/neon/neon-section";
import { NeonSectionHead } from "@/components/landing/neon/neon-section-head";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { HomeCommunitySection } from "@/components/home-community-section";
import { listHomeCommunityPosts } from "@/lib/community/queries";
import type { CommunityPostListItem } from "@/lib/community/types";
import { accentTag } from "@/lib/render-accent-title";
import { HomeMediaPartnerCta } from "@/components/home-media-partner-cta";

const ScrollAnimate = dynamic(() => import("@/components/scroll-animate"));
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
  const [featuredCatalog, popularCatalog, communityPosts, heroVisuals] =
    await Promise.all([
      fetchHomeFeaturedMedia(8),
      fetchHomePopularMedia(12),
      listHomeCommunityPosts(),
      fetchHomeHeroVisualAssets(),
    ]);

  return (
    <HomeContent
      locale={locale}
      t={t}
      th={th}
      featuredCatalog={featuredCatalog}
      popularCatalog={popularCatalog}
      communityPosts={communityPosts}
      heroVisuals={heroVisuals}
    />
  );
}

function HomeContent({
  locale,
  t,
  th,
  featuredCatalog,
  popularCatalog,
  communityPosts,
  heroVisuals,
}: {
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
  th: Awaited<ReturnType<typeof getTranslations<"homePage">>>;
  featuredCatalog: MediaItem[];
  popularCatalog: MediaItem[];
  communityPosts: CommunityPostListItem[];
  heroVisuals: Awaited<ReturnType<typeof fetchHomeHeroVisualAssets>>;
}) {
  /** 캐러셀 — 추천 매체 전체 활용 (TOP3 라벨은 첫 3개에만) */
  const featuredItems = featuredCatalog.slice(0, 8);
  /** 추천과 겹치는 항목은 인기 섹션에서 제외해 중복 노출 방지 */
  const popularItems = popularCatalog
    .filter((m) => !featuredItems.some((f) => f.id === m.id))
    .slice(0, 12);

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
    <HomeLandingDayNight>
      <HomeHeroNeo
        marqueeImageUrls={heroVisuals.marqueeImageUrls}
        mapPins={heroVisuals.mapPins}
      />

      <HomeMediaPartnerCta isKo={locale === "ko"} />

      <div className="tkad-landing-neon">
        <NeonSection className="mt-0 pt-0 pb-12 sm:pb-16 md:pb-24 lg:pb-32 xl:pb-40 2xl:pb-48">
          <ScrollAnimate>
            <NeonSectionHead
              number="01"
              kicker={th("verificationKicker")}
              title={th.rich("verificationTitle", { accent: accentTag })}
              meta={th("verificationMeta")}
            />
          </ScrollAnimate>

          <HomeVerificationSteps />
        </NeonSection>

        <HomeClientLogos />

        <NeonSection className="pt-10 pb-[calc(3rem+14px)] sm:pt-16 sm:pb-[calc(5rem+14px)] md:pt-24 md:pb-[calc(7rem+14px)]">
          <ScrollAnimate>
            <NeonSectionHead
              number="02"
              kicker={th("packagesKicker")}
              title={th.rich("packagesTitle", { accent: accentTag })}
              meta={th("packagesMeta")}
            />
          </ScrollAnimate>
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
          <ScrollAnimate>
            <NeonSectionHead
              number="03"
              kicker={th("featuredKicker")}
              title={th.rich("featuredTitle", { accent: accentTag })}
              meta={th("featuredMeta")}
            />
          </ScrollAnimate>

          {featuredItems.length === 0 ? (
            <p className="mt-6 text-center font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-white/60 sm:mt-8">
              {th("featuredEmpty")}
            </p>
          ) : (
            <div className="mt-5 sm:mt-8 lg:mt-10">
              <HomeMediaCarousel
                items={featuredItems}
                variant="featured"
                showRankBadge
              />
            </div>
          )}
        </NeonSection>

        {popularItems.length > 0 && (
          <NeonSection className="pt-[calc(3rem+14px)] pb-12 sm:pt-[calc(5rem+14px)] sm:pb-20 md:pt-[calc(7rem+14px)] md:pb-28 lg:pt-[calc(10rem+14px)] lg:pb-40 xl:pt-[calc(12rem+14px)] xl:pb-48">
            <ScrollAnimate>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between sm:gap-6">
                <NeonSectionHead
                  number="04"
                  kicker={th("popularKicker")}
                  title={th.rich("popularTitle", { accent: accentTag })}
                  meta={th("popularMeta")}
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
            </ScrollAnimate>
            <div className="mt-5 sm:mt-8 lg:mt-10">
              <HomeMediaCarousel items={popularItems} variant="popular" />
            </div>
          </NeonSection>
        )}

        <NeonSection>
          <ScrollAnimate>
            <NeonSectionHead
              number="05"
              kicker={th("whyKicker")}
              title={th.rich("whyTitle", { accent: accentTag })}
              meta={th("whyMeta")}
            />
          </ScrollAnimate>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:mt-10 sm:gap-4 md:mt-12 md:gap-5 lg:grid-cols-3">
            {whyCards.map((item, i) => (
              <ScrollAnimate key={item.title} delay={i * 100}>
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
              </ScrollAnimate>
            ))}
          </div>
        </NeonSection>

        <NeonSection>
          <ScrollAnimate>
            <NeonSectionHead
              number="06"
              kicker={th("testimonialsKicker")}
              title={th.rich("testimonialsTitle", { accent: accentTag })}
              meta={th("testimonialsMeta")}
            />
          </ScrollAnimate>
          <div className="mt-5 sm:mt-8 lg:mt-10">
            <TestimonialsCarousel items={testimonials} />
          </div>
        </NeonSection>

        <ScrollAnimate>
          <HomeCommunitySection posts={communityPosts} locale={locale} />
        </ScrollAnimate>

        <NeonSection innerClassName="text-center">
          <ScrollAnimate className="mx-auto max-w-4xl">
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
          </ScrollAnimate>
        </NeonSection>

        <FloatingCta />
      </div>
    </HomeLandingDayNight>
  );
}
