import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
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
import SolutionCtaButton from "@/components/solution-cta-button";
import ScrollAnimate from "@/components/scroll-animate";
import HomeRecentlyViewed from "@/components/home-recently-viewed";
import NewsletterForm from "@/components/newsletter-form";
import {
  ArrowRight,
  BarChart3,
  BadgeCheck,
  CheckCircle,
  Globe,
  MapPin,
  Monitor,
  TrendingUp,
  ChevronDown,
  ShieldCheck,
  Eye,
  FileCheck,
  Star,
  Quote,
  Search,
  Camera,
  Database,
  ClipboardCheck,
  Users,
  Trophy,
  Sparkles,
  PhoneCall,
  Flame,
  Building2,
  BookOpen,
  Newspaper,
  MessageCircle,
} from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

const featuredMedia = [
  {
    id: 1,
    name: "강남역 빌보드",
    nameEn: "Gangnam Station Billboard",
    location: "서울 강남구",
    locationEn: "Gangnam-gu, Seoul",
    type: "billboard",
    price: 2500,
  },
  {
    id: 2,
    name: "코엑스 디지털",
    nameEn: "COEX Digital",
    location: "서울 삼성동",
    locationEn: "Samsung-dong, Seoul",
    type: "digital",
    price: 3800,
  },
  {
    id: 3,
    name: "홍대 지하철",
    nameEn: "Hongdae Subway",
    location: "서울 마포구",
    locationEn: "Mapo-gu, Seoul",
    type: "subway",
    price: 1200,
  },
  {
    id: 4,
    name: "명동 전광판",
    nameEn: "Myeongdong LED",
    location: "서울 중구",
    locationEn: "Jung-gu, Seoul",
    type: "digital",
    price: 4200,
  },
];

const typeLabels: Record<string, { ko: string; en: string }> = {
  billboard: { ko: "빌보드", en: "Billboard" },
  digital: { ko: "디지털", en: "Digital" },
  subway: { ko: "지하철", en: "Subway" },
  bus: { ko: "버스", en: "Bus" },
};

const partnerLogos = [
  "Samsung", "LG", "Hyundai", "SK", "Lotte",
  "CJ", "Kakao", "Naver", "Amorepacific", "Shinsegae",
  "Hana", "KB", "KT", "POSCO", "Hanwha",
  "GS", "Doosan", "Kumho", "Mirae Asset", "Celltrion",
];

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <HomeContent locale={locale} />;
}

function HomeContent({ locale }: { locale: string }) {
  const t = useTranslations();
  const isKo = locale === "ko";

  return (
    <>
      {/* Hero */}
      <section className="hero-bg relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,168,76,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(201,168,76,0.05)_0%,_transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white/5 px-5 py-2 text-sm text-gold backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            {isKo ? "대한민국 No.1 OOH 광고 에이전시" : "Korea's #1 OOH Ad Agency"}
          </div>

          <h1 className="text-3xl leading-tight font-extrabold tracking-tight text-white sm:text-5xl lg:text-7xl">
            {isKo ? (
              <>
                당신의 브랜드를
                <br />
                <span className="text-gold">도시의 랜드마크</span>로
              </>
            ) : (
              <>
                Turn Your Brand Into
                <br />
                <span className="text-gold">A City Landmark</span>
              </>
            )}
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-300/90 sm:text-lg lg:text-xl">
            {t("hero.subtitle")}
          </p>

          <p className="mx-auto mt-3 flex items-center justify-center gap-2 text-base text-gold/80 font-medium">
            <BadgeCheck className="h-5 w-5 text-gold" />
            {isKo
              ? "싱커드가 직접 검증하고 관리하는 매체만"
              : "Only media personally verified and managed by THINKAD"}
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/contact">
              <Button
                size="lg"
                className="bg-gold text-navy hover:bg-gold-dark h-16 rounded-full px-12 text-lg font-extrabold shadow-lg shadow-gold/25 transition-all hover:shadow-xl hover:shadow-gold/40 hover:scale-105"
              >
                <PhoneCall className="mr-2 h-5 w-5" />
                {isKo ? "무료 상담 신청" : "Free Consultation"}
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/media">
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-white/20 px-10 text-base text-white hover:bg-white/10 hover:border-white/40"
              >
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
          <p className="mt-4 text-sm text-slate-400">
            {isKo
              ? "30초 만에 신청 완료 · 24시간 내 전문 컨설턴트 연락"
              : "Apply in 30 seconds · Expert consultant contacts within 24h"}
          </p>
          <div className="mt-3">
            <SolutionCtaButton
              label={isKo ? "맞춤형 OOH 캠페인 제안 받기" : "Get Custom OOH Campaign Proposal"}
              size="lg"
              variant="outline"
              className="h-12 border-gold/30 text-gold hover:bg-gold/10 hover:border-gold"
            />
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-white/40" />
        </div>
      </section>

      {/* Verification Process */}
      <section className="relative border-b bg-white py-24 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,168,76,0.04)_0%,_transparent_70%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "검증 프로세스" : "Verification Process"}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">
                {isKo ? "싱커드만의 4단계 매체 검증" : "THINKAD's 4-Step Media Verification"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {isKo
                  ? "모든 매체는 엄격한 검증 프로세스를 거쳐야만 등록됩니다"
                  : "Every media must pass our rigorous verification process before registration"}
              </p>
            </div>
          </ScrollAnimate>

          <div className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                icon: Search,
                step: "01",
                title: isKo ? "현장 방문" : "Site Visit",
                desc: isKo
                  ? "담당자가 직접 매체 현장을 방문하여 설치 환경과 주변 유동인구를 확인합니다."
                  : "Our team personally visits the media site to check installation conditions and surrounding foot traffic.",
              },
              {
                icon: Camera,
                step: "02",
                title: isKo ? "촬영 및 실측" : "Photo & Measurement",
                desc: isKo
                  ? "매체 크기, 시인성, 조도를 정밀 측정하고 다각도 촬영으로 기록합니다."
                  : "We precisely measure media size, visibility, and illumination with multi-angle photography.",
              },
              {
                icon: Database,
                step: "03",
                title: isKo ? "데이터 검증" : "Data Verification",
                desc: isKo
                  ? "유동인구 데이터, 차량 통행량, 노출 빈도를 분석하여 매체 효과를 검증합니다."
                  : "We analyze foot traffic, vehicle flow, and exposure frequency to verify media effectiveness.",
              },
              {
                icon: ClipboardCheck,
                step: "04",
                title: isKo ? "매체 등록" : "Media Registration",
                desc: isKo
                  ? "검증을 통과한 매체만 싱커드 플랫폼에 등록되어 광고주에게 제안됩니다."
                  : "Only verified media are registered on the THINKAD platform and proposed to advertisers.",
              },
            ].map((item, index) => (
              <ScrollAnimate key={item.step} delay={index * 120}>
              <div className="verification-step group relative">
                {index < 3 && (
                  <div className="absolute top-10 right-0 hidden h-0.5 w-[calc(100%-3rem)] translate-x-[calc(50%+1.5rem)] bg-gradient-to-r from-gold/40 to-gold/10 lg:block" />
                )}
                <div className="relative flex flex-col items-center text-center">
                  <div className="relative mb-5 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-gold/15 to-gold/5 ring-1 ring-gold/20 transition-all group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-gold/10">
                    <item.icon className="h-8 w-8 text-gold" />
                    <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-white shadow-md">
                      {item.step}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-navy">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
              </div>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="relative border-b bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate variant="count-up">
            <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
              {[
                {
                  animClass: "stat-count-up stat-count-500",
                  label: isKo ? "검증된 매체" : "Verified Media",
                },
                {
                  animClass: "stat-count-up stat-count-100b",
                  label: isKo ? "누적 집행액" : "Total Ad Spend",
                },
                {
                  animClass: "stat-count-up stat-count-100p",
                  label: isKo ? "대기업 파트너" : "Enterprise Partners",
                },
                {
                  animClass: "stat-count-up stat-count-15",
                  label: isKo ? "경력" : "Years Experience",
                },
                {
                  animClass: "stat-count-up stat-count-100",
                  label: isKo ? "전국 커버리지" : "National Coverage",
                },
                {
                  animClass: "stat-count-up stat-count-50",
                  label: isKo ? "글로벌 네트워크" : "Global Network",
                },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div
                    className={`text-3xl font-extrabold text-gold sm:text-4xl ${stat.animClass}`}
                  />
                  <div className="mt-3 text-sm font-medium tracking-wide text-navy/60 uppercase">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </ScrollAnimate>
        </div>
      </section>

      {/* TOP 3 Recommended Media */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 text-sm font-bold text-gold-dark">
                <Trophy className="h-4 w-4" />
                TOP 3
              </div>
              <h2 className="mt-1 text-3xl font-bold text-navy sm:text-4xl">
                {isKo ? "싱커드 추천 매체 TOP 3" : "THINKAD Recommended Media TOP 3"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {isKo
                  ? "검증 데이터 기반, 가장 효과적인 매체를 엄선했습니다"
                  : "Curated selection of the most effective media based on verified data"}
              </p>
            </div>
          </ScrollAnimate>

          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                rank: 1 as const,
                name: isKo ? "강남역 미디어폴" : "Gangnam Station Media Pole",
                location: isKo ? "서울 강남구 강남대로" : "Gangnam-daero, Gangnam-gu, Seoul",
                dailyExposure: "320,000",
                footTraffic: "A+",
                roi: "4.2x",
                type: isKo ? "디지털" : "Digital",
              },
              {
                rank: 2,
                name: isKo ? "코엑스 아티움 대형 LED" : "COEX Artium Large LED",
                location: isKo ? "서울 삼성동 코엑스몰" : "COEX Mall, Samsung-dong, Seoul",
                dailyExposure: "280,000",
                footTraffic: "A+",
                roi: "3.8x",
                type: isKo ? "디지털" : "Digital",
              },
              {
                rank: 3,
                name: isKo ? "홍대입구역 스크린도어" : "Hongdae Station Screen Door",
                location: isKo ? "서울 마포구 홍대입구역" : "Hongdae Station, Mapo-gu, Seoul",
                dailyExposure: "210,000",
                footTraffic: "A",
                roi: "3.5x",
                type: isKo ? "지하철" : "Subway",
              },
            ].map((media, i) => (
              <ScrollAnimate key={media.rank} delay={i * 150}>
              <Card
                className="group relative overflow-hidden border-0 bg-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-gold to-gold-light" />
                <div className="relative flex h-52 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10 overflow-hidden">
                  <Monitor className="h-16 w-16 text-navy/10 transition-transform group-hover:scale-110" />
                  <div className="absolute top-4 left-4 flex h-10 w-10 items-center justify-center rounded-full bg-gold font-bold text-navy text-lg shadow-md">
                    {media.rank}
                  </div>
                  <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-[11px] font-bold text-white shadow-sm">
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </div>
                </div>
                <CardHeader className="pb-3">
                  <Badge variant="secondary" className="w-fit bg-navy/5 text-navy text-xs font-medium">
                    {media.type}
                  </Badge>
                  <CardTitle className="text-lg font-bold text-navy">
                    {media.name}
                  </CardTitle>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {media.location}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3">
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">
                        {isKo ? "일일 노출" : "Daily Views"}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-navy">{media.dailyExposure}</div>
                    </div>
                    <div className="text-center border-x">
                      <div className="text-xs text-muted-foreground">
                        {isKo ? "유동인구" : "Traffic"}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-gold-dark">{media.footTraffic}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-xs text-muted-foreground">ROI</div>
                      <div className="mt-0.5 text-sm font-bold text-emerald-600">{media.roi}</div>
                    </div>
                  </div>

                  <div className="mt-5 flex gap-2">
                    <Link href="/media" className="flex-1">
                      <Button variant="outline" size="sm" className="w-full border-navy/20 text-navy text-xs font-semibold hover:bg-navy hover:text-white">
                        {isKo ? "상세 보기" : "View Details"}
                      </Button>
                    </Link>
                    <Link href="/contact" className="flex-1">
                      <Button size="sm" className="w-full bg-gold text-navy text-xs font-bold hover:bg-gold-dark">
                        {isKo ? "문의하기" : "Inquire"}
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Why THINKAD */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "차별점" : "Why Us"}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">
                {isKo ? "왜 싱커드인가?" : "Why THINKAD?"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {isKo
                  ? "검증되지 않은 매체에 광고비를 낭비하지 마세요"
                  : "Don't waste your ad budget on unverified media"}
              </p>
            </div>
          </ScrollAnimate>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
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
              <ScrollAnimate key={item.title} delay={i * 150}>
              <Card
                className="group relative overflow-hidden border-0 bg-gradient-to-b from-white to-slate-50 shadow-lg transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="absolute top-0 left-0 h-1 w-full bg-gradient-to-r from-gold to-gold-light" />
                <CardHeader className="pb-4">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10 ring-1 ring-gold/20 transition-all group-hover:scale-110 group-hover:bg-gold/20">
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

      {/* Services */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "서비스" : "Services"}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">
                {t("services.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {t("services.subtitle")}
              </p>
            </div>
          </ScrollAnimate>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: MapPin,
                title: t("services.domestic.title"),
                desc: t("services.domestic.description"),
                accent: "from-gold/10 to-gold/5",
              },
              {
                icon: Globe,
                title: t("services.crossBorder.title"),
                desc: t("services.crossBorder.description"),
                accent: "from-navy/10 to-navy/5",
              },
              {
                icon: BarChart3,
                title: t("services.dataConsulting.title"),
                desc: t("services.dataConsulting.description"),
                accent: "from-gold/10 to-navy/5",
              },
            ].map((service, i) => (
              <ScrollAnimate key={service.title} delay={i * 150}>
              <Card
                className="service-card group cursor-pointer border-0 bg-white shadow-md"
              >
                <CardHeader className="pb-4">
                  <div className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${service.accent} ring-1 ring-navy/5 transition-all group-hover:scale-110 group-hover:shadow-lg`}>
                    <service.icon className="h-7 w-7 text-gold" />
                  </div>
                  <CardTitle className="text-xl font-bold text-navy">
                    {service.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {service.desc}
                  </CardDescription>
                  <div className="mt-6 flex items-center gap-1 text-sm font-semibold text-gold opacity-0 transition-opacity group-hover:opacity-100">
                    {isKo ? "자세히 보기" : "Learn more"}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </div>
                </CardContent>
              </Card>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Media with Verified Badge */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="flex items-end justify-between">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Verified Media
                </div>
                <h2 className="mt-1 text-3xl font-bold text-navy">
                  {t("featuredMedia.title")}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {t("featuredMedia.subtitle")}
                </p>
              </div>
              <Link
                href="/media"
                className="hidden items-center gap-1 text-sm font-semibold text-gold transition-colors hover:text-gold-dark md:inline-flex"
              >
                {t("common.viewAll")} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </ScrollAnimate>
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredMedia.map((media, i) => (
              <ScrollAnimate key={media.id} delay={i * 100}>
              <Card
                className="group overflow-hidden border-0 shadow-md transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10 overflow-hidden">
                  <Monitor className="h-12 w-12 text-navy/15 transition-transform group-hover:scale-110" />
                  {i < 3 && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-sm">
                      <Flame className="h-3 w-3" />
                      {isKo ? "인기" : "Popular"}
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                    <BadgeCheck className="h-3 w-3" />
                    Verified
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="bg-navy/5 text-navy text-xs font-medium"
                    >
                      {isKo
                        ? typeLabels[media.type].ko
                        : typeLabels[media.type].en}
                    </Badge>
                  </div>
                  <CardTitle className="text-base font-bold">
                    {isKo ? media.name : media.nameEn}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {isKo ? media.location : media.locationEn}
                  </div>
                  <div className="mt-3 text-lg font-bold text-navy">
                    ₩{media.price.toLocaleString()}
                    <span className="text-xs font-normal text-muted-foreground">
                      {t("media.perMonth")}
                    </span>
                  </div>
                </CardContent>
              </Card>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Recently Viewed */}
      <HomeRecentlyViewed locale={locale} />

      {/* Partner Logos Marquee */}
      <section className="border-y bg-slate-50 py-16 overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate variant="fade-in">
            <div className="mb-10 flex flex-col items-center gap-3 text-center">
              <div className="inline-flex items-center gap-2 rounded-full bg-gold/10 px-4 py-1.5 text-sm font-bold text-gold-dark">
                <Building2 className="h-4 w-4" />
                {isKo ? "100+ 대기업 파트너" : "100+ Enterprise Partners"}
              </div>
              <p className="text-sm font-semibold tracking-wider text-muted-foreground uppercase">
                {isKo ? "신뢰하는 파트너사" : "Trusted Partners"}
              </p>
            </div>
          </ScrollAnimate>
        </div>
        <div className="marquee-container">
          <div className="marquee-track">
            {[...partnerLogos, ...partnerLogos].map((name, i) => (
              <div
                key={`${name}-${i}`}
                className="mx-8 flex h-12 w-28 shrink-0 items-center justify-center rounded-lg bg-white px-4 shadow-sm ring-1 ring-slate-100"
              >
                <span className="text-sm font-bold text-navy/40">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "고객 후기" : "Testimonials"}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">
                {isKo ? "광고주가 직접 전하는 이야기" : "What Our Clients Say"}
              </h2>
            </div>
          </ScrollAnimate>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {[
              {
                name: isKo ? "김서연 마케팅 이사" : "Seoyeon Kim, Marketing Director",
                company: isKo ? "글로벌 뷰티 브랜드 A사" : "Global Beauty Brand A",
                text: isKo
                  ? "싱커드 덕분에 강남역 일대 10개 빌보드를 동시에 진행할 수 있었습니다. 무엇보다 매체 하나하나 직접 검증해준 데이터 덕에 안심하고 결정할 수 있었어요. 캠페인 후 브랜드 인지도 300% 상승이라는 결과가 모든 걸 말해줍니다."
                  : "Thanks to THINKAD, we ran 10 billboards simultaneously around Gangnam Station. The verified data for each media gave us confidence. A 300% increase in brand awareness speaks for itself.",
                rating: 5,
              },
              {
                name: isKo ? "박준혁 대표" : "Junhyuk Park, CEO",
                company: isKo ? "테크 스타트업 B사" : "Tech Startup B",
                text: isKo
                  ? "스타트업이라 광고 예산이 빠듯했는데, 싱커드가 데이터 기반으로 가장 효율적인 매체 조합을 제안해줬습니다. 코엑스 디지털 캠페인으로 2주 만에 150만 노출을 달성했어요. 계약부터 사후관리까지 원스톱이라 정말 편했습니다."
                  : "As a startup with a tight budget, THINKAD proposed the most efficient media mix based on data. We achieved 1.5M impressions in 2 weeks with COEX digital. The one-stop service from contract to post-care was incredibly convenient.",
                rating: 5,
              },
              {
                name: isKo ? "이하은 팀장" : "Haeun Lee, Team Lead",
                company: isKo ? "엔터테인먼트 C사" : "Entertainment Company C",
                text: isKo
                  ? "지하철 랩핑 광고를 처음 해봤는데, 싱커드가 역사별 유동인구 데이터와 실제 시인성까지 꼼꼼하게 분석해줘서 7개 역사를 최적으로 선정할 수 있었습니다. 앨범 초동 판매 200% 증가! 다음 캠페인도 무조건 싱커드입니다."
                  : "It was our first subway wrapping ad. THINKAD meticulously analyzed foot traffic and visibility for each station, helping us optimally select 7 stations. 200% increase in first-week album sales! Definitely using THINKAD for our next campaign.",
                rating: 5,
              },
            ].map((testimonial, i) => (
              <ScrollAnimate key={testimonial.name} delay={i * 150}>
              <Card
                className="relative border-0 bg-white shadow-md transition-all hover:shadow-lg"
              >
                <CardHeader className="pb-3">
                  <Quote className="h-8 w-8 text-gold/20" />
                  <div className="flex gap-0.5">
                    {Array.from({ length: testimonial.rating }).map((_, i) => (
                      <Star
                        key={i}
                        className="h-4 w-4 fill-gold text-gold"
                      />
                    ))}
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-navy/80">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>
                  <div className="mt-6 border-t pt-4">
                    <p className="text-sm font-bold text-navy">
                      {testimonial.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {testimonial.company}
                    </p>
                  </div>
                </CardContent>
              </Card>
              </ScrollAnimate>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "성공 사례" : "Case Studies"}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">
                {t("caseStudies.title")}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {t("caseStudies.subtitle")}
              </p>
            </div>
          </ScrollAnimate>
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {(["case1", "case2", "case3"] as const).map((key, i) => (
              <ScrollAnimate key={key} delay={i * 150}>
              <Card
                className="group overflow-hidden border-0 shadow-md transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gold/10 to-navy/10 overflow-hidden">
                  <TrendingUp className="h-12 w-12 text-gold/30 transition-transform group-hover:scale-110" />
                </div>
                <CardHeader>
                  <Badge className="w-fit bg-gold/10 text-gold-dark text-xs font-medium">
                    {t(`caseStudies.${key}.category`)}
                  </Badge>
                  <CardTitle className="text-base font-bold">
                    {t(`caseStudies.${key}.title`)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {t(`caseStudies.${key}.description`)}
                  </CardDescription>
                </CardContent>
              </Card>
              </ScrollAnimate>
            ))}
          </div>
          <div className="mt-12 text-center">
            <Link href="/cases">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-navy text-navy font-semibold hover:bg-navy hover:text-white"
              >
                {t("common.viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Blog / Insight Links */}
      <section className="bg-white py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="text-center">
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "인사이트" : "Insights"}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-navy sm:text-4xl">
                {isKo ? "OOH 광고 인사이트" : "OOH Advertising Insights"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">
                {isKo
                  ? "최신 OOH 광고 트렌드와 전문가 인사이트를 확인하세요"
                  : "Stay up to date with the latest OOH advertising trends and expert insights"}
              </p>
            </div>
          </ScrollAnimate>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: BookOpen,
                title: isKo ? "2025 OOH 광고 트렌드 리포트" : "2025 OOH Ad Trends Report",
                desc: isKo
                  ? "올해 주목해야 할 OOH 광고 트렌드와 디지털 사이니지의 미래를 분석합니다."
                  : "Analysis of this year's OOH advertising trends and the future of digital signage.",
                tag: isKo ? "트렌드" : "Trends",
              },
              {
                icon: BarChart3,
                title: isKo ? "OOH ROI 극대화 가이드" : "OOH ROI Maximization Guide",
                desc: isKo
                  ? "데이터 기반으로 OOH 광고 ROI를 극대화하는 5가지 전략을 소개합니다."
                  : "5 data-driven strategies to maximize your OOH advertising ROI.",
                tag: isKo ? "가이드" : "Guide",
              },
              {
                icon: Newspaper,
                title: isKo ? "성공적인 매체 선정 체크리스트" : "Media Selection Checklist",
                desc: isKo
                  ? "광고 효과를 극대화하는 매체 선정 기준과 실무 체크리스트를 공유합니다."
                  : "Practical checklist and criteria for selecting media that maximize advertising effectiveness.",
                tag: isKo ? "실무 팁" : "Pro Tips",
              },
            ].map((item, i) => (
              <ScrollAnimate key={item.title} delay={i * 150}>
                <Card className="group cursor-pointer border-0 bg-gradient-to-b from-white to-slate-50 shadow-md transition-all hover:shadow-xl hover:-translate-y-1">
                  <CardHeader className="pb-3">
                    <Badge className="w-fit bg-navy/5 text-navy text-xs font-medium">
                      {item.tag}
                    </Badge>
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold/10">
                        <item.icon className="h-5 w-5 text-gold" />
                      </div>
                      <CardTitle className="text-base font-bold text-navy">
                        {item.title}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-sm leading-relaxed">
                      {item.desc}
                    </CardDescription>
                    <div className="mt-4 flex items-center gap-1 text-sm font-semibold text-gold opacity-0 transition-opacity group-hover:opacity-100">
                      {isKo ? "읽어보기" : "Read more"}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </CardContent>
                </Card>
              </ScrollAnimate>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href="/resources">
              <Button
                variant="outline"
                size="lg"
                className="rounded-full border-navy/20 font-semibold text-navy hover:bg-navy hover:text-white"
              >
                {isKo ? "모든 인사이트 보기" : "View All Insights"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Newsletter Subscription */}
      <section className="border-y bg-gradient-to-r from-navy via-navy-light to-navy py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <ScrollAnimate>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-1.5 text-sm font-semibold text-gold">
              <Newspaper className="h-4 w-4" />
              Newsletter
            </div>
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              {isKo
                ? "OOH 광고 뉴스레터 구독"
                : "Subscribe to OOH Newsletter"}
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-sm text-slate-300/80">
              {isKo
                ? "매월 최신 OOH 광고 트렌드, 성공 사례, 업계 소식을 이메일로 받아보세요."
                : "Receive the latest OOH advertising trends, case studies, and industry news monthly."}
            </p>
            <NewsletterForm />
            <p className="mt-3 text-xs text-slate-400">
              {isKo
                ? "스팸 없이, 언제든 구독 해지 가능합니다."
                : "No spam. Unsubscribe anytime."}
            </p>
          </ScrollAnimate>
        </div>
      </section>

      {/* Kakao Channel Banner */}
      <section className="bg-[#FEE500] py-10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-4 px-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#3C1E1E] text-2xl shadow-md">
              <MessageCircle className="h-7 w-7 text-[#FEE500]" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-[#3C1E1E]">
                {isKo ? "카카오채널 친구 추가" : "Add Kakao Channel"}
              </h3>
              <p className="text-sm text-[#3C1E1E]/70">
                {isKo
                  ? "친구 추가하고 실시간 상담 & 특별 혜택 받으세요!"
                  : "Add us and get real-time support & exclusive benefits!"}
              </p>
            </div>
          </div>
          <a
            href="https://open.kakao.com/o/placeholder"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button
              size="lg"
              className="h-12 rounded-full bg-[#3C1E1E] px-8 font-bold text-[#FEE500] hover:bg-[#2A1515]"
            >
              {isKo ? "채널 추가하기" : "Add Channel"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </a>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="hero-bg relative overflow-hidden py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,168,76,0.06)_0%,_transparent_70%)]" />
        <ScrollAnimate className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {t("ctaBanner.title")}
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300/90">
            {t("ctaBanner.description")}
          </p>
          <Link href="/contact">
            <Button
              size="lg"
              className="mt-10 bg-gold text-navy hover:bg-gold-dark h-14 rounded-full px-10 text-base font-bold shadow-lg shadow-gold/20 transition-all hover:shadow-xl hover:shadow-gold/30"
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
