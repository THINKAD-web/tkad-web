import dynamic from "next/dynamic";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
// HeroKenBurns 는 아래 ScrollAnimate 정의 이후에 const 로 선언됨
import { type MediaItem } from "@/lib/media-data";
import {
  fetchHomeFeaturedMedia,
  fetchHomePopularMedia,
} from "@/lib/public-media-catalog";
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  CheckCircle,
  MapPin,
  ChevronDown,
  Eye,
  FileCheck,
  Star,
  Quote,
  Search,
  Camera,
  Database,
  ClipboardCheck,
  Trophy,
  PhoneCall,
} from "lucide-react";

import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { ProcessStepImage } from "@/components/process-step-image";
import {
  VisibilityGauge,
  FootTrafficBadge,
  ImpressionsCompact,
  VerifiedBadge,
  MediaTypeBadge,
} from "@/components/media-metric-viz";
import { TestimonialsCarousel } from "@/components/testimonials-carousel";
import { testimonials } from "@/data/testimonials";

const ScrollAnimate = dynamic(() => import("@/components/scroll-animate"));
/**
 * HeroKenBurns 는 "use client" 컴포넌트. Server Component(page.tsx) 안에서는
 * `ssr: false` 옵션을 쓸 수 없다(Next.js 16). 대신 그냥 code-split 만 적용하고,
 * 초기 SSR 렌더에서는 클라이언트 훅(useEffect) 없이 기본 index=0 상태로
 * 첫 이미지만 노출 → 클라이언트 하이드레이션 후 애니/캐러셀 시작.
 */
const HeroKenBurns = dynamic(() => import("@/components/hero-ken-burns"), {
  loading: () => (
    <div aria-hidden className="absolute inset-0 z-0 bg-navy" />
  ),
});

type Props = {
  params: Promise<{ locale: string }>;
};

const typeLabels: Record<string, { ko: string; en: string }> = {
  digital: { ko: "디지털", en: "Digital" },
  static: { ko: "고정형", en: "Static" },
  mobile: { ko: "이동형", en: "Mobile" },
  network: { ko: "네트워크/패키지", en: "Network / package" },
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
    fetchHomeFeaturedMedia(6),
    fetchHomePopularMedia(8),
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
  const topThreeFeatured = featuredCatalog.slice(0, 3);
  /** 추천과 겹치는 항목은 인기 섹션에서 제외해 중복 노출 방지 */
  const popularItems = popularCatalog
    .filter((m) => !topThreeFeatured.some((f) => f.id === m.id))
    .slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative flex min-h-screen items-center justify-center overflow-hidden">
        {/* Ken Burns 배경 — 내부에서 가독성 그라디언트/accent 오버레이까지 함께 적용 */}
        <HeroKenBurns />

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <div className="hero-fade-in hero-fade-in-seq-0 mb-6 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white/5 px-5 py-2 text-sm text-gold backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            {isKo ? "대한민국 No.1 OOH 광고 에이전시" : "Korea's #1 OOH Ad Agency"}
          </div>

          <h1 className="text-5xl leading-[1.1] font-extrabold tracking-tight text-white lg:text-7xl">
            {isKo ? (
              <>
                <span className="hero-fade-in hero-fade-in-seq-1 block">
                  생각하는 광고회사
                </span>
                <span className="hero-fade-in hero-fade-in-seq-2 mt-1 block bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  싱커드
                </span>
              </>
            ) : (
              <>
                <span className="hero-fade-in hero-fade-in-seq-1 block">
                  The Thinking Ad Agency
                </span>
                <span className="hero-fade-in hero-fade-in-seq-2 mt-1 block bg-gradient-to-r from-gold to-gold-light bg-clip-text text-transparent">
                  THINKAD
                </span>
              </>
            )}
          </h1>

          <p className="hero-fade-in hero-fade-in-seq-3 mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300/90 sm:text-lg lg:text-xl">
            {t("hero.subtitle")}
          </p>

          <p className="hero-fade-in hero-fade-in-seq-4 mx-auto mt-3 flex items-center justify-center gap-2 text-base text-gold/80 font-medium">
            <BadgeCheck className="h-5 w-5 text-gold" />
            {isKo
              ? "싱커드가 직접 검증하고 관리하는 매체만"
              : "Only media personally verified and managed by THINKAD"}
          </p>

          <div className="hero-fade-in hero-fade-in-seq-5 mx-auto mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:max-w-none sm:flex-row sm:items-center sm:justify-center sm:gap-4">
            <Link href="/contact" className="w-full sm:w-auto">
              <Button
                variant="cta"
                size="lg"
                className="btn-gold h-12 w-full min-h-11 rounded-full px-8 text-base font-semibold shadow-lg shadow-cta/25 sm:h-14 sm:w-auto sm:min-w-[11.5rem] sm:px-10 touch-manipulation"
              >
                <PhoneCall className="mr-2 h-5 w-5" />
                {isKo ? "무료 상담 신청" : "Free Consultation"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/media" className="w-full sm:w-auto">
              <Button
                size="lg"
                variant="outline"
                className="h-12 w-full min-h-11 rounded-full border-2 border-white/35 bg-white/5 px-8 text-base font-semibold text-white shadow-sm backdrop-blur-sm hover:bg-white/12 hover:border-white/55 sm:h-14 sm:w-auto sm:min-w-[11.5rem] sm:px-10 touch-manipulation"
              >
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="hero-fade-in hero-fade-in-seq-6 mt-5 text-sm text-slate-400">
            {isKo
              ? "30초 만에 신청 완료 · 24시간 내 전문 컨설턴트 연락"
              : "Apply in 30 seconds · Expert consultant contacts within 24h"}
          </p>

          <div className="hero-fade-in hero-fade-in-seq-7 mt-10 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 text-white/75">
            {[
              { value: "500+", label: isKo ? "검증 매체" : "Verified media" },
              { value: "15년", label: isKo ? "OOH 경력" : "Years of OOH" },
              { value: "100+", label: isKo ? "대기업 파트너" : "Enterprise partners" },
            ].map((s) => (
              <div key={s.label} className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-gold sm:text-3xl">
                  {s.value}
                </span>
                <span className="text-xs font-medium tracking-wide uppercase text-white/50">
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
          <ChevronDown className="hero-chevron-bounce h-6 w-6 text-white/50 motion-reduce:animate-none" />
        </div>
      </section>

      {/* Verification Process */}
      <section className="section-white relative py-16 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(232,213,181,0.06)_0%,_transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "검증 프로세스" : "Verification Process"}
              </p>
              <h2 className="section-title mt-3 text-3xl font-bold text-navy sm:text-4xl lg:text-5xl">
                {isKo ? "싱커드만의 4단계 매체 검증" : "THINKAD's 4-Step Media Verification"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {isKo
                  ? "모든 매체는 엄격한 검증 프로세스를 거쳐야만 등록됩니다"
                  : "Every media must pass our rigorous verification process before registration"}
              </p>
            </div>
          </ScrollAnimate>

          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
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
              <div className="verification-step group relative">
                {/* 단계 연결선 — 데스크톱 수평 타임라인 */}
                {index < 3 && (
                  <div className="absolute top-[44%] right-0 hidden h-0.5 w-[calc(100%-3rem)] translate-x-[calc(50%+1.5rem)] bg-gradient-to-r from-gold/40 to-gold/10 lg:block" />
                )}
                <div className="relative h-full flex flex-col overflow-hidden rounded-2xl border border-navy/8 bg-white shadow-sm transition-all duration-300 group-hover:shadow-lg group-hover:-translate-y-1">
                  {/* 현장 사진 영역 (placeholder 가 자동) */}
                  <div className="relative aspect-[16/9] bg-gradient-to-br from-navy/8 via-navy/3 to-gold/5">
                    <ProcessStepImage src={item.image} alt="" />
                    {/* 번호 뱃지 */}
                    <span className="absolute top-3 left-3 inline-flex items-center gap-1 rounded-full bg-navy px-2.5 py-1 text-[10px] font-bold text-gold-light shadow-sm">
                      STEP {item.step}
                    </span>
                    {/* 아이콘 — 이미지 우측 하단에 오버레이 */}
                    <span className="absolute right-3 bottom-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/92 backdrop-blur-sm ring-1 ring-gold/25 shadow-sm">
                      <item.icon className="h-5 w-5 text-gold-dark" strokeWidth={1.75} />
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col px-5 py-5">
                    <h3 className="text-base font-bold text-navy sm:text-lg">{item.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {item.desc}
                    </p>
                  </div>
                </div>
              </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* TOP 3 Recommended Media */}
      <section className="section-light py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 text-sm font-bold text-gold-dark">
                <Trophy className="h-4 w-4" />
                TOP 3
              </div>
              <h2 className="section-title mt-1 text-3xl font-bold text-navy sm:text-4xl lg:text-5xl">
                {isKo ? "싱커드 추천 매체 TOP 3" : "THINKAD Recommended Media TOP 3"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {isKo
                  ? "검증 데이터 기반, 가장 효과적인 매체를 엄선했습니다"
                  : "Curated selection of the most effective media based on verified data"}
              </p>
            </div>
          </ScrollAnimate>

          {topThreeFeatured.length === 0 ? (
            <p className="mt-8 text-center text-sm text-muted-foreground">
              {isKo
                ? "추천 매체를 불러오는 중입니다. 잠시 후 다시 확인해 주세요."
                : "Featured media will appear here once available."}
            </p>
          ) : (
          <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
            {topThreeFeatured.map((media, i) => {
              const rank = i + 1;
              const typeLabel = isKo
                ? (typeLabels[media.type]?.ko ?? media.type)
                : (typeLabels[media.type]?.en ?? media.type);
              /**
               * 전국 상위 백분위 — 간단 휴리스틱:
               *   일 유동 100,000+ → top 5%
               *   50,000+ → top 10%
               *   20,000+ → top 25%
               *   10,000+ → top 50%
               *   그 외 → null (표시 생략)
               */
              const daily = media.dailyFootTraffic ?? 0;
              const topPercentile =
                daily >= 100_000 ? 5
                  : daily >= 50_000 ? 10
                  : daily >= 20_000 ? 25
                  : daily >= 10_000 ? 50
                  : null;
              return (
                <ScrollAnimate key={media.id} delay={i * 100}>
                  <Card className="group relative overflow-hidden border-0 bg-white shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 rounded-2xl">
                    <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-gold to-gold-light" />
                    <MediaCatalogThumbnail
                      media={media}
                      fallbackUrl={`https://picsum.photos/id/${[1031, 366, 260][i]}/800/600`}
                      placeholderLabel={t("media.imagePreparing")}
                      className="group relative flex h-48 items-center justify-center"
                      imgClassName="opacity-90 transition duration-300 group-hover:scale-105"
                      bottomGradientClassName="absolute inset-0 bg-gradient-to-t from-navy/45 via-transparent to-transparent"
                      placeholderSize="sm"
                      alt={isKo ? media.name : (media.nameEn || media.name)}
                      priority={true}
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    >
                      <div className="absolute top-4 left-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-light text-lg font-bold text-navy shadow-md">
                        {rank}
                      </div>
                      <div className="absolute top-4 right-4 z-10">
                        <VerifiedBadge className="bg-emerald-500/95 border-emerald-400 text-white shadow-sm" />
                      </div>
                    </MediaCatalogThumbnail>
                    <CardHeader className="pb-3">
                      <MediaTypeBadge type={media.type} label={typeLabel} />
                      <CardTitle className="text-lg font-bold text-navy">
                        {isKo ? media.name : (media.nameEn || media.name)}
                      </CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {isKo ? media.location : (media.locationEn || media.location)}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 rounded-xl bg-slate-50 p-3">
                        <FootTrafficBadge
                          daily={media.dailyFootTraffic}
                          topPercentile={topPercentile}
                        />
                        <VisibilityGauge score={media.visibilityScore ?? 0} />
                        <div className="flex items-center justify-between pt-1 border-t border-slate-200/80">
                          <ImpressionsCompact
                            value={media.monthlyFootTraffic ?? null}
                            label={isKo ? "월 노출" : "Mo. impr."}
                          />
                          {media.dailyFootTraffic > 0 && (
                            <ImpressionsCompact
                              value={media.dailyFootTraffic * 30}
                              label={isKo ? "누적/월" : "Monthly"}
                              suffix={isKo ? "명" : ""}
                            />
                          )}
                        </div>
                      </div>

                      <div className="mt-5 flex gap-2">
                        <Link href={`/media/${media.id}`} className="flex-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="btn-navy-outline w-full rounded-lg text-xs font-semibold"
                          >
                            {isKo ? "상세 보기" : "View Details"}
                          </Button>
                        </Link>
                        <Link href="/contact" className="flex-1">
                          <Button
                            size="sm"
                            className="btn-gold w-full rounded-lg text-xs font-bold"
                          >
                            {isKo ? "문의하기" : "Inquire"}
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                </ScrollAnimate>
              );
            })}
          </div>
          )}
        </div>
      </section>

      {/* 인기 매체 — 추천과 별개로 관리 (isPopular / popularOrder) */}
      {popularItems.length > 0 && (
        <section className="section-white py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <ScrollAnimate>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-rose-50 px-4 py-1.5 text-sm font-bold text-rose-600">
                    <span>🔥</span>
                    {isKo ? "인기 매체" : "Popular"}
                  </div>
                  <h2 className="section-title mt-1 text-3xl font-bold text-navy sm:text-4xl">
                    {isKo ? "지금 가장 주목받는 매체" : "Trending Right Now"}
                  </h2>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {isKo
                      ? "최근 집행·관심도 기준으로 관리자가 선별한 매체"
                      : "Hand-picked by our team based on recent bookings and demand"}
                  </p>
                </div>
                <Link
                  href="/media"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-gold hover:text-gold-dark"
                >
                  {isKo ? "전체 매체" : "View all"}
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </ScrollAnimate>
            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {popularItems.slice(0, 6).map((media, i) => (
                <ScrollAnimate key={media.id} delay={i * 60}>
                  <Link href={`/media/${media.id}`} className="block touch-manipulation">
                    <Card className="group overflow-hidden border-0 shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
                      <MediaCatalogThumbnail
                        media={media}
                        placeholderLabel={t("media.imagePreparing")}
                        className="relative flex h-44 items-center justify-center"
                        imgClassName="transition-transform duration-300 group-hover:scale-105"
                        bottomGradientClassName={null}
                        placeholderSize="xs"
                      />
                      <CardHeader className="space-y-1 p-3 pb-1.5">
                        <Badge variant="secondary" className="w-fit bg-rose-50 text-rose-700 text-[10px] font-semibold">
                          {isKo ? "인기" : "Popular"}
                        </Badge>
                        <CardTitle className="truncate text-sm font-bold leading-snug text-navy">
                          {isKo ? media.name : (media.nameEn || media.name)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="px-3 pb-3">
                        <div className="flex items-center gap-1 text-xs leading-snug text-muted-foreground truncate">
                          <MapPin className="h-3 w-3 shrink-0" />
                          {isKo ? media.location : (media.locationEn || media.location)}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </ScrollAnimate>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Why THINKAD */}
      <section className="section-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "차별점" : "Why Us"}
              </p>
              <h2 className="section-title mt-3 text-3xl font-bold text-navy sm:text-4xl lg:text-5xl">
                {isKo ? "왜 싱커드인가?" : "Why THINKAD?"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {isKo
                  ? "검증되지 않은 매체에 광고비를 낭비하지 마세요"
                  : "Don't waste your ad budget on unverified media"}
              </p>
            </div>
          </ScrollAnimate>
          <div className="mt-10 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 lg:gap-8">
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
              <Card
                className="group relative overflow-hidden border-0 bg-gradient-to-b from-white to-slate-50/50 shadow-[0_4px_20px_rgba(0,0,0,0.08)] transition-all duration-300 hover:shadow-[0_12px_40px_rgba(0,0,0,0.12)] hover:-translate-y-1 rounded-2xl"
              >
                <div className="absolute top-0 left-0 h-[3px] w-full bg-gradient-to-r from-gold to-gold-light" />
                <CardHeader className="pb-4">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 ring-1 ring-gold/20 transition-all duration-300 group-hover:scale-110 group-hover:bg-gold/20">
                    <item.icon className="h-7 w-7 text-gold" />
                  </div>
                  <CardTitle className="text-xl font-bold text-navy">
                    {item.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {item.desc}
                  </CardDescription>
                  <div className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-gold/10 px-3 py-1 text-xs font-bold text-gold-dark">
                    <CheckCircle className="h-3.5 w-3.5" />
                    {item.highlight}
                  </div>
                </CardContent>
              </Card>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials (캐러셀 — data/testimonials.ts 에서 관리) */}
      <section className="section-white py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "고객 후기" : "Testimonials"}
              </p>
              <h2 className="section-title mt-3 text-3xl font-bold text-navy sm:text-4xl lg:text-5xl">
                {isKo ? "광고주가 직접 전하는 이야기" : "What Our Clients Say"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {isKo
                  ? "싱커드와 함께 성장한 파트너사의 실제 이야기"
                  : "Real stories from partners who grew with THINKAD"}
              </p>
            </div>
          </ScrollAnimate>
          <div className="mt-10">
            <TestimonialsCarousel items={testimonials} isKo={isKo} />
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="hero-bg relative overflow-hidden py-16">
        <div className="absolute inset-0 hero-pattern opacity-30" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(232,213,181,0.07)_0%,_transparent_70%)]" />
        <ScrollAnimate className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="section-title text-3xl font-bold text-white sm:text-4xl lg:text-5xl">
            {t("ctaBanner.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-300/90">
            {t("ctaBanner.description")}
          </p>
          <Link href="/contact" className="mx-auto block w-full max-w-xs sm:max-w-none touch-manipulation">
            <Button
              size="lg"
              className="btn-gold mt-10 h-12 w-full min-h-11 rounded-full px-10 text-base font-bold shadow-lg shadow-gold/20 sm:h-14 sm:w-auto"
            >
              {t("ctaBanner.cta")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </ScrollAnimate>
      </section>
    </>
  );
}
