import dynamic from "next/dynamic";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { type MediaItem } from "@/lib/media-data";
import {
  fetchHomeFeaturedMedia,
  fetchHomePopularMedia,
} from "@/lib/public-media-catalog";
import {
  ArrowRight,
  BarChart3,
  ChevronDown,
  Eye,
  FileCheck,
  Play,
  Search,
  Camera,
  Database,
  ClipboardCheck,
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

const ScrollAnimate = dynamic(() => import("@/components/scroll-animate"));
/**
 * HeroKenBurns 는 "use client" 컴포넌트. Server Component(page.tsx) 안에서는
 * `ssr: false` 옵션을 쓸 수 없다(Next.js 16). 대신 그냥 code-split 만 적용하고,
 * 초기 SSR 렌더에서는 클라이언트 훅(useEffect) 없이 기본 index=0 상태로
 * 첫 이미지만 노출 → 클라이언트 하이드레이션 후 애니/캐러셀 시작.
 */
const HeroKenBurns = dynamic(() => import("@/components/hero-ken-burns"), {
  loading: () => (
    <div aria-hidden className="absolute inset-0 z-0 bg-hero-void" />
  ),
});

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations();
  /**
   * 추천 매체: Prisma `isFeatured`·`featuredOrder` (관리자에서 지정).
   * 인기 매체: Prisma `isPopular`·`popularOrder` (관리자에서 별도 지정).
   */
  const [featuredCatalog, popularCatalog] = await Promise.all([
    fetchHomeFeaturedMedia(8),
    fetchHomePopularMedia(12),
  ]);

  return (
    <HomeContent
      locale={locale}
      t={t}
      featuredCatalog={featuredCatalog}
      popularCatalog={popularCatalog}
    />
  );
}

function HomeContent({
  locale,
  t,
  featuredCatalog,
  popularCatalog,
}: {
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
  featuredCatalog: MediaItem[];
  popularCatalog: MediaItem[];
}) {
  const isKo = locale === "ko";
  /** 캐러셀 — 추천 매체 전체 활용 (TOP3 라벨은 첫 3개에만) */
  const featuredItems = featuredCatalog.slice(0, 8);
  /** 추천과 겹치는 항목은 인기 섹션에서 제외해 중복 노출 방지 */
  const popularItems = popularCatalog
    .filter((m) => !featuredItems.some((f) => f.id === m.id))
    .slice(0, 12);

  return (
    <HomeLandingDayNight>
    <div className="tkad-landing-neon">
      {/* Hero */}
      <HomeHeroNeo isKo={isKo} />

      {/* Verification Process */}
      <NeonSection>
        <ScrollAnimate>
          <NeonSectionHead
            number="01"
            kicker={isKo ? "Verification" : "Verification"}
            title={
              isKo ? (
                <>
                  싱커드만의 <span className="tkad-home-accent-text">4단계</span>{" "}
                  매체 검증
                </>
              ) : (
                <>
                  THINKAD&apos;s{" "}
                  <span className="tkad-home-accent-text">
                    4-Step
                  </span>{" "}
                  Media Verification
                </>
              )
            }
            meta={isKo ? "verified before registration" : "verified before registration"}
          />
        </ScrollAnimate>

        <HomeVerificationSteps isKo={isKo} />
      </NeonSection>

      <HomeClientLogos isKo={isKo} />

      {/* 싱커드 추천 매체 — 표시 개수와 무관하게 'TOP 3' 표기 제거 */}
      <NeonSection className="pt-40 pb-[calc(10rem+14px)] sm:pt-48 sm:pb-[calc(12rem+14px)]">
        <ScrollAnimate>
          <NeonSectionHead
            number="02"
            kicker="Recommended"
            title={
              isKo ? (
                <>
                  싱커드{" "}
                  <span className="tkad-home-accent-text">
                    추천
                  </span>{" "}
                  매체
                </>
              ) : (
                <>
                  THINKAD{" "}
                  <span className="tkad-home-accent-text">
                    Recommended
                  </span>{" "}
                  Media
                </>
              )
            }
            meta={isKo ? "curated from verified data" : "curated from verified data"}
          />
        </ScrollAnimate>

          {featuredItems.length === 0 ? (
            <p className="mt-8 text-center font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-white/60">
              {isKo
                ? "// 추천 매체 준비 중"
                : "// featured media coming soon"}
            </p>
          ) : (
            <div className="mt-10">
              <HomeMediaCarousel
                items={featuredItems}
                isKo={isKo}
                variant="featured"
                showRankBadge
              />
            </div>
          )}
      </NeonSection>

      {/* 인기 매체 — 추천과 별개로 관리 (isPopular / popularOrder) */}
      {popularItems.length > 0 && (
        <NeonSection className="pt-[calc(10rem+14px)] pb-40 sm:pt-[calc(12rem+14px)] sm:pb-48">
          <ScrollAnimate>
            <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <NeonSectionHead
                number="03"
                kicker="Popular"
                title={
                  isKo ? (
                    <>
                      지금 가장{" "}
                      <span className="tkad-home-accent-text">
                        주목
                      </span>
                      받는 매체
                    </>
                  ) : (
                    <>
                      <span className="tkad-home-accent-text">
                        Trending
                      </span>{" "}
                      Right Now
                    </>
                  )
                }
                meta={isKo ? "hand-picked by our team" : "hand-picked by our team"}
                className="mb-0 flex-1"
              />
              <Link
                href="/media"
                className="tkad-home-section-cta group inline-flex items-center gap-2 self-end border-b border-white/25 pb-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-white/85 transition-colors hover:border-white/45 hover:text-white"
              >
                {isKo ? "전체 매체" : "View all"}
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </ScrollAnimate>
          <div className="mt-10">
            <HomeMediaCarousel
              items={popularItems}
              isKo={isKo}
              variant="popular"
            />
          </div>
        </NeonSection>
      )}

      {/* Why THINKAD */}
      <NeonSection>
        <ScrollAnimate>
          <NeonSectionHead
            number="04"
            kicker={isKo ? "Why us" : "Why us"}
            title={
              isKo ? (
                <>
                  왜{" "}
                  <span className="tkad-home-accent-text">
                    싱커드
                  </span>
                  인가?
                </>
              ) : (
                <>
                  Why{" "}
                  <span className="tkad-home-accent-text">
                    THINKAD
                  </span>
                  ?
                </>
              )
            }
            meta={isKo ? "don’t waste budget on unverified media" : "don’t waste budget on unverified media"}
          />
        </ScrollAnimate>

        <div className="mt-12 grid grid-cols-1 gap-5 lg:grid-cols-3">
          {[
            {
              icon: Eye,
              title: isKo ? "직접 현장 검증" : "On-Site Verification",
              desc: isKo
                ? "담당자가 직접 방문해 실제 노출 환경·시인성·유동을 확인합니다. 사진/리포트로 검증 데이터를 제공합니다."
                : "We verify exposure, visibility, and foot traffic on-site, documented with photos and reports.",
              highlight: isKo ? "100% 현장 방문" : "100% Site Visits",
            },
            {
              icon: BarChart3,
              title: isKo ? "누적 성과 데이터" : "Performance Signals",
              desc: isKo
                ? "단기 느낌이 아니라, 축적된 지표로 성과를 예측 가능한 영역으로 가져옵니다."
                : "Not guesswork—signals turn performance into something you can forecast.",
              highlight: isKo ? "데이터 기반" : "Data-Driven",
            },
            {
              icon: FileCheck,
              title: isKo ? "집행까지 책임" : "Execution, End-to-End",
              desc: isKo
                ? "견적·계약·설치·모니터링·리포팅까지 원스톱으로 운영합니다."
                : "From quote to reporting, we run the campaign end-to-end.",
              highlight: isKo ? "원스톱 운영" : "One-Stop",
            },
          ].map((item, i) => (
            <ScrollAnimate key={item.title} delay={i * 100}>
              <div className="group relative h-full rounded-[28px] bg-white/6 p-8 backdrop-blur transition-all hover:-translate-y-1 tkad-neon-border tkad-neon-glow">
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
                  <span className="h-1.5 w-1.5 rounded-full bg-[#22d3ee]" aria-hidden />
                  {item.highlight}
                </div>
              </div>
            </ScrollAnimate>
          ))}
        </div>
      </NeonSection>

      {/* Testimonials (캐러셀 — data/testimonials.ts 에서 관리) */}
      <NeonSection>
        <ScrollAnimate>
          <NeonSectionHead
            number="05"
            kicker={isKo ? "Testimonials" : "Testimonials"}
            title={
              isKo ? (
                <>
                  광고주가 직접 전하는{" "}
                  <span className="tkad-home-accent-text">
                    이야기
                  </span>
                </>
              ) : (
                <>
                  What Our{" "}
                  <span className="tkad-home-accent-text">
                    Clients
                  </span>{" "}
                  Say
                </>
              )
            }
            meta={isKo ? "real stories from partners" : "real stories from partners"}
          />
        </ScrollAnimate>
        <div className="mt-10">
          <TestimonialsCarousel items={testimonials} isKo={isKo} />
        </div>
      </NeonSection>

      {/* CTA Banner */}
      <NeonSection innerClassName="text-center">
        <ScrollAnimate className="mx-auto max-w-4xl">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.24em] text-white/65">
            {`// ${isKo ? "지금 시작하세요" : "Get started now"}`}
          </p>
          <h2 className="tkad-neon-text mt-6 text-balance text-4xl font-black leading-[1.02] tracking-[-0.06em] text-white sm:text-5xl lg:text-6xl">
            {t("ctaBanner.title")}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">
            {t("ctaBanner.description")}
          </p>
          <div className="mt-10 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center sm:gap-4">
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
              {isKo ? "매체 먼저 보기" : "Explore media first"}
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
          <p className="mx-auto mt-7 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
            {isKo ? "// 검증 매체 기반 · 예산에 맞는 조합 제안" : "// Verified media · Budget-fit plan"}
          </p>
        </ScrollAnimate>
      </NeonSection>

      <FloatingCta isKo={isKo} />
    </div>
    </HomeLandingDayNight>
  );
}
