"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, ArrowRight, Clock, Flag } from "lucide-react";

const historyData = [
  {
    year: "2016",
    labelKo: "설립",
    labelEn: "Founded",
    titleKo: "THINKAD 설립",
    titleEn: "THINKAD Founded",
    descriptionKo:
      "주식회사 싱커드(THINKAD) 설립. '생각하는 광고회사'라는 슬로건 아래 OOH 전문 에이전시의 첫걸음을 내딛었습니다.",
    descriptionEn:
      "THINKAD Inc. was founded as 'The Thinking Ad Agency,' taking its first step as a specialized OOH agency.",
  },
  {
    year: "2017",
    labelKo: "첫 대형 프로젝트",
    labelEn: "First Major Project",
    titleKo: "국내 대형 OOH 캠페인 수행",
    titleEn: "First Large-Scale OOH Campaign",
    descriptionKo:
      "국내 대기업과 함께 첫 대형 OOH 캠페인을 수행하며 전국 단위 옥외 미디어 운영 역량을 입증했습니다.",
    descriptionEn:
      "Executed the first large-scale OOH campaign with a major Korean enterprise, proving nationwide outdoor media capabilities.",
  },
  {
    year: "2019",
    labelKo: "100개 매체 돌파",
    labelEn: "100 Media Milestone",
    titleKo: "운영 매체 100개 돌파",
    titleEn: "Surpassed 100 Operated Media",
    descriptionKo:
      "코엑스 K-POP 스퀘어, 강남대로 미디어폴 등 랜드마크 매체를 포함해 운영·관리 매체 수가 100개를 돌파했습니다.",
    descriptionEn:
      "Surpassed 100 operated and managed media, including landmark displays such as COEX K-POP Square and Gangnam-daero Media Pole.",
  },
  {
    year: "2022",
    labelKo: "글로벌 진출",
    labelEn: "Global Expansion",
    titleKo: "글로벌 OOH 네트워크 확장",
    titleEn: "Global OOH Network Expansion",
    descriptionKo:
      "뉴욕 타임스퀘어, 두바이 부르즈 할리파 등 해외 랜드마크 매체와 파트너십을 구축하며 글로벌 네트워크를 확장했습니다.",
    descriptionEn:
      "Expanded the global network by partnering with landmark media such as New York Times Square and Dubai Burj Khalifa LED.",
  },
  {
    year: "2025",
    labelKo: "AI 플랫폼 런칭",
    labelEn: "AI Platform Launch",
    titleKo: "AI 기반 OOH 플래닝 플랫폼 런칭",
    titleEn: "Launched AI-Powered OOH Planning Platform",
    descriptionKo:
      "데이터와 AI를 결합한 OOH 플래닝 플랫폼을 런칭하여 매체 추천과 캠페인 성과 예측을 한층 고도화했습니다.",
    descriptionEn:
      "Launched an AI-powered OOH planning platform, advancing media recommendations and campaign performance prediction.",
  },
] as const;

export default function HistoryPage() {
  const locale = useLocale();
  const t = useTranslations("about");
  const isKo = locale === "ko";
  const [activeYear, setActiveYear] = useState<string>(historyData[0].year);

  const activeItem =
    historyData.find((item) => item.year === activeYear) ?? historyData[0];

  const goPrev = () => {
    const currentIndex = historyData.findIndex(
      (item) => item.year === activeItem.year,
    );
    if (currentIndex > 0) {
      setActiveYear(historyData[currentIndex - 1].year);
    }
  };

  const goNext = () => {
    const currentIndex = historyData.findIndex(
      (item) => item.year === activeItem.year,
    );
    if (currentIndex < historyData.length - 1) {
      setActiveYear(historyData[currentIndex + 1].year);
    }
  };

  return (
    <>
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold tracking-wider text-gold uppercase">
                {isKo ? "회사 연혁" : "Company History"}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
                {isKo ? "THINKAD 연혁 타임라인" : "THINKAD History Timeline"}
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                {isKo
                  ? "2016년 설립부터 AI 기반 OOH 플랫폼까지, 싱커드가 걸어온 길을 연도별로 살펴보세요."
                  : "Explore THlNKAD's journey from its founding in 2016 to the launch of its AI-powered OOH platform."}
              </p>
            </div>
            <div className="hidden sm:block">
              <Link href="/about">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full border-white/20 text-xs font-semibold text-slate-200 hover:bg-white/10"
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  {isKo ? "회사 소개로 돌아가기" : "Back to About"}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Timeline rail */}
          <div className="mb-8 overflow-x-auto">
            <div className="flex min-w-[600px] items-center gap-6 pb-2">
              {historyData.map((item, index) => {
                const isActive = item.year === activeYear;
                return (
                  <button
                    key={item.year}
                    type="button"
                    onClick={() => setActiveYear(item.year)}
                    className="flex flex-1 flex-col items-center gap-2 focus:outline-none"
                  >
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-all ${
                          isActive
                            ? "bg-gold text-navy shadow-lg shadow-gold/40"
                            : "bg-slate-100 text-navy"
                        }`}
                      >
                        {item.year.slice(2)}
                      </div>
                      {index < historyData.length - 1 && (
                        <div className="absolute left-1/2 top-1/2 h-px w-[220%] -translate-y-1/2 translate-x-[60%] bg-gradient-to-r from-gold/40 to-slate-200" />
                      )}
                    </div>
                    <span className="text-xs font-medium text-navy">
                      {isKo ? item.labelKo : item.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active card */}
          <div className="grid gap-8 lg:grid-cols-[2fr,1fr]">
            <Card className="border-0 bg-white shadow-lg">
              <CardHeader className="flex flex-row items-center justify-between gap-4">
                <div>
                  <Badge className="mb-2 bg-gold/10 text-xs font-semibold text-gold-dark">
                    {isKo ? "주요 전환점" : "Key Milestone"}
                  </Badge>
                  <CardTitle className="text-xl font-bold text-navy">
                    {isKo ? activeItem.titleKo : activeItem.titleEn}
                  </CardTitle>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isKo ? "THINKAD 연혁" : "THINKAD History"}
                  </p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="text-xs font-semibold text-slate-500">
                    {isKo ? "연도" : "Year"}
                  </span>
                  <span className="text-2xl font-extrabold text-navy">
                    {activeItem.year}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-slate-700">
                  {isKo ? activeItem.descriptionKo : activeItem.descriptionEn}
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 bg-slate-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-sm font-semibold text-navy">
                  <Clock className="h-4 w-4 text-gold" />
                  {isKo ? "THINKAD 성장 여정" : "THINKAD Growth Journey"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-xs text-slate-700">
                <p>
                  {isKo
                    ? "설립 이후 싱커드는 국내 OOH 핵심 거점을 기반으로 매체 네트워크를 확장하고, 글로벌 랜드마크와의 파트너십을 통해 크로스보더 캠페인을 수행해왔습니다."
                    : "Since its founding, THINKAD has expanded its media network around key domestic OOH hubs and executed cross-border campaigns through partnerships with global landmarks."}
                </p>
                <p>
                  {isKo
                    ? "2025년에는 데이터와 AI를 결합한 OOH 플래닝 플랫폼을 런칭하여, 매체 추천과 성과 예측을 한층 고도화했습니다."
                    : "In 2025, THINKAD launched an AI-powered OOH planning platform, further advancing media recommendations and performance forecasting."}
                </p>
                <div className="pt-2">
                  <Link href="/about">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-center rounded-full border-navy/10 text-xs font-semibold text-navy hover:bg-navy hover:text-white"
                    >
                      <Flag className="mr-1.5 h-3.5 w-3.5" />
                      {isKo
                        ? "THINKAD 소개 더 보기"
                        : "Learn more about THINKAD"}
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={goPrev}
              disabled={activeItem.year === historyData[0].year}
            >
              <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
              {isKo ? "이전 연혁" : "Previous"}
            </Button>
            <span className="text-xs text-muted-foreground">
              {historyData.findIndex((item) => item.year === activeItem.year) +
                1}{" "}
              / {historyData.length}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={goNext}
              disabled={
                activeItem.year === historyData[historyData.length - 1].year
              }
            >
              {isKo ? "다음 연혁" : "Next"}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}

