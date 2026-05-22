import dynamic from "next/dynamic";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, Globe, Heart, Users } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { AnimatedCard } from "@/components/animated-card";
import { Timeline } from "@/components/timeline";

const AboutHeroStats = dynamic(() =>
  import("@/components/about-hero-stats").then((m) => ({
    default: m.AboutHeroStats,
  })),
);

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations();

  return <AboutContent locale={locale} t={t} />;
}

function AboutContent({
  locale,
  t,
}: {
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  const isKo = locale === "ko";

  const values = [
    { icon: BarChart3, ...getValueTranslation(t, "value1") },
    { icon: Heart, ...getValueTranslation(t, "value2") },
    { icon: Globe, ...getValueTranslation(t, "value3") },
  ];

  const historyItems = [
    { label: "2016", title: t("about.history2016") },
    { label: "2017", title: t("about.history2017") },
    { label: "2019", title: t("about.history2019") },
    { label: "2022", title: t("about.history2022") },
    { label: "2025", title: t("about.history2025") },
  ];

  const teamMembers = [
    {
      nameKo: "김민지",
      nameEn: "Minji Kim",
      roleKo: "미디어 플래닝 리드",
      roleEn: "Media Planning Lead",
      bioKo:
        "국내 주요 상권 분석과 매체 믹스 전략 수립을 담당하는 OOH 플래닝 전문가.",
      bioEn:
        "OOH planning expert in charge of key district analysis and media mix strategy.",
      initials: "MK",
    },
    {
      nameKo: "박준호",
      nameEn: "Junho Park",
      roleKo: "데이터 & AI 리드",
      roleEn: "Data & AI Lead",
      bioKo:
        "유동인구 데이터, 노출도, 성과 분석을 기반으로 한 AI 추천 엔진을 개발합니다.",
      bioEn:
        "Builds AI recommendation engines based on traffic data, exposure, and performance analytics.",
      initials: "JP",
    },
    {
      nameKo: "이수연",
      nameEn: "Suyeon Lee",
      roleKo: "크리에이티브 디렉터",
      roleEn: "Creative Director",
      bioKo:
        "브랜드 스토리를 공간과 매체에 녹여내는 OOH 크리에이티브 디렉션을 총괄합니다.",
      bioEn:
        "Oversees OOH creative direction that blends brand stories into spaces and media.",
      initials: "SL",
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-b from-navy via-navy to-[#0c1024] py-28 sm:py-36">
        <div
          className="hero-pattern pointer-events-none absolute inset-0 opacity-[0.14]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold tracking-tight dark:text-white text-gray-900 sm:text-4xl lg:text-5xl">
            {t("about.title")}
          </h1>
          <p className="mt-3 text-base text-slate-300 sm:text-lg">
            {t("about.subtitle")}
          </p>
          <p className="mx-auto mt-8 max-w-3xl text-xl font-semibold leading-snug dark:text-white sm:text-2xl lg:text-3xl lg:leading-tight">
            {t("about.heroSlogan")}
          </p>
          <AboutHeroStats
            labels={{
              founded: t("about.statFoundedLabel"),
              campaigns: t("about.statCampaignsLabel"),
              media: t("about.statMediaLabel"),
            }}
            foundedYear="2016"
            campaignsEnd={250}
            mediaEnd={500}
          />
        </div>
      </section>

      <section className="bg-white py-28 sm:py-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <SectionHeading
            eyebrow={t("about.storyEyebrow")}
            title={t("about.storyTitle")}
            align="center"
            className="mb-20"
          />

          <div className="space-y-10 sm:space-y-12">
            <div className="rounded-2xl border border-navy/8 bg-gradient-to-br from-slate-50/90 to-white p-8 shadow-sm sm:p-10">
              <h3 className="mb-4 flex items-center gap-3 text-lg font-bold text-navy">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/12 text-sm font-bold text-gold">
                  01
                </span>
                {isKo ? "싱커드 소개" : "About THINKAD"}
              </h3>
              <p className="leading-relaxed text-muted-foreground">
                {isKo
                  ? "싱커드는 창의적인 미디어렙을 목표로 인정받는 종합 마케팅 솔루션 회사입니다. 다양한 광고 매체를 활용하여 효과적인 광고마케팅을 제안하고, 모든 직원들이 책임감을 갖고 광고주의 입장에서 생각하는 광고주가 가장 선호하는 미디어렙으로 자리매김 하겠습니다."
                  : "THINKAD is a comprehensive marketing solutions company recognized as a creative media rep. We propose effective advertising marketing utilizing various media, and all employees take responsibility to think from the advertiser's perspective."}
              </p>
            </div>

            <div className="rounded-2xl border border-navy/8 bg-gradient-to-br from-navy/[0.04] to-white p-8 shadow-sm sm:p-10">
              <h3 className="mb-4 flex items-center gap-3 text-lg font-bold text-navy">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/12 text-sm font-bold text-gold">
                  02
                </span>
                {isKo ? "우리의 철학" : "Our Philosophy"}
              </h3>
              <blockquote className="mb-4 border-l-4 border-gold/35 pl-4 font-medium italic text-gold-dark">
                {isKo
                  ? '"지금 눈에 보이는 부분만이 광고대행사의 실력을 말해주는 것은 아닙니다."'
                  : "“What you see now is not the only measure of an agency’s capabilities.”"}
              </blockquote>
              <p className="leading-relaxed text-muted-foreground">
                {isKo
                  ? "싱커드는 빈틈없는 전략과 정확한 타깃설정, 효과적인 커뮤니케이션으로 광고주의 시각으로 브랜드 전략을 구상합니다. 전문화된 각 조직의 기능과 아이디어를 효율적으로 통합하여 소비자를 실질적으로 움직일 수 있는 마케팅 커뮤니케이션을 지향하며, 이를 통해 광고주와 브랜드의 가치를 극대화하고 있습니다."
                  : "THINKAD designs brand strategies from the advertiser's perspective with seamless strategy, precise targeting, and effective communication. We integrate the functions and ideas of specialized organizations efficiently to create marketing communications that truly move consumers, maximizing the value of advertisers and brands."}
              </p>
            </div>

            <div className="rounded-2xl border border-gold/25 bg-gradient-to-br from-gold/[0.06] to-white p-8 shadow-sm sm:p-10">
              <h3 className="mb-4 flex items-center gap-3 text-lg font-bold text-navy">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gold/12 text-sm font-bold text-gold">
                  03
                </span>
                Full Media Solution
              </h3>
              <p className="mb-4 leading-relaxed text-muted-foreground">
                {isKo
                  ? "싱커드는 오픈, 공유, 확산이라는 새로운 법칙의 중심에 서 있는 소비자와의 소통을 위해 끊임없는 열정으로 전략적인 Full Media Solution을 제공합니다. 기업의 브랜드뿐 아니라, 공공기관 등 퍼블릭 분야에서 실험적인 광고회사로 이름을 알리고 있습니다."
                  : "THINKAD provides strategic Full Media Solutions with endless passion for communication with consumers at the center of the new rules of openness, sharing, and diffusion. We are known as an experimental advertising company not only for corporate brands but also in the public sector."}
              </p>
              <p className="leading-relaxed text-muted-foreground">
                {isKo
                  ? "세상을 우리 브랜드에 중독되게 하기 위해 온-오프라인 광고의 경계를 넘어선 캠페인을 진행합니다. 싱커드는 국내외 온·오프라인 광고를 기획 및 집행하는 캠페인 에이전시로서 일반 광고회사가 아닌 당신의 브랜드 파트너로서 당신의 시작, 당신의 위기, 당신의 성공을 언제나 함께 하겠습니다."
                  : "To make the world addicted to our brand, we conduct campaigns that transcend the boundaries of online and offline advertising. As a campaign agency that plans and executes domestic and international on/offline advertising, THINKAD will always be with you as your brand partner—through your start, your challenges, and your success."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-28 sm:py-32">
        <div className="ui-container">
          <div className="grid items-start gap-14 lg:grid-cols-2 lg:gap-20">
            <div className="lg:sticky lg:top-28">
              <SectionHeading
                eyebrow={t("about.historyEyebrow")}
                title={t("about.historyTitle")}
                subtitle={t("about.historyDescription")}
                align="left"
                className="max-w-xl"
              />
            </div>
            <Timeline items={historyItems} />
          </div>
        </div>
      </section>

      <section className="bg-white py-28 sm:py-32">
        <div className="ui-container">
          <SectionHeading
            eyebrow={t("about.valuesEyebrow")}
            title={t("about.valuesTitle")}
            subtitle={t("about.valuesLead")}
            className="mb-16"
          />
          <div className="grid gap-8 md:grid-cols-3">
            {values.map((v, i) => (
              <AnimatedCard key={v.title} delay={i * 100}>
                <Card className="h-full rounded-2xl border border-navy/8 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gold/10">
                      <v.icon className="h-7 w-7 text-gold" aria-hidden />
                    </div>
                    <CardTitle className="text-lg text-navy">{v.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">
                      {v.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-28 sm:py-32">
        <div className="ui-container">
          <div className="mx-auto max-w-3xl text-center">
            <Users className="mx-auto h-12 w-12 text-gold" aria-hidden />
            <h2 className="mt-4 text-2xl font-bold text-navy sm:text-3xl">
              {t("about.teamTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("about.teamDescription")}
            </p>
          </div>

          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {teamMembers.map((member, i) => {
              const name = isKo ? member.nameKo : member.nameEn;
              const role = isKo ? member.roleKo : member.roleEn;
              const bio = isKo ? member.bioKo : member.bioEn;

              return (
                <AnimatedCard key={member.nameEn} delay={i * 90}>
                  <Card
                    className="h-full rounded-2xl border border-navy/8 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md"
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-light text-sm font-bold text-navy shadow-sm">
                          {member.initials}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-bold text-navy">{name}</div>
                          <div className="text-xs font-semibold text-gold-dark">
                            {role}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm leading-relaxed">
                        {bio}
                      </CardDescription>
                    </CardContent>
                  </Card>
                </AnimatedCard>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-navy py-24 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Globe className="mx-auto h-12 w-12 text-gold" aria-hidden />
          <h2 className="mt-4 text-2xl font-bold dark:text-white text-gray-900 sm:text-3xl">
            {t("about.globalTitle")}
          </h2>
          <p className="mt-4 leading-relaxed text-slate-300">
            {t("about.globalDescription")}
          </p>
        </div>
      </section>

      <section className="relative overflow-hidden py-24 sm:py-28">
        <div
          className="absolute inset-0 bg-gradient-to-br from-gold via-amber-400/95 to-[#b8942f]"
          aria-hidden
        />
        <div
          className="hero-pattern pointer-events-none absolute inset-0 opacity-[0.15]"
          aria-hidden
        />
        <div className="relative mx-auto max-w-2xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">
            {t("about.ctaTitle")}
          </h2>
          <p className="mt-4 text-base leading-relaxed text-navy/80 sm:text-lg">
            {t("about.ctaSubtitle")}
          </p>
          <Button
            variant="cta"
            size="lg"
            className="btn-gold mt-10 rounded-full px-10 shadow-md"
            asChild
          >
            <Link href="/contact">{t("about.ctaButton")}</Link>
          </Button>
        </div>
      </section>
    </>
  );
}

function getValueTranslation(
  t: Awaited<ReturnType<typeof getTranslations>>,
  key: string,
) {
  return {
    title: t(`about.${key}.title`),
    description: t(`about.${key}.description`),
  };
}
