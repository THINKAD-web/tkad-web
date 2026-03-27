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
      {/* Hero */}
      <section className="relative flex min-h-[600px] items-center justify-center bg-navy-dark">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage:
              "url('https://images.unsplash.com/photo-1567967455389-e432b1ca1cb9?w=1920&q=80')",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-navy-dark/80 to-navy/90" />
        <div className="relative z-10 mx-auto max-w-4xl px-4 text-center">
          <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            {t("hero.title")}
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-slate-300">
            {t("hero.subtitle")}
          </p>
          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href="/media">
              <Button
                size="lg"
                className="bg-gold text-navy hover:bg-gold-dark text-base font-semibold"
              >
                {t("hero.cta")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button
                size="lg"
                variant="outline"
                className="border-white/30 text-white hover:bg-white/10 text-base"
              >
                {t("hero.ctaSecondary")}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="border-b bg-white py-16">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-8 px-4 sm:px-6 md:grid-cols-4 lg:px-8">
          {[
            { label: t("stats.media"), value: t("stats.mediaValue") },
            { label: t("stats.experience"), value: t("stats.experienceValue") },
            { label: t("stats.coverage"), value: t("stats.coverageValue") },
            { label: t("stats.network"), value: t("stats.networkValue") },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-3xl font-bold text-gold">{stat.value}</div>
              <div className="mt-1 text-sm text-muted-foreground">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Services */}
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy">
              {t("services.title")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("services.subtitle")}
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              {
                icon: MapPin,
                title: t("services.domestic.title"),
                desc: t("services.domestic.description"),
              },
              {
                icon: Globe,
                title: t("services.crossBorder.title"),
                desc: t("services.crossBorder.description"),
              },
              {
                icon: BarChart3,
                title: t("services.dataConsulting.title"),
                desc: t("services.dataConsulting.description"),
              },
            ].map((service) => (
              <Card
                key={service.title}
                className="border-0 bg-white shadow-md transition-shadow hover:shadow-lg"
              >
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-navy/5">
                    <service.icon className="h-6 w-6 text-gold" />
                  </div>
                  <CardTitle className="text-lg">{service.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {service.desc}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Media */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-navy">
                {t("featuredMedia.title")}
              </h2>
              <p className="mt-2 text-muted-foreground">
                {t("featuredMedia.subtitle")}
              </p>
            </div>
            <Link
              href="/media"
              className="hidden text-sm font-medium text-gold hover:text-gold-dark md:inline-flex md:items-center md:gap-1"
            >
              {t("common.viewAll")} <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {featuredMedia.map((media) => (
              <Card
                key={media.id}
                className="overflow-hidden transition-shadow hover:shadow-lg"
              >
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10">
                  <Monitor className="h-12 w-12 text-navy/20" />
                </div>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="secondary"
                      className="bg-navy/5 text-navy text-xs"
                    >
                      {isKo
                        ? typeLabels[media.type].ko
                        : typeLabels[media.type].en}
                    </Badge>
                  </div>
                  <CardTitle className="text-base">
                    {isKo ? media.name : media.nameEn}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    {isKo ? media.location : media.locationEn}
                  </div>
                  <div className="mt-2 text-lg font-bold text-navy">
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
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-navy">
              {t("caseStudies.title")}
            </h2>
            <p className="mt-2 text-muted-foreground">
              {t("caseStudies.subtitle")}
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {(["case1", "case2", "case3"] as const).map((key) => (
              <Card
                key={key}
                className="overflow-hidden transition-shadow hover:shadow-lg"
              >
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gold/10 to-navy/10">
                  <TrendingUp className="h-12 w-12 text-gold/40" />
                </div>
                <CardHeader>
                  <Badge className="w-fit bg-gold/10 text-gold-dark text-xs">
                    {t(`caseStudies.${key}.category`)}
                  </Badge>
                  <CardTitle className="text-base">
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
          <div className="mt-8 text-center">
            <Link href="/cases">
              <Button variant="outline" className="border-navy text-navy">
                {t("common.viewAll")} <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className="bg-navy py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white">
            {t("ctaBanner.title")}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-300">
            {t("ctaBanner.description")}
          </p>
          <Link href="/contact">
            <Button
              size="lg"
              className="mt-8 bg-gold text-navy hover:bg-gold-dark text-base font-semibold"
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
