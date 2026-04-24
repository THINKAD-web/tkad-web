"use client";

import { useLocale } from "next-intl";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type FaqCategory = "ad" | "process" | "cost" | "other";

type FaqItem = {
  id: string;
  category: FaqCategory;
  questionKo: string;
  questionEn: string;
  answerKo: string;
  answerEn: string;
};

const FAQ_ITEMS: FaqItem[] = [
  {
    id: "1",
    category: "ad",
    questionKo: "옥외광고는 어떤 종류가 있나요?",
    questionEn: "What types of outdoor advertising are available?",
    answerKo:
      "빌보드, 디지털 사이니지, 지하철 광고, 버스 광고, 전광판 등 다양한 종류가 있습니다. 싱커드는 전국 500개 이상의 검증된 매체를 보유하고 있어 캠페인 목표에 맞는 최적의 매체를 추천해 드립니다.",
    answerEn:
      "We offer billboards, digital signage, subway ads, bus ads, LED displays, and more. THINKAD has 500+ verified media nationwide and recommends the best media for your campaign goals.",
  },
  {
    id: "2",
    category: "ad",
    questionKo: "전국 단위 OOH 캠페인도 가능한가요?",
    questionEn: "Do you handle nationwide OOH campaigns across Korea?",
    answerKo:
      "네, 가능합니다. 싱커드는 서울·수도권은 물론, 광역시와 주요 관광지를 아우르는 국내 OOH 미디어랩으로 전국 단위 캠페인을 기획·운영합니다.",
    answerEn:
      "Yes. As a Korean OOH media lab, THINKAD plans and operates nationwide campaigns across Seoul, the capital area, major cities, and key tourist destinations in Korea.",
  },
  {
    id: "3",
    category: "ad",
    questionKo: "광고 효과는 어떻게 측정하나요?",
    questionEn: "How do you measure advertising effectiveness?",
    answerKo:
      "유동인구 분석, 노출도 측정, 브랜드 인지도 조사, QR코드 트래킹 등 다양한 방법으로 캠페인 효과를 측정합니다. 캠페인 종료 후 상세 리포트를 제공합니다.",
    answerEn:
      "We measure campaign effectiveness through foot traffic analysis, exposure measurement, brand awareness surveys, QR code tracking, and more. Detailed reports are provided after campaign completion.",
  },
  {
    id: "4",
    category: "process",
    questionKo: "광고 진행 절차는 어떻게 되나요?",
    questionEn: "What is the advertising process?",
    answerKo:
      "1) 초기 상담 및 니즈 파악 → 2) 매체 추천 및 캠페인 전략 수립 → 3) 견적 및 계약 → 4) 크리에이티브 제작 → 5) 매체 설치 및 집행 → 6) 모니터링 및 리포팅 순서로 진행됩니다.",
    answerEn:
      "The process includes: 1) Initial consultation → 2) Media recommendation & strategy → 3) Quote & contract → 4) Creative production → 5) Media installation & execution → 6) Monitoring & reporting.",
  },
  {
    id: "5",
    category: "process",
    questionKo: "상담부터 광고 집행까지 얼마나 걸리나요?",
    questionEn: "How long does it take from consultation to execution?",
    answerKo:
      "일반적으로 2~4주 정도 소요됩니다. 긴급 캠페인의 경우 1주일 내 진행도 가능하며, 대규모 전국 캠페인은 4~6주를 권장합니다.",
    answerEn:
      "Typically 2-4 weeks. For urgent campaigns, 1-week turnaround is possible. For large-scale national campaigns, 4-6 weeks is recommended.",
  },
  {
    id: "6",
    category: "process",
    questionKo: "크리에이티브 제작도 해주시나요?",
    questionEn: "Do you handle creative production?",
    answerKo:
      "네, 전문 디자인팀이 매체 규격에 맞는 크리에이티브를 제작해 드립니다. 기존 소재 활용도 가능하며, 디지털 매체의 경우 동영상 제작도 지원합니다.",
    answerEn:
      "Yes, our professional design team creates creatives tailored to media specifications. You can also use existing materials, and we support video production for digital media.",
  },
  {
    id: "7",
    category: "cost",
    questionKo: "광고 비용은 얼마인가요?",
    questionEn: "How much does advertising cost?",
    answerKo:
      "매체 종류, 위치, 크기, 기간에 따라 비용이 다릅니다. 월 500만원부터 대형 전광판 월 수천만원까지 다양합니다. 정확한 비용은 무료 상담을 통해 안내받으실 수 있습니다.",
    answerEn:
      "Costs vary by media type, location, size, and duration, ranging from ₩5M/month to tens of millions for large LED displays. Contact us for a free consultation for accurate pricing.",
  },
  {
    id: "8",
    category: "cost",
    questionKo: "최소 광고 기간이 있나요?",
    questionEn: "Is there a minimum advertising period?",
    answerKo:
      "매체에 따라 다르지만, 대부분 최소 1개월부터 가능합니다. 디지털 매체는 1~2주 단기 캠페인도 가능합니다. 장기 계약 시 할인 혜택이 있습니다.",
    answerEn:
      "It varies by media, but most allow a minimum of 1 month. Digital media can run 1-2 week short campaigns. Long-term contracts receive discount benefits.",
  },
  {
    id: "9",
    category: "cost",
    questionKo: "결제 방법은 어떻게 되나요?",
    questionEn: "What payment methods are available?",
    answerKo:
      "세금계산서 발행 기반의 계좌이체가 기본이며, 법인카드 결제도 가능합니다. 캠페인 규모에 따라 분할 납부도 협의 가능합니다.",
    answerEn:
      "Bank transfer with tax invoice is standard, and corporate card payment is also available. Installment payments can be arranged for larger campaigns.",
  },
  {
    id: "10",
    category: "other",
    questionKo: "싱커드만의 차별점은 무엇인가요?",
    questionEn: "What makes THINKAD different?",
    answerKo:
      "모든 매체를 직접 현장 방문하여 검증하고, 1년 이상 축적된 효과 데이터를 기반으로 매체를 추천합니다. 계약부터 사후관리까지 원스톱 서비스를 제공하며, 데이터 기반의 투명한 리포팅을 보장합니다.",
    answerEn:
      "We personally visit and verify every media site, recommend media based on 1+ years of performance data, provide one-stop service from contract to post-care, and guarantee transparent data-driven reporting.",
  },
  {
    id: "11",
    category: "other",
    questionKo: "소규모 예산으로도 광고가 가능한가요?",
    questionEn: "Can I advertise with a small budget?",
    answerKo:
      "네, 예산에 맞는 최적의 매체 조합을 추천해 드립니다. 디지털 사이니지나 지역 빌보드 등 비용 효율적인 매체를 활용하면 소규모 예산으로도 효과적인 캠페인을 진행할 수 있습니다.",
    answerEn:
      "Yes, we recommend optimal media mixes within your budget. Using cost-effective media like digital signage or local billboards, you can run effective campaigns even with a small budget.",
  },
  {
    id: "12",
    category: "other",
    questionKo: "이전 캠페인 사례를 볼 수 있나요?",
    questionEn: "Can I see previous campaign examples?",
    answerKo:
      "네, 웹사이트의 '성공 사례' 페이지에서 다양한 업종의 캠페인 성과를 확인하실 수 있습니다. 더 자세한 사례는 무료 상담 시 맞춤형으로 안내해 드립니다.",
    answerEn:
      "Yes, you can view campaign results from various industries on our Case Studies page. More detailed examples can be provided during a free consultation.",
  },
];

const CATEGORY_BADGE: Record<
  FaqCategory,
  { ko: string; en: string; className: string }
> = {
  ad: {
    ko: "광고문의",
    en: "Advertising",
    className: "border-gold/30 bg-gold/10 text-navy",
  },
  process: {
    ko: "진행절차",
    en: "Process",
    className: "border-navy/15 bg-navy/5 text-navy",
  },
  cost: {
    ko: "비용",
    en: "Cost",
    className: "border-emerald-200 bg-emerald-50 text-emerald-900",
  },
  other: {
    ko: "기타",
    en: "Other",
    className: "border-slate-200 bg-slate-50 text-slate-800",
  },
};

export default function FaqPage() {
  const locale = useLocale();
  const isKo = locale === "ko";
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({});

  const categories = [
    { value: "all", label: isKo ? "전체" : "All" },
    { value: "ad", label: isKo ? "광고문의" : "Advertising Inquiry" },
    { value: "process", label: isKo ? "진행절차" : "Process" },
    { value: "cost", label: isKo ? "비용" : "Cost" },
    { value: "other", label: isKo ? "기타" : "Other" },
  ];

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return FAQ_ITEMS.filter((item) => {
      const catOk =
        activeCategory === "all" || item.category === activeCategory;
      if (!catOk) return false;
      if (!needle) return true;
      const q = isKo ? item.questionKo : item.questionEn;
      const a = isKo ? item.answerKo : item.answerEn;
      return `${q} ${a}`.toLowerCase().includes(needle);
    });
  }, [search, activeCategory, isKo]);

  const toggle = (id: string) => {
    setOpenIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <>
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {isKo ? "자주 묻는 질문" : "FAQ"}
          </h1>
          <p className="mt-2 text-slate-300">
            {isKo
              ? "THINKAD 서비스에 대해 자주 묻는 질문을 모았습니다."
              : "Answers to common questions about THINKAD services."}
          </p>
        </div>
      </section>

      <section className="border-b border-navy/10 bg-white py-10">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-navy/40"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                isKo ? "질문 또는 답변 검색…" : "Search questions or answers…"
              }
              className="h-11 border-navy/15 bg-slate-50/80 pl-10 pr-4 text-navy placeholder:text-navy/40 focus-visible:border-gold/50 focus-visible:ring-gold/20"
              aria-label={isKo ? "FAQ 검색" : "Search FAQ"}
            />
          </div>
        </div>
      </section>

      <section className="py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <Button
                  key={cat.value}
                  variant={
                    activeCategory === cat.value ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setActiveCategory(cat.value)}
                  className={
                    activeCategory === cat.value
                      ? "bg-navy text-white"
                      : "border-navy/20 text-navy"
                  }
                >
                  {cat.label}
                </Button>
              ))}
            </div>
            <p className="text-sm font-medium text-navy/60">
              {isKo
                ? `${filtered.length}개의 결과`
                : `${filtered.length} results`}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="rounded-xl border border-dashed border-navy/15 bg-slate-50/80 px-6 py-28 text-center">
              <p className="text-navy/70">
                {isKo
                  ? "검색 조건에 맞는 질문이 없습니다. 다른 키워드나 카테고리를 시도해 보세요."
                  : "No questions match your search. Try a different keyword or category."}
              </p>
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((item) => {
                const open = !!openIds[item.id];
                const badge = CATEGORY_BADGE[item.category];
                return (
                  <li
                    key={item.id}
                    className="overflow-hidden rounded-xl border border-navy/10 bg-white shadow-sm transition-shadow hover:shadow-md"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(item.id)}
                      aria-expanded={open}
                      className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-slate-50/80 md:gap-4 md:p-5"
                    >
                      {/* Q 마커 */}
                      <span
                        aria-hidden
                        className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gold/12 text-[11px] font-extrabold tracking-wide text-gold-dark ring-1 ring-gold/25"
                      >
                        Q
                      </span>
                      <span className="min-w-0 flex-1 space-y-2">
                        <Badge
                          variant="outline"
                          className={cn("text-[11px]", badge.className)}
                        >
                          {isKo ? badge.ko : badge.en}
                        </Badge>
                        <span className="block font-bold text-navy leading-snug">
                          {isKo ? item.questionKo : item.questionEn}
                        </span>
                      </span>
                      <ChevronDown
                        className={cn(
                          "mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-300",
                          open && "rotate-180"
                        )}
                        aria-hidden
                      />
                    </button>
                    <div
                      className={cn(
                        "grid transition-[grid-template-rows] duration-300 ease-out",
                        open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                      )}
                    >
                      <div className="min-h-0 overflow-hidden">
                        <div className="flex items-start gap-3 border-t border-navy/5 px-4 pb-5 pt-4 md:gap-4 md:px-5">
                          {/* A 마커 */}
                          <span
                            aria-hidden
                            className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-extrabold text-white"
                          >
                            A
                          </span>
                          <p className="min-w-0 flex-1 text-sm leading-relaxed text-navy/80">
                            {isKo ? item.answerKo : item.answerEn}
                          </p>
                        </div>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
