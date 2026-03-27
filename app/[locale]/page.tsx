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
import {
  ArrowRight,
  BarChart3,
  Globe,
  MapPin,
  Monitor,
  TrendingUp,
  ChevronDown,
} from "lucide-react";

type Props = {
  params: Promise<{ locale: string }>;
};

const featuredMedia = [
  {
    id: 1,
    nameKey: "gangnam",
    name: "강남역 빌보드",
    nameEn: "Gangnam Station Billboard",
    location: "서울 강남구",
    locationEn: "Gangnam-gu, Seoul",
    type: "billboard",
    price: 2500,
  },
  {
    id: 2,
    nameKey: "coex",
    name: "코엑스 디지털",
    nameEn: "COEX Digital",
    location: "서울 삼성동",
    locationEn: "Samsung-dong, Seoul",
    type: "digital",
    price: 3800,
  },
  {
    id: 3,
    nameKey: "hongdae",
    name: "홍대 지하철",
    nameEn: "Hongdae Subway",
    location: "서울 마포구",
    locationEn: "Mapo-gu, Seoul",
    type: "subway",
    price: 1200,
  },
  {
    id: 4,
    nameKey: "myeongdong",
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
      {/* Hero — full viewport, dark gradient background */}
      <section className="hero-bg relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(201,168,76,0.08)_0%,_transparent_60%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(201,168,76,0.05)_0%,_transparent_50%)]" />

        <div className="relative z-10 mx-auto max-w-5xl px-4 text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white/5 px-5 py-2 text-sm text-gold backdrop-blur-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-gold animate-pulse" />
            {isKo ? "대한민국 No.1 OOH 광고 에이전시" : "Korea's #1 OOH Ad Agency"}
          </div>

          <h1 className="text-5xl leading-tight font-extrabold tracking-tight text-white sm:text-6xl lg:text-7xl">
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

          <p className="mx-auto mt-8 max-w-2xl text-lg leading-relaxed text-slate-300/90 sm:text-xl">
            {t("hero.subtitle")}
          </p>

          <div className="mt-12 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/media">
              <Button
                size="lg"
                className="bg-gold text-navy hover:bg-gold-dark h-14 rounded-full px-10 text-base font-bold shadow-lg shadow-gold/20 transition-all hover:shadow-xl hover:shadow-gold/30"
              >
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="h-14 rounded-full border-white/20 px-10 text-base text-white hover:bg-white/10 hover:border-white/40"
              >
                {t("hero.ctaSecondary")}
              </Button>
            </Link>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="h-6 w-6 text-white/40" />
        </div>
      </section>

      {/* Stats — animated count-up */}
      <section className="relative border-b bg-white py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {[
              {
                animClass: "stat-count-up stat-count-500",
                label: isKo ? "등록 매체" : "Registered Media",
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
                  className={`text-4xl font-extrabold text-gold sm:text-5xl ${stat.animClass}`}
                />
                <div className="mt-3 text-sm font-medium tracking-wide text-navy/60 uppercase">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services — 3 cards with hover effects */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
            ].map((service) => (
              <Card
                key={service.title}
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
            ))}
          </div>
        </div>
      </section>

      {/* Featured Media */}
      <section className="py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "인기 매체" : "Featured"}
              </p>
              <h2 className="mt-3 text-3xl font-bold text-navy">
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
          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredMedia.map((media) => (
              <Card
                key={media.id}
                className="group overflow-hidden border-0 shadow-md transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="relative flex h-48 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10 overflow-hidden">
                  <Monitor className="h-12 w-12 text-navy/15 transition-transform group-hover:scale-110" />
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
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="bg-slate-50 py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {(["case1", "case2", "case3"] as const).map((key) => (
              <Card
                key={key}
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

      {/* CTA Banner */}
      <section className="hero-bg relative overflow-hidden py-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_rgba(201,168,76,0.06)_0%,_transparent_70%)]" />
        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
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
        </div>
      </section>
    </>
  );
}
