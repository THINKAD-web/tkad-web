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
  Search,
  Camera,
  Database,
  ClipboardCheck,
} from "lucide-react";

import { TestimonialsCarousel } from "@/components/testimonials-carousel";
import { HomeMediaCarousel } from "@/components/home-media-carousel";
import { testimonials } from "@/data/testimonials";
import { Link } from "@/i18n/navigation";
import { BtnBlock, SectionHead } from "@/components/brutalist";

const ScrollAnimate = dynamic(() => import("@/components/scroll-animate"));
/**
 * HeroKenBurns 는 "use client" 컴포넌트. Server Component(page.tsx) 안에서는
 * `ssr: false` 옵션을 쓸 수 없다(Next.js 16). 대신 그냥 code-split 만 적용하고,
 * 초기 SSR 렌더에서는 클라이언트 훅(useEffect) 없이 기본 index=0 상태로
 * 첫 이미지만 노출 → 클라이언트 하이드레이션 후 애니/캐러셀 시작.
 */
const HeroKenBurns = dynamic(() => import("@/components/hero-ken-burns"), {
  loading: () => (
    <div aria-hidden className="absolute inset-0 z-0 bg-bx-black" />
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
    <>
      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden bg-bx-black">
        {/* Ken Burns 배경 — 내부에서 가독성 그라디언트/accent 오버레이까지 함께 적용 */}
        <HeroKenBurns />

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <div className="hero-fade-in hero-fade-in-seq-0 mb-8 inline-flex items-center gap-2 border-2 border-bx-accent bg-bx-black/60 px-4 py-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent backdrop-blur-sm">
            <span className="h-1.5 w-1.5 bg-bx-accent" />
            {isKo ? "대한민국 No.1 OOH 광고 에이전시" : "Korea's #1 OOH Ad Agency"}
          </div>

          <h1 className="text-5xl leading-[1.05] font-extrabold tracking-tight text-bx-white lg:text-7xl">
            {isKo ? (
              <>
                <span className="hero-fade-in hero-fade-in-seq-1 block">
                  생각하는 광고회사
                </span>
                <span className="hero-fade-in hero-fade-in-seq-2 mt-1 block text-bx-accent">
                  싱커드
                </span>
              </>
            ) : (
              <>
                <span className="hero-fade-in hero-fade-in-seq-1 block">
                  The Thinking Ad Agency
                </span>
                <span className="hero-fade-in hero-fade-in-seq-2 mt-1 block text-bx-accent">
                  THINKAD
                </span>
              </>
            )}
          </h1>

          <p className="hero-fade-in hero-fade-in-seq-3 mx-auto mt-8 max-w-2xl text-base leading-relaxed text-bx-white/85 sm:text-lg">
            {t("hero.subtitle")}
          </p>

          <p className="hero-fade-in hero-fade-in-seq-4 mx-auto mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
            {`// `}
            {isKo
              ? "싱커드가 직접 검증하고 관리하는 매체만"
              : "Only media verified and managed by THINKAD"}
          </p>

          <div className="hero-fade-in hero-fade-in-seq-5 mx-auto mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <BtnBlock href="/contact" variant="accent" size="lg">
              {isKo ? "무료 상담 신청" : "Free Consultation"}
              <ArrowRight className="h-4 w-4" />
            </BtnBlock>
            <BtnBlock href="/media" variant="secondary" size="lg">
              {t("hero.cta")}
              <ArrowRight className="h-4 w-4" />
            </BtnBlock>
          </div>
          <p className="hero-fade-in hero-fade-in-seq-6 mt-6 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-white/50">
            {isKo
              ? "// 30초 만에 신청 완료 · 24시간 내 전문 컨설턴트 연락"
              : "// Apply in 30 seconds · Consultant contacts within 24h"}
          </p>

          <div className="hero-fade-in hero-fade-in-seq-7 mt-12 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-bx-white/80">
            {[
              { value: "500+", label: isKo ? "검증 매체" : "Verified media" },
              { value: "15년", label: isKo ? "OOH 경력" : "Years of OOH" },
              { value: "100+", label: isKo ? "대기업 파트너" : "Enterprise partners" },
            ].map((s) => (
              <div key={s.label} className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-bx-accent sm:text-3xl">
                  {s.value}
                </span>
                <span className="font-mono text-[10px] tracking-[0.22em] uppercase text-bx-white/55">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div
          className="hero-fade-in hero-fade-in-seq-7 absolute bottom-8 left-1/2 -translate-x-1/2 motion-reduce:animate-none"
          aria-hidden
        >
          <ChevronDown className="hero-chevron-bounce h-6 w-6 text-bx-white/50 motion-reduce:animate-none" />
        </div>
      </section>

      {/* Verification Process */}
      <section className="bg-bx-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <SectionHead
              number="01"
              category={isKo ? "Verification" : "Verification"}
              title={
                isKo ? (
                  <>
                    싱커드만의 <span className="bx-accent">4단계</span> 매체 검증
                  </>
                ) : (
                  <>
                    THINKAD&apos;s <span className="bx-accent">4-Step</span> Media Verification
                  </>
                )
              }
              meta={
                isKo
                  ? "every media verified before registration"
                  : "every media verified before registration"
              }
            />
          </ScrollAnimate>

          <div className="mt-12 grid grid-cols-1 gap-0 sm:grid-cols-2 lg:grid-cols-4 lg:divide-x-2 lg:divide-bx-black">
            {[
              {
                icon: Search,
                step: "01",
                image: "/images/process/step-1-site-visit.jpg",
                title: isKo ? "현장 방문" : "Site Visit",
                desc: isKo
                  ? "담당자가 직접 매체 현장을 방문하여 설치 환경과 주변 유동인구를 확인합니다."
                  : "Our team personally visits the media site to check installation conditions and surrounding foot traffic.",
              },
              {
                icon: Camera,
                step: "02",
                image: "/images/process/step-2-measurement.jpg",
                title: isKo ? "촬영 및 실측" : "Photo & Measurement",
                desc: isKo
                  ? "매체 크기, 시인성, 조도를 정밀 측정하고 다각도 촬영으로 기록합니다."
                  : "We precisely measure media size, visibility, and illumination with multi-angle photography.",
              },
              {
                icon: Database,
                step: "03",
                image: "/images/process/step-3-data-review.jpg",
                title: isKo ? "데이터 검증" : "Data Verification",
                desc: isKo
                  ? "유동인구 데이터, 차량 통행량, 노출 빈도를 분석하여 매체 효과를 검증합니다."
                  : "We analyze foot traffic, vehicle flow, and exposure frequency to verify media effectiveness.",
              },
              {
                icon: ClipboardCheck,
                step: "04",
                image: "/images/process/step-4-registration.jpg",
                title: isKo ? "매체 등록" : "Media Registration",
                desc: isKo
                  ? "검증을 통과한 매체만 싱커드 플랫폼에 등록되어 광고주에게 제안됩니다."
                  : "Only verified media are registered on the THINKAD platform and proposed to advertisers.",
              },
            ].map((item, index) => (
              <ScrollAnimate key={item.step} delay={index * 120}>
                <div className="group relative h-full border-2 border-bx-black bg-bx-white lg:border-0 lg:border-t-2">
                  {/* #HOME-1: 사진 → SVG 아이콘 */}
                  <div className="relative flex aspect-[16/10] items-center justify-center overflow-hidden border-b-2 border-bx-black bg-bx-off">
                    <item.icon
                      className="h-20 w-20 text-bx-black sm:h-24 sm:w-24"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <span className="absolute left-0 top-0 inline-flex items-center gap-1 border-b-2 border-r-2 border-bx-black bg-bx-accent px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
                      STEP {item.step}
                    </span>
                  </div>
                  <div className="flex flex-col gap-2 p-6">
                    <h3 className="text-lg font-bold tracking-tight text-bx-black sm:text-xl">
                      {item.title}
                    </h3>
                    <p className="font-mono text-[12px] leading-relaxed tracking-tight text-bx-gray-dim">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* 싱커드 추천 매체 — 표시 개수와 무관하게 'TOP 3' 표기 제거 */}
      <section className="bg-bx-off py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <SectionHead
              number="02"
              category="Recommended"
              title={
                isKo ? (
                  <>
                    싱커드 <span className="bx-accent">추천</span> 매체
                  </>
                ) : (
                  <>
                    THINKAD <span className="bx-accent">Recommended</span> Media
                  </>
                )
              }
              meta={
                isKo
                  ? "curated from verified data"
                  : "curated from verified data"
              }
            />
          </ScrollAnimate>

          {featuredItems.length === 0 ? (
            <p className="mt-8 text-center font-mono text-[12px] uppercase tracking-[0.22em] text-bx-gray-dim">
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
        </div>
      </section>

      {/* 인기 매체 — 추천과 별개로 관리 (isPopular / popularOrder) */}
      {popularItems.length > 0 && (
        <section className="bg-bx-white py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollAnimate>
              <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                <SectionHead
                  number="03"
                  category="Popular"
                  title={
                    isKo ? (
                      <>
                        지금 가장 <span className="bx-accent">주목</span>받는 매체
                      </>
                    ) : (
                      <>
                        <span className="bx-accent">Trending</span> Right Now
                      </>
                    )
                  }
                  meta={isKo ? "hand-picked by our team" : "hand-picked by our team"}
                  className="mb-0 flex-1"
                />
                <Link
                  href="/media"
                  className="group inline-flex items-center gap-2 self-end border-b-2 border-bx-black pb-1 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-black transition-colors hover:text-bx-accent hover:border-bx-accent"
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
          </div>
        </section>
      )}

      {/* Why THINKAD */}
      <section className="bg-bx-off py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <SectionHead
              number="04"
              category={isKo ? "Why us" : "Why us"}
              title={
                isKo ? (
                  <>
                    왜 <span className="bx-accent">싱커드</span>인가?
                  </>
                ) : (
                  <>
                    Why <span className="bx-accent">THINKAD</span>?
                  </>
                )
              }
              meta={
                isKo
                  ? "don't waste budget on unverified media"
                  : "don't waste budget on unverified media"
              }
            />
          </ScrollAnimate>
          <div className="mt-12 grid grid-cols-1 gap-0 lg:grid-cols-3">
            {[
              {
                icon: Eye,
                title: isKo ? "직접 현장 검증" : "On-Site Verification",
                desc: isKo
                  ? "모든 매체를 담당자가 직접 방문하여 실제 노출 환경, 시인성, 유동인구를 확인합니다. 사진과 리포트로 기록된 검증 데이터를 제공합니다."
                  : "Our team personally visits every media location to verify actual exposure, visibility, and foot traffic. We provide verification data documented with photos and reports.",
                highlight: isKo ? "100% 현장 방문" : "100% Site Visits",
              },
              {
                icon: BarChart3,
                title: isKo ? "1년 이상 효과 데이터" : "1+ Year Performance Data",
                desc: isKo
                  ? "단기 캠페인이 아닌, 1년 이상 축적된 매체별 효과 데이터를 기반으로 최적의 매체를 추천합니다. 실제 ROI로 검증된 매체만 제안합니다."
                  : "We recommend optimal media based on 1+ years of accumulated performance data per media, not short-term campaigns. We only propose media verified by actual ROI.",
                highlight: isKo ? "데이터 기반 추천" : "Data-Driven",
              },
              {
                icon: FileCheck,
                title: isKo ? "계약~사후관리 책임" : "Contract to Post-Care",
                desc: isKo
                  ? "계약, 설치, 집행, 모니터링, 리포팅, 사후관리까지 전 과정을 싱커드가 책임집니다. 중간 단계 없이 원스톱으로 관리합니다."
                  : "THINKAD takes full responsibility from contract, installation, execution, monitoring, reporting, to post-campaign management. One-stop management with no middlemen.",
                highlight: isKo ? "원스톱 관리" : "One-Stop",
              },
            ].map((item, i) => (
              <ScrollAnimate key={item.title} delay={i * 100}>
                <div className="group relative h-full border-2 border-bx-black bg-bx-white p-8 transition-colors hover:bg-bx-black hover:text-bx-white lg:border-r-0 lg:last:border-r-2">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim group-hover:text-bx-white/60">
                      [{String(i + 1).padStart(2, "0")}]
                    </span>
                    <item.icon className="h-7 w-7 text-bx-black transition-colors group-hover:text-bx-accent" strokeWidth={1.75} />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-bx-black group-hover:text-bx-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 font-mono text-[12px] leading-relaxed tracking-tight text-bx-gray-dim group-hover:text-bx-white/80">
                    {item.desc}
                  </p>
                  <div className="mt-6 inline-flex items-center gap-2 border-2 border-bx-accent bg-bx-accent px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
                    {item.highlight}
                  </div>
                </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials (캐러셀 — data/testimonials.ts 에서 관리) */}
      <section className="bg-bx-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <SectionHead
              number="05"
              category={isKo ? "Testimonials" : "Testimonials"}
              title={
                isKo ? (
                  <>
                    광고주가 직접 전하는 <span className="bx-accent">이야기</span>
                  </>
                ) : (
                  <>
                    What Our <span className="bx-accent">Clients</span> Say
                  </>
                )
              }
              meta={
                isKo
                  ? "real stories from partners"
                  : "real stories from partners"
              }
            />
          </ScrollAnimate>
          <div className="mt-10">
            <TestimonialsCarousel items={testimonials} isKo={isKo} />
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-bx-black py-20 text-bx-white">
        <ScrollAnimate className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
            {`// ${isKo ? "지금 시작하세요" : "Get started now"}`}
          </p>
          <h2 className="mt-4 text-3xl font-bold leading-[1.05] tracking-tight text-bx-white sm:text-4xl lg:text-6xl">
            {t("ctaBanner.title")}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-bx-white/75 sm:text-lg">
            {t("ctaBanner.description")}
          </p>
          <div className="mt-10 flex justify-center">
            <BtnBlock href="/contact" variant="accent" size="lg">
              {t("ctaBanner.cta")}
              <ArrowRight className="h-4 w-4" />
            </BtnBlock>
          </div>
        </ScrollAnimate>
      </section>
    </>
  );
}
