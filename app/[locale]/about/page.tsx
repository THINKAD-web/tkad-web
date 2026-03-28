import dynamic from "next/dynamic";
import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Globe, Heart, Users } from "lucide-react";

const AboutHeroStats = dynamic(() =>
  import("@/components/about-hero-stats").then((m) => ({
    default: m.AboutHeroStats,
  })),
);
const ScrollStagger = dynamic(() =>
  import("@/components/scroll-stagger").then((m) => ({
    default: m.ScrollStagger,
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

  const milestones = [
    {
      year: "2016",
      event: {
        ko: "주식회사 싱커드(THINKAD) 설립",
        en: "THINKAD Inc. founded",
      },
    },
    {
      year: "2017",
      event: {
        ko: "첫 대형 OOH 캠페인 수행",
        en: "First large-scale OOH campaign",
      },
    },
    {
      year: "2019",
      event: {
        ko: "등록·운영 매체 100개 돌파",
        en: "Surpassed 100 operated media",
      },
    },
    {
      year: "2022",
      event: {
      ko: "국내 OOH 네트워크 본격 확장",
      en: "Domestic OOH network expansion",
      },
    },
    {
      year: "2025",
      event: {
        ko: "AI 기반 OOH 플래닝 플랫폼 런칭",
        en: "Launched AI-powered OOH planning platform",
      },
    },
  ];

  const teamMembers = [
    {
      nameKo: "이재한",
      nameEn: "Jaehan Lee",
      roleKo: "대표",
      roleEn: "CEO",
      bioKo:
        "OOH 광고 업계 15년 이상, 국내외 랜드마크 캠페인을 리드해온 THINKAD의 대표.",
      bioEn:
        "Over 15 years in OOH, leading landmark campaigns in Korea and abroad as CEO of THINKAD.",
      initials: "JL",
      highlight: true,
    },
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
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("about.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("about.subtitle")}</p>
          <AboutHeroStats isKo={isKo} />
        </div>
      </section>

      {/* History */}
      <section className="py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="text-2xl font-bold text-navy">
                {t("about.historyTitle")}
              </h2>
              <p className="mt-4 leading-relaxed text-muted-foreground">
                {t("about.historyDescription")}
              </p>
            </div>
            <div className="space-y-4">
              {milestones.map((m) => (
                <div key={m.year} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gold/10 text-sm font-bold text-gold">
                      {m.year.slice(2)}
                    </div>
                    <div className="h-full w-px bg-border" />
                  </div>
                  <div className="pb-6">
                    <div className="text-sm font-semibold text-navy">
                      {m.year}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {m.event.ko}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-slate-50 py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-navy">
            {t("about.valuesTitle")}
          </h2>
          <ScrollStagger className="mt-12 grid gap-8 md:grid-cols-3">
            {values.map((v) => (
              <Card key={v.title} className="border-0 bg-white shadow-md">
                <CardHeader>
                  <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-gold/10">
                    <v.icon className="h-6 w-6 text-gold" />
                  </div>
                  <CardTitle className="text-lg">{v.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="leading-relaxed">
                    {v.description}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </ScrollStagger>
        </div>
      </section>

      {/* Team */}
      <section className="py-28 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <Users className="mx-auto h-12 w-12 text-gold" />
            <h2 className="mt-4 text-2xl font-bold text-navy">
              {t("about.teamTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("about.teamDescription")}
            </p>
          </div>

          <ScrollStagger className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {teamMembers.map((member) => {
              const name = isKo ? member.nameKo : member.nameEn;
              const role = isKo ? member.roleKo : member.roleEn;
              const bio = isKo ? member.bioKo : member.bioEn;

              return (
                <Card
                  key={member.nameEn}
                  className={`relative h-full border-0 bg-white shadow-md transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl ${
                    member.highlight ? "ring-2 ring-gold/60" : ""
                  }`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-gold to-gold-light text-sm font-bold text-navy shadow-md">
                        {member.initials}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-bold text-navy">
                          {name}
                        </div>
                        <div className="text-xs text-gold-dark font-semibold">
                          {role}
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-xs leading-relaxed">
                      {bio}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </ScrollStagger>
        </div>
      </section>

      {/* Global */}
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <Globe className="mx-auto h-12 w-12 text-gold" />
          <h2 className="mt-4 text-2xl font-bold text-white">
            {t("about.globalTitle")}
          </h2>
          <p className="mt-4 leading-relaxed text-slate-300">
            {t("about.globalDescription")}
          </p>
        </div>
      </section>
    </>
  );
}

function getValueTranslation(
  t: Awaited<ReturnType<typeof getTranslations>>,
  key: string
) {
  return {
    title: t(`about.${key}.title`),
    description: t(`about.${key}.description`),
  };
}
