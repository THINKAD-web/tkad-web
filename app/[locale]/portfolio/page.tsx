"use client";

import { useMemo, useState } from "react";
import { useLocale } from "next-intl";
import { X, Maximize2, Filter } from "lucide-react";
import { cn } from "@/lib/utils";

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
      <section className="bg-bx-black py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-accent">
            {`// 13 / Portfolio`}
          </p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-bx-white sm:text-5xl lg:text-6xl">
            {isKo
              ? "THINKAD가 집행한 OOH 캠페인"
              : "OOH campaigns delivered by THINKAD"}
          </h1>
          <p className="mt-5 max-w-2xl font-mono text-[12px] tracking-tight text-bx-white/75 sm:text-sm">
            {isKo
              ? "전광판, 버스, 지하철, 빌딩 래핑까지 다양한 옥외 매체로 진행한 실제 캠페인 사례를 한눈에 확인해 보세요."
              : "Explore real-world OOH campaigns across billboards, buses, subways and building wraps."}
          </p>
        </div>
      </section>

      <section className="bg-bx-white py-4">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent">
            <Filter className="h-3.5 w-3.5" />
            [ {isKo ? "CATEGORY" : "CATEGORY"} ]
          </div>
          <div className="flex flex-wrap gap-0">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setSelectedCategory(cat.key)}
                  className={cn(
                    "-mt-[2px] -ml-[2px] border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors",
                    isActive
                      ? "border-bx-accent bg-bx-accent text-bx-white"
                      : "border-bx-black bg-bx-white text-bx-black hover:bg-bx-off",
                  )}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="bg-bx-off py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-4 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
            {`// `}{isKo ? "Total campaigns" : "Total campaigns"}:{" "}
            <span className="font-bold text-bx-accent">
              {filteredItems.length}
            </span>
          </div>

          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-3">
            {filteredItems.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveItem(item)}
                className="group -mt-[2px] -ml-[2px] text-left"
              >
                <article className="flex h-full flex-col border-2 border-bx-black bg-bx-white">
                  <div className="relative h-40 overflow-hidden border-b-2 border-bx-black bg-bx-black">
                    <div className="absolute inset-0 flex items-center justify-center font-mono text-xs font-bold uppercase tracking-[0.22em] text-bx-accent/70">
                      OOH CAMPAIGN
                    </div>
                    <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
                        [ {CATEGORY_LABELS[item.category]} ]
                      </span>
                      <span className="border-2 border-bx-white bg-transparent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
                        {item.year} · {item.location}
                      </span>
                    </div>
                    <div className="absolute right-3 top-3 inline-flex items-center gap-1 border-2 border-bx-white bg-bx-black/80 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-bx-white">
                      <Maximize2 className="h-3 w-3" />
                      {isKo ? "VIEW" : "VIEW"}
                    </div>
                  </div>
                  <div className="flex flex-1 flex-col gap-2 p-4">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                      [ {item.client} ]
                    </p>
                    <h2 className="text-sm font-bold tracking-tight text-bx-black sm:text-base">
                      {item.title}
                    </h2>
                    <p className="line-clamp-3 font-mono text-[11px] leading-relaxed tracking-tight text-bx-gray-dim">
                      {item.description}
                    </p>
                  </div>
                </article>
              </button>
            ))}
          </div>

          {filteredItems.length === 0 && (
            <div className="mt-8 border-2 border-bx-black bg-bx-white px-6 py-10 text-center text-sm text-bx-gray-dim">
              {isKo
                ? "선택하신 카테고리에 해당하는 캠페인이 없습니다. 다른 카테고리를 선택해 보세요."
                : "No campaigns found for the selected category."}
            </div>
          )}
        </div>
      </section>

      {activeItem && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-bx-black/80 px-4">
          <div className="relative w-full max-w-3xl border-2 border-bx-black bg-bx-white">
            <button
              type="button"
              onClick={() => setActiveItem(null)}
              className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
              aria-label={isKo ? "닫기" : "Close"}
            >
              <X className="h-4 w-4" />
            </button>

            <div className="grid gap-0 overflow-hidden sm:grid-cols-5">
              <div className="relative h-56 border-b-2 border-bx-black bg-bx-black sm:h-full sm:col-span-3 sm:border-b-0 sm:border-r-2">
                <div className="flex h-full flex-col justify-between p-5">
                  <div>
                    <span className="border-2 border-bx-accent bg-bx-accent px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
                      [ {CATEGORY_LABELS[activeItem.category]} ]
                    </span>
                    <h2 className="mt-4 text-lg font-bold leading-snug tracking-tight text-bx-white">
                      {activeItem.title}
                    </h2>
                    <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-accent">
                      {activeItem.client} · {activeItem.year}
                    </p>
                  </div>
                  <p className="mt-3 font-mono text-[11px] leading-relaxed tracking-tight text-bx-white/75">
                    {`// `}{activeItem.location}
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between bg-bx-white p-5 text-sm text-bx-black sm:col-span-2">
                <div>
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                    [ {isKo ? "캠페인 개요" : "Campaign Overview"} ]
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-bx-black">
                    {activeItem.description}
                  </p>
                </div>
                <div className="mt-4 border-2 border-bx-accent bg-bx-off px-3 py-3 text-[11px] text-bx-black">
                  {isKo ? (
                    <>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ INTERESTED? ]
                      </p>
                      <p className="mt-2 font-bold">
                        비슷한 캠페인을 진행하고 싶으신가요?
                      </p>
                      <p className="mt-1 font-mono leading-relaxed tracking-tight text-bx-gray-dim">
                        {`// `}견적 문의나 자세한 성과 데이터가 필요하시면 상단
                        &quot;문의&quot; 또는 &quot;견적&quot; 메뉴를 통해 연락 주세요.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-accent">
                        [ INTERESTED? ]
                      </p>
                      <p className="mt-2 font-bold">
                        Interested in a similar campaign?
                      </p>
                      <p className="mt-1 font-mono leading-relaxed tracking-tight text-bx-gray-dim">
                        {`// `}Contact us via the Inquiry or Quote menu for detailed
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
