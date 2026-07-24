"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { ArrowLeft, ArrowRight, Clock, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

const historyData = [
  {
    year: "2016",
    labelKo: "설립",
    labelEn: "Founded",
    titleKo: "THINKAD 설립",
    titleEn: "THINKAD Founded",
    descriptionKo:
      "주식회사 싱커드(THINKAD) 설립. OOH 전문 에이전시의 첫걸음을 내딛었습니다.",
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
    labelKo: "전국 확대",
    labelEn: "Nationwide Expansion",
    titleKo: "국내 OOH 네트워크 확장",
    titleEn: "Korean OOH Network Expansion",
    descriptionKo:
      "코엑스 K-POP 스퀘어, 강남대로 미디어폴를 비롯한 주요 랜드마크와의 파트너십을 강화하며 국내 OOH 네트워크를 확장했습니다.",
    descriptionEn:
      "Expanded our Korean OOH network by strengthening partnerships with key domestic landmarks such as COEX K-POP Square and Gangnam-daero Media Pole.",
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
      <section className="bg-hero-void py-24">
        <div className="ui-container">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                {`// 16 / History`}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
                {isKo ? "THINKAD 연혁 타임라인" : "THINKAD History Timeline"}
              </h1>
              <p className="mt-5 max-w-2xl text-[12px] tracking-tight text-hero-fg/75 sm:text-sm">
                {isKo
                  ? "2016년 설립부터 AI 기반 OOH 플랫폼까지, 싱커드가 걸어온 길을 연도별로 살펴보세요."
                  : "Explore THlNKAD's journey from its founding in 2016 to the launch of its AI-powered OOH platform."}
              </p>
            </div>
            <div className="hidden sm:block">
              <Link
                href="/about"
                className="inline-flex items-center gap-1 border-2 border-hero-fg bg-transparent px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-hero-fg transition-colors hover:bg-card hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {isKo ? "About" : "Back to About"}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-muted py-20 sm:py-24">
        <div className="ui-container">
          {/* Timeline rail */}
          <div className="mb-10 overflow-x-auto">
            <div className="flex min-w-[600px] items-center gap-4 pb-2">
              {historyData.map((item, index) => {
                const isActive = item.year === activeYear;
                return (
                  <button
                    key={item.year}
                    type="button"
                    onClick={() => setActiveYear(item.year)}
                    className="flex flex-1 flex-col items-center gap-2 focus:outline-none"
                  >
                    <div className="relative flex w-full items-center justify-center">
                      <div
                        className={cn(
                          "flex h-12 w-12 items-center justify-center border-2  text-sm font-bold transition-all",
                          isActive
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border bg-card text-foreground",
                        )}
                      >
                        {item.year.slice(2)}
                      </div>
                      {index < historyData.length - 1 && (
                        <div className="absolute left-1/2 top-1/2 h-0.5 w-[220%] -translate-y-1/2 translate-x-[60%] bg-hero-void" />
                      )}
                    </div>
                    <span className={cn("font-display text-xs font-medium uppercase tracking-[0.18em]", isActive ? "text-accent" : "text-muted-foreground")}>
                      {isKo ? item.labelKo : item.labelEn}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active card */}
          <div className="grid gap-0 lg:grid-cols-[2fr,1fr]">
            <article className="-ml-[2px] border-2 border-border bg-card">
              <header className="flex flex-row items-center justify-between gap-4 border-b-2 border-border p-5">
                <div>
                  <span className="border-2 border-accent bg-accent px-2 py-0.5 font-display text-xs font-medium uppercase tracking-[0.22em] text-accent-foreground">
                    [ {isKo ? "주요 전환점" : "KEY MILESTONE"} ]
                  </span>
                  <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">
                    {isKo ? activeItem.titleKo : activeItem.titleEn}
                  </h2>
                  <p className="mt-1 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                    {`// `}{isKo ? "THINKAD 연혁" : "THINKAD History"}
                  </p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                    [ {isKo ? "YEAR" : "YEAR"} ]
                  </span>
                  <span className="font-display text-3xl font-bold tabular-nums text-foreground">
                    {activeItem.year}
                  </span>
                </div>
              </header>
              <div className="p-5">
                <p className="text-sm leading-relaxed text-foreground">
                  {isKo ? activeItem.descriptionKo : activeItem.descriptionEn}
                </p>
              </div>
            </article>

            <article className="-ml-[2px] border-2 border-border bg-muted">
              <header className="border-b-2 border-border p-5">
                <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                  [ JOURNEY ]
                </p>
                <h3 className="mt-2 flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
                  <Clock className="h-4 w-4 text-accent" />
                  {isKo ? "THINKAD 성장 여정" : "THINKAD Growth Journey"}
                </h3>
              </header>
              <div className="space-y-4 p-5 text-[12px] leading-relaxed tracking-tight text-muted-foreground">
                <p>
                  {`// `}{isKo
                    ? "설립 이후 싱커드는 국내 OOH 핵심 거점을 기반으로 매체 네트워크를 확장하며 한국 OOH 미디어랩 전문 회사로 성장해왔습니다."
                    : "Since its founding, THINKAD has expanded its media network around key domestic OOH hubs and grown into a specialized Korean OOH media lab."}
                </p>
                <p>
                  {`// `}{isKo
                    ? "2025년에는 데이터와 AI를 결합한 OOH 플래닝 플랫폼을 런칭하여, 매체 추천과 성과 예측을 한층 고도화했습니다."
                    : "In 2025, THINKAD launched an AI-powered OOH planning platform, further advancing media recommendations and performance forecasting."}
                </p>
                <div className="pt-2">
                  <BtnBlock href="/about" variant="secondary" size="sm" className="w-full justify-center">
                    <Flag className="h-3.5 w-3.5" />
                    {isKo
                      ? "THINKAD 소개 더 보기"
                      : "Learn more about THINKAD"}
                  </BtnBlock>
                </div>
              </div>
            </article>
          </div>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-between gap-4">
            <BtnBlock
              variant="secondary"
              size="sm"
              onClick={goPrev}
              disabled={activeItem.year === historyData[0].year}
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {isKo ? "이전 연혁" : "Previous"}
            </BtnBlock>
            <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {`// `}
              {historyData.findIndex((item) => item.year === activeItem.year) +
                1}{" "}
              / {historyData.length}
            </span>
            <BtnBlock
              variant="secondary"
              size="sm"
              onClick={goNext}
              disabled={
                activeItem.year === historyData[historyData.length - 1].year
              }
            >
              {isKo ? "다음 연혁" : "Next"}
              <ArrowRight className="h-3.5 w-3.5" />
            </BtnBlock>
          </div>
        </div>
      </section>
    </>
  );
}
