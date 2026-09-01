"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { ArrowLeft, ArrowRight, Clock, Flag } from "lucide-react";
import { cn } from "@/lib/utils";

/** Aligned with about timeline SoT (2014 / 2017 / 2022 / 2026). */
const historyData = [
  {
    year: "2014",
    labelKo: "설립·투명화",
    labelEn: "Founded & transparency",
    titleKo: "국내 최초 OOH 단가 투명화",
    titleEn: "First transparent OOH rates in Korea",
    descriptionKo:
      "주식회사 싱커드(THINKAD) 설립과 함께 매체별 단가를 온라인에 공개하며, 업계 최초로 OOH 가격 투명화를 시작했습니다.",
    descriptionEn:
      "THINKAD Inc. was founded and published per-media pricing online — starting an industry-first push for OOH rate transparency.",
  },
  {
    year: "2017",
    labelKo: "검색 플랫폼",
    labelEn: "Search platform",
    titleKo: "쇼핑몰형 매체 검색 플랫폼",
    titleEn: "Store-style media search",
    descriptionKo:
      "카테고리별 매체 분류와 견적 원스톱 처리를 갖춘 검색형 플랫폼으로, 광고주가 검증 매체를 비교·선택할 수 있게 했습니다.",
    descriptionEn:
      "Launched a store-style search platform with category browsing and one-stop quoting so advertisers can compare verified media.",
  },
  {
    year: "2022",
    labelKo: "미디어렙",
    labelEn: "Media rep",
    titleKo: "미디어렙 공식 인정",
    titleEn: "Recognized media rep",
    descriptionKo:
      "광고주·대행사·매체사 파트너십을 바탕으로 국내 OOH 네트워크를 확장하며, 대행·검증형 미디어렙으로 자리잡았습니다.",
    descriptionEn:
      "Expanded the Korean OOH network through advertiser, agency, and media-owner partnerships — established as a verified media-rep model.",
  },
  {
    year: "2026",
    labelKo: "AI 플랫폼",
    labelEn: "AI platform",
    titleKo: "AI 플랫폼으로 진화",
    titleEn: "Evolved into an AI platform",
    descriptionKo:
      "AI 플래너·전자계약·통합 분석까지 이어지는 플랫폼으로 고도화해, 옥외·디지털·통합 플래닝을 한곳에서 지원합니다.",
    descriptionEn:
      "Advanced into an AI platform spanning planner, e-contracts, and unified analytics — supporting OOH, digital, and integrated planning.",
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
              <p className="tkad-type-label text-accent">
                {`// 16 / History`}
              </p>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-hero-fg sm:text-5xl lg:text-6xl">
                {isKo ? "THINKAD 연혁 타임라인" : "THINKAD History Timeline"}
              </h1>
              <p className="mt-5 max-w-2xl tkad-type-meta tracking-tight text-hero-fg/75 sm:text-sm">
                {isKo
                  ? "2016년 설립부터 AI 기반 OOH 플랫폼까지, 싱커드가 걸어온 길을 연도별로 살펴보세요."
                  : "Explore THlNKAD's journey from its founding in 2016 to the launch of its AI-powered OOH platform."}
              </p>
            </div>
            <div className="hidden sm:block">
              <Link
                href="/about"
                className="inline-flex items-center gap-1 border-2 border-hero-fg bg-transparent px-4 py-2 tkad-type-label text-hero-fg transition-colors hover:bg-card hover:text-foreground"
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
                          "flex h-12 w-12 items-center justify-center border-2  text-sm font-bold transition-ui",
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
                    <span className={cn("tkad-type-label", isActive ? "text-accent" : "text-muted-foreground")}>
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
                  <span className="border-2 border-accent bg-accent px-2 py-0.5 tkad-type-label text-accent-foreground">
                    [ {isKo ? "주요 전환점" : "KEY MILESTONE"} ]
                  </span>
                  <h2 className="mt-3 text-xl font-bold tracking-tight text-foreground">
                    {isKo ? activeItem.titleKo : activeItem.titleEn}
                  </h2>
                  <p className="mt-1 tkad-type-label text-muted-foreground">
                    {`// `}{isKo ? "THINKAD 연혁" : "THINKAD History"}
                  </p>
                </div>
                <div className="flex flex-col items-end text-right">
                  <span className="tkad-type-label text-accent">
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
                <p className="tkad-type-label text-accent">
                  [ JOURNEY ]
                </p>
                <h3 className="mt-2 flex items-center gap-2 text-sm font-bold tracking-tight text-foreground">
                  <Clock className="h-4 w-4 text-accent" />
                  {isKo ? "THINKAD 성장 여정" : "THINKAD Growth Journey"}
                </h3>
              </header>
              <div className="space-y-4 p-5 tkad-type-meta leading-relaxed tracking-tight text-muted-foreground">
                <p>
                  {`// `}{isKo
                    ? "설립 이후 싱커드는 국내 OOH 핵심 거점의 검증 매체 네트워크를 확장하며, 대행·검증형 미디어 플랫폼으로 성장해왔습니다."
                    : "Since founding, THINKAD has expanded a verified media network around key domestic OOH hubs as an agency and verification platform."}
                </p>
                <p>
                  {`// `}{isKo
                    ? "2026년에는 데이터와 AI를 결합한 OOH 플래닝 플랫폼을 고도화하여, 매체 추천과 캠페인 설계를 한곳에서 이어갑니다."
                    : "In 2026, THINKAD advanced its AI-powered OOH planning platform so media recommendations and campaign design continue in one place."}
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
            <span className="tkad-type-label text-muted-foreground">
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
