import type { Metadata } from "next";
import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Globe, Heart, Users } from "lucide-react";

export const metadata: Metadata = {
  title: "회사 소개",
  description:
    "싱커드(THINKAD)는 2016년 설립된 대한민국 No.1 OOH 광고 에이전시입니다. 15년 이상의 업력과 100+ 대기업 파트너.",
  openGraph: {
    title: "회사 소개 | THINKAD 싱커드",
    description:
      "2016년 설립, 15년 이상 OOH 업력, 100+ 대기업 파트너.",
  },
};

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AboutContent />;
}

function AboutContent() {
  const t = useTranslations();

  const values = [
    { icon: BarChart3, ...getValueTranslation(t, "value1") },
    { icon: Heart, ...getValueTranslation(t, "value2") },
    { icon: Globe, ...getValueTranslation(t, "value3") },
  ];

  const milestones = [
    { year: "2016", event: { ko: "주식회사 싱커드(THINKAD) 설립 · 사업자등록(319-86-00382)", en: "THINKAD Inc. founded (Reg: 319-86-00382)" } },
    { year: "2017", event: { ko: "통신판매업 신고 · 국내 OOH 매체 네트워크 구축", en: "E-Commerce permit · Domestic OOH network established" } },
    { year: "2019", event: { ko: "코엑스 K-POP 스퀘어 · 강남대로 미디어폴 운영 시작", en: "COEX K-POP Square & Gangnam-daero Media Pole operations" } },
    { year: "2021", event: { ko: "글로벌 매체 확장 (뉴욕 타임스퀘어 · 두바이 부르즈 할리파)", en: "Global expansion (NYC Times Square · Dubai Burj Khalifa)" } },
    { year: "2023", event: { ko: "데이터 기반 컨설팅 서비스 런칭 · 일본 애드트럭 파트너십", en: "Data consulting launch · Japan Ad Truck partnership" } },
    { year: "2025", event: { ko: "등록 매체 500+ 돌파 · 성수 본사 확장 이전", en: "500+ registered media · Seongsu HQ expansion" } },
  ];

  return (
    <>
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("about.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("about.subtitle")}</p>
        </div>
      </section>

      {/* History */}
      <section className="py-20">
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
      <section className="bg-slate-50 py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-center text-2xl font-bold text-navy">
            {t("about.valuesTitle")}
          </h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
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
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl">
            <Users className="mx-auto h-12 w-12 text-gold" />
            <h2 className="mt-4 text-2xl font-bold text-navy">
              {t("about.teamTitle")}
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">
              {t("about.teamDescription")}
            </p>
          </div>
        </div>
      </section>

      {/* Global */}
      <section className="bg-navy py-20">
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
  t: ReturnType<typeof useTranslations>,
  key: string
) {
  return {
    title: t(`about.${key}.title`),
    description: t(`about.${key}.description`),
  };
}
