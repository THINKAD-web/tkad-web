"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Maximize2, Filter } from "lucide-react";

type PortfolioCategory = "billboard" | "bus" | "subway" | "building" | "all";

type PortfolioItem = {
  id: number;
  title: string;
  client: string;
  year: number;
  category: Exclude<PortfolioCategory, "all">;
  description: string;
  location: string;
};

const CATEGORY_LABELS: Record<Exclude<PortfolioCategory, "all">, string> = {
  billboard: "전광판",
  bus: "버스",
  subway: "지하철",
  building: "빌딩 래핑",
};

const ITEMS: PortfolioItem[] = [
  {
    id: 1,
    title: "코엑스 K-POP 스퀘어 브랜드 런칭",
    client: "글로벌 뷰티 브랜드",
    year: 2024,
    category: "billboard",
    location: "서울 코엑스 K-POP 스퀘어",
    description:
      "랜드마크 전광판 풀도미네이션 집행으로 브랜드 런칭 인지도를 단기간에 극대화한 캠페인.",
  },
  {
    id: 2,
    title: "강남대로 미디어폴 패션 캠페인",
    client: "패션 이커머스",
    year: 2023,
    category: "billboard",
    location: "서울 강남대로 일대",
    description:
      "동일 크리에이티브의 반복 노출 대신 시간대별 타겟에 맞춘 크리에이티브 믹스로 효율을 높인 DOOH 캠페인.",
  },
  {
    id: 3,
    title: "수도권 버스 래핑 퍼포먼스 캠페인",
    client: "모빌리티 서비스",
    year: 2024,
    category: "bus",
    location: "서울·경기 주요 노선",
    description:
      "앱 설치 전환을 목표로 이동 동선 기반 타겟 노선을 선별해 집행한 퍼포먼스 중심 버스 래핑 캠페인.",
  },
  {
    id: 4,
    title: "강남역 환승센터 지하철 스크린도어",
    client: "핀테크 서비스",
    year: 2023,
    category: "subway",
    location: "서울 2·9호선 강남역",
    description:
      "출퇴근 피크 타임 집중 노출 전략으로 신규 계좌 개설 전환을 극대화한 지하철 스크린도어 집행.",
  },
  {
    id: 5,
    title: "도심 빌딩 미디어파사드 브랜딩",
    client: "글로벌 테크 기업",
    year: 2022,
    category: "building",
    location: "서울 시내 랜드마크 빌딩",
    description:
      "신제품 글로벌 런칭과 연계한 미디어파사드 연출로 온라인·오프라인 버즈를 동시에 만든 브랜딩 캠페인.",
  },
  {
    id: 6,
    title: "공항 리무진 래핑 캠페인",
    client: "여행 플랫폼",
    year: 2024,
    category: "bus",
    location: "인천·김포공항 리무진 노선",
    description:
      "공항 리무진 버스 동선을 기반으로 여행 직전·직후 고객을 타겟팅한 버스 래핑 캠페인.",
  },
];

const categories: { key: PortfolioCategory; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "billboard", label: "전광판" },
  { key: "bus", label: "버스" },
  { key: "subway", label: "지하철" },
  { key: "building", label: "빌딩" },
];

export default function PortfolioPage() {
  const locale = useLocale();
  const isKo = locale === "ko";

  const [selectedCategory, setSelectedCategory] =
    useState<PortfolioCategory>("all");
  const [activeItem, setActiveItem] = useState<PortfolioItem | null>(null);

  const filteredItems = useMemo(
    () =>
      selectedCategory === "all"
        ? ITEMS
        : ITEMS.filter((item) => item.category === selectedCategory),
    [selectedCategory],
  );

  return (
    <>
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            {isKo ? "포트폴리오" : "Portfolio"}
          </p>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-4xl">
            {isKo
              ? "THINKAD가 집행한 OOH 캠페인"
              : "OOH campaigns delivered by THINKAD"}
          </h1>
          <p className="mt-3 max-w-2xl text-sm text-slate-300">
            {isKo
              ? "전광판, 버스, 지하철, 빌딩 래핑까지 다양한 옥외 매체로 진행한 실제 캠페인 사례를 한눈에 확인해 보세요."
              : "Explore real-world OOH campaigns across billboards, buses, subways and building wraps."}
          </p>
        </div>
      </section>

      <section className="border-b bg-slate-50/60 py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
            <Filter className="h-3.5 w-3.5" />
            {isKo ? "카테고리" : "Category"}
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <Button
                  key={cat.key}
                  type="button"
                  size="sm"
                  variant={isActive ? "default" : "outline"}
                  className={`h-8 rounded-full border text-xs ${
                    isActive
                      ? "border-gold bg-gold text-navy hover:bg-gold-dark"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                  onClick={() => setSelectedCategory(cat.key)}
                >
                  {cat.label}
                </Button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 text-xs text-slate-500">
            {isKo ? "총 캠페인 수" : "Total campaigns"}:{" "}
            <span className="font-semibold text-navy">
              {filteredItems.length}
            </span>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItem(item)}
                className="group text-left"
              >
                <Card className="h-full overflow-hidden border-0 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.08)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_18px_40px_rgba(15,23,42,0.18)]">
                  <div className="relative h-40 overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-navy/80 via-navy/40 to-gold/60" />
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_white,_transparent_55%),radial-gradient(circle_at_bottom_right,_#facc15,_transparent_55%)]" />
                    <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-2">
                      <Badge className="bg-black/55 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-100 backdrop-blur">
                        {CATEGORY_LABELS[item.category]}
                      </Badge>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-slate-100 backdrop-blur">
                        {item.year} · {item.location}
                      </span>
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-200/70">
                      OOH CAMPAIGN
                    </div>
                    <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/50 px-2 py-1 text-[10px] font-medium text-slate-100 backdrop-blur">
                      <Maximize2 className="h-3 w-3" />
                      {isKo ? "확대 보기" : "View"}
                    </div>
                  </div>
                  <CardContent className="space-y-2 p-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
                      {item.client}
                    </p>
                    <h2 className="text-sm font-bold text-navy sm:text-base">
                      {item.title}
                    </h2>
                    <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">
                      {item.description}
                    </p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center text-sm text-slate-500">
              {isKo
                ? "선택하신 카테고리에 해당하는 캠페인이 없습니다. 다른 카테고리를 선택해 보세요."
                : "No campaigns found for the selected category."}
            </div>
          )}
        </div>
      </section>

      {activeItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4 backdrop-blur-sm">
          <div className="relative w-full max-w-3xl rounded-2xl bg-white shadow-2xl">
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/70 text-slate-100 shadow-md transition hover:bg-black"
              aria-label={isKo ? "닫기" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid gap-0 overflow-hidden rounded-2xl sm:grid-cols-5">
              <div className="relative h-56 bg-gradient-to-br from-navy via-navy/70 to-gold sm:h-full sm:col-span-3">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_top_left,_white,_transparent_55%),radial-gradient(circle_at_bottom_right,_#facc15,_transparent_55%)]" />
                <div className="absolute inset-6 rounded-2xl border border-white/15 bg-black/10 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur">
                  <div className="flex h-full flex-col justify-between p-4">
                    <div>
                      <Badge className="bg-black/50 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-100">
                        {CATEGORY_LABELS[activeItem.category]}
                      </Badge>
                      <h2 className="mt-3 text-lg font-bold leading-snug text-white">
                        {activeItem.title}
                      </h2>
                      <p className="mt-1 text-xs font-medium text-slate-200/90">
                        {activeItem.client} · {activeItem.year}
                      </p>
                    </div>
                    <p className="mt-3 text-[11px] leading-relaxed text-slate-200/90">
                      {activeItem.location}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col justify-between border-t border-slate-100 bg-white/80 p-5 text-sm text-slate-700 sm:border-l sm:border-t-0 sm:col-span-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    {isKo ? "캠페인 개요" : "Campaign Overview"}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-800">
                    {activeItem.description}
                  </p>
                </div>
                <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 text-[11px] text-slate-600">
                  {isKo ? (
                    <>
                      <p className="font-semibold text-navy">
                        비슷한 캠페인을 진행하고 싶으신가요?
                      </p>
                      <p className="mt-1">
                        견적 문의나 자세한 성과 데이터가 필요하시면 상단
                        &quot;문의&quot; 또는 &quot;견적&quot; 메뉴를 통해
                        연락 주세요.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-semibold text-navy">
                        Interested in a similar campaign?
                      </p>
                      <p className="mt-1">
                        Contact us via the Inquiry or Quote menu for detailed
                        performance data and pricing.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

