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

      {/* Introduction */}
      <section className="py-28 bg-white">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <p className="text-sm font-semibold tracking-wider text-gold uppercase mb-3">About THINKAD</p>
            <h2 className="text-2xl font-bold text-navy sm:text-3xl">
              {isKo ? "광고주의 성공을 먼저 생각하는 종합광고대행사" : "A Full-Service Agency That Puts Client Success First"}
            </h2>
          </div>
          
          <div className="space-y-12">
            <div className="bg-gradient-to-br from-slate-50 to-white p-8 rounded-2xl border border-slate-100">
              <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold text-sm">01</span>
                {isKo ? "싱커드 소개" : "About THINKAD"}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {isKo 
                  ? "싱커드는 창의적인 미디어렙을 목표로 인정받는 종합 마케팅 솔루션 회사입니다. 다양한 광고 매체를 활용하여 효과적인 광고마케팅을 제안하고, 모든 직원들이 책임감을 갖고 광고주의 입장에서 생각하는 광고주가 가장 선호하는 미디어렙으로 자리매김 하겠습니다."
                  : "THINKAD is a comprehensive marketing solutions company recognized as a creative media rep. We propose effective advertising marketing utilizing various media, and all employees take responsibility to think from the advertiser's perspective."}
              </p>
            </div>

            <div className="bg-gradient-to-br from-navy/5 to-white p-8 rounded-2xl border border-navy/10">
              <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold text-sm">02</span>
                {isKo ? "우리의 철학" : "Our Philosophy"}
              </h3>
              <blockquote className="text-gold-dark font-medium italic mb-4 pl-4 border-l-4 border-gold/30">
                {isKo 
                  ? "\"지금 눈에 보이는 부분만이 광고대행사의 실력을 말해주는 것은 아닙니다.\""
                  : "\"What you see now is not the only measure of an agency's capabilities.\""}
              </blockquote>
              <p className="text-muted-foreground leading-relaxed">
                {isKo 
                  ? "싱커드는 빈틈없는 전략과 정확한 타깃설정, 효과적인 커뮤니케이션으로 광고주의 시각으로 브랜드 전략을 구상합니다. 전문화된 각 조직의 기능과 아이디어를 효율적으로 통합하여 소비자를 실질적으로 움직일 수 있는 마케팅 커뮤니케이션을 지향하며, 이를 통해 광고주와 브랜드의 가치를 극대화하고 있습니다."
                  : "THINKAD designs brand strategies from the advertiser's perspective with seamless strategy, precise targeting, and effective communication. We integrate the functions and ideas of specialized organizations efficiently to create marketing communications that truly move consumers, maximizing the value of advertisers and brands."}
              </p>
            </div>

            <div className="bg-gradient-to-br from-gold/5 to-white p-8 rounded-2xl border border-gold/20">
              <h3 className="text-lg font-bold text-navy mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-full bg-gold/10 flex items-center justify-center text-gold text-sm">03</span>
                Full Media Solution
              </h3>
              <p className="text-muted-foreground leading-relaxed mb-4">
                {isKo 
                  ? "싱커드는 오픈, 공유, 확산이라는 새로운 법칙의 중심에 서 있는 소비자와의 소통을 위해 끊임없는 열정으로 전략적인 Full Media Solution을 제공합니다. 기업의 브랜드뿐 아니라, 공공기관 등 퍼블릭 분야에서 실험적인 광고회사로 이름을 알리고 있습니다."
                  : "THINKAD provides strategic Full Media Solutions with endless passion for communication with consumers at the center of the new rules of openness, sharing, and diffusion. We are known as an experimental advertising company not only for corporate brands but also in the public sector."}
              </p>
              <p className="text-muted-foreground leading-relaxed">
                {isKo 
                  ? "세상을 우리 브랜드에 중독되게 하기 위해 온-오프라인 광고의 경계를 넘어선 캠페인을 진행합니다. 싱커드는 국내외 온·오프라인 광고를 기획 및 집행하는 캠페인 에이전시로서 일반 광고회사가 아닌 당신의 브랜드 파트너로서 당신의 시작, 당신의 위기, 당신의 성공을 언제나 함께 하겠습니다."
                  : "To make the world addicted to our brand, we conduct campaigns that transcend the boundaries of online and offline advertising. As a campaign agency that plans and executes domestic and international on/offline advertising, THINKAD will always be with you as your brand partner—through your start, your challenges, and your success."}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* History */}
      <section className="py-28 bg-slate-50">
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
