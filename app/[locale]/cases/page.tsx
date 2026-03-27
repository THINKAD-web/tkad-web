"use client";

import { useTranslations, useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { useState, useMemo } from "react";

const caseStudies = [
  {
    id: 1,
    title: "글로벌 뷰티 브랜드 강남 캠페인",
    titleEn: "Global Beauty Brand Gangnam Campaign",
    description: "강남역 일대 빌보드 10면을 활용한 동시 노출 캠페인으로 브랜드 인지도 300% 상승을 달성했습니다.",
    descriptionEn: "Achieved 300% brand awareness increase through simultaneous exposure campaign using 10 billboards around Gangnam Station.",
    category: "beauty",
    client: "글로벌 뷰티 그룹",
    results: "브랜드 인지도 300% 상승",
  },
  {
    id: 2,
    title: "테크 스타트업 코엑스 런칭",
    titleEn: "Tech Startup COEX Launch Campaign",
    description: "코엑스 디지털 사이니지를 활용한 신제품 런칭 캠페인으로 2주간 150만 노출을 달성했습니다.",
    descriptionEn: "Achieved 1.5 million exposures in 2 weeks through new product launch campaign using COEX digital signage.",
    category: "tech",
    client: "AI 스타트업",
    results: "2주간 150만 노출",
  },
  {
    id: 3,
    title: "엔터테인먼트 지하철 광고",
    titleEn: "Entertainment Subway Campaign",
    description: "서울 지하철 주요 7개 역사 랩핑 광고로 앨범 초동 판매 200% 증가를 이끌었습니다.",
    descriptionEn: "Led to 200% increase in first-week album sales through wrapping ads at 7 major Seoul subway stations.",
    category: "entertainment",
    client: "대형 엔터테인먼트사",
    results: "초동 판매 200% 증가",
  },
  {
    id: 4,
    title: "식음료 브랜드 전국 버스 캠페인",
    titleEn: "F&B Brand National Bus Campaign",
    description: "전국 주요 도시 시내버스 500대를 활용한 신제품 런칭 캠페인으로 매출 40% 증가를 달성했습니다.",
    descriptionEn: "Achieved 40% sales increase through new product launch campaign using 500 city buses across major cities.",
    category: "food",
    client: "국내 식음료 대기업",
    results: "매출 40% 증가",
  },
  {
    id: 5,
    title: "금융사 여의도 디지털 OOH",
    titleEn: "Financial Corp Yeouido Digital OOH",
    description: "여의도 금융 중심가 디지털 사이니지를 활용한 기업 브랜딩 캠페인으로 투자자 문의 250% 증가를 이끌었습니다.",
    descriptionEn: "Led to 250% increase in investor inquiries through corporate branding campaign using digital signage in Yeouido financial district.",
    category: "finance",
    client: "대형 증권사",
    results: "투자자 문의 250% 증가",
  },
  {
    id: 6,
    title: "뷰티 브랜드 명동 전광판",
    titleEn: "Beauty Brand Myeongdong LED",
    description: "명동 중심가 대형 전광판을 활용한 크로스보더 캠페인으로 해외 관광객 유입 180% 증가를 달성했습니다.",
    descriptionEn: "Achieved 180% increase in foreign tourist visits through cross-border campaign using Myeongdong central LED.",
    category: "beauty",
    client: "K-뷰티 브랜드",
    results: "관광객 유입 180% 증가",
  },
  {
    id: 7,
    title: "테크 기업 해운대 빌보드",
    titleEn: "Tech Company Haeundae Billboard",
    description: "해운대 해변 빌보드를 활용한 여름 시즌 캠페인으로 앱 다운로드 120% 증가를 이끌었습니다.",
    descriptionEn: "Led to 120% increase in app downloads through summer season campaign using Haeundae beach billboard.",
    category: "tech",
    client: "모바일 플랫폼",
    results: "앱 다운로드 120% 증가",
  },
  {
    id: 8,
    title: "엔터 기업 제주 관광 캠페인",
    titleEn: "Entertainment Jeju Tourism Campaign",
    description: "제주공항 및 관광단지 디지털 광고를 통한 콘서트 홍보 캠페인으로 티켓 판매 완판을 달성했습니다.",
    descriptionEn: "Achieved sold-out ticket sales through concert promotion campaign via Jeju airport and resort digital ads.",
    category: "entertainment",
    client: "공연 기획사",
    results: "티켓 전석 완판",
  },
];

const categoryColors: Record<string, string> = {
  beauty: "bg-pink-50 text-pink-700",
  tech: "bg-blue-50 text-blue-700",
  entertainment: "bg-purple-50 text-purple-700",
  food: "bg-orange-50 text-orange-700",
  finance: "bg-emerald-50 text-emerald-700",
};

export default function CasesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { value: "all", label: t("cases.all") },
    { value: "beauty", label: t("cases.beauty") },
    { value: "tech", label: t("cases.tech") },
    { value: "entertainment", label: t("cases.entertainment") },
    { value: "food", label: t("cases.food") },
    { value: "finance", label: t("cases.finance") },
  ];

  const filtered = useMemo(
    () =>
      activeCategory === "all"
        ? caseStudies
        : caseStudies.filter((c) => c.category === activeCategory),
    [activeCategory]
  );

  return (
    <>
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("cases.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("cases.subtitle")}</p>
        </div>
      </section>

      <section className="py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Button
                key={cat.value}
                variant={activeCategory === cat.value ? "default" : "outline"}
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

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((cs) => (
              <Card
                key={cs.id}
                className="overflow-hidden transition-shadow hover:shadow-lg"
              >
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gold/10 to-navy/10">
                  <TrendingUp className="h-12 w-12 text-gold/40" />
                </div>
                <CardHeader>
                  <Badge
                    className={`w-fit text-xs ${categoryColors[cs.category] || ""}`}
                  >
                    {categories.find((c) => c.value === cs.category)?.label}
                  </Badge>
                  <CardTitle className="text-base">
                    {isKo ? cs.title : cs.titleEn}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm leading-relaxed">
                    {isKo ? cs.description : cs.descriptionEn}
                  </CardDescription>
                  {cs.results && (
                    <div className="mt-3 rounded-md bg-gold/5 px-3 py-2 text-sm font-medium text-gold-dark">
                      📈 {cs.results}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
