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
import { TrendingUp, Eye, Users, Quote, ArrowRight } from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "@/i18n/navigation";

const caseStudies = [
  {
    id: 1,
    title: "글로벌 뷰티 브랜드 강남 캠페인",
    titleEn: "Global Beauty Brand Gangnam Campaign",
    description: "강남역 일대 빌보드 10면을 활용한 동시 노출 캠페인으로 브랜드 인지도 300% 상승을 달성했습니다.",
    descriptionEn: "Achieved 300% brand awareness increase through simultaneous exposure campaign using 10 billboards around Gangnam Station.",
    category: "billboard",
    client: "글로벌 뷰티 그룹",
    results: "브랜드 인지도 300% 상승",
    exposures: "450만",
    exposuresEn: "4.5M",
    reachIncrease: "+300%",
    testimonial: "싱커드의 검증 데이터 덕분에 확신을 갖고 캠페인을 진행할 수 있었습니다. 결과가 기대 이상이었습니다.",
    testimonialEn: "THINKAD's verified data gave us the confidence to run the campaign. The results exceeded our expectations.",
    testimonialAuthor: "김서연 마케팅 이사",
    testimonialAuthorEn: "Seoyeon Kim, Marketing Director",
  },
  {
    id: 2,
    title: "테크 스타트업 코엑스 런칭",
    titleEn: "Tech Startup COEX Launch Campaign",
    description: "코엑스 디지털 사이니지를 활용한 신제품 런칭 캠페인으로 2주간 150만 노출을 달성했습니다.",
    descriptionEn: "Achieved 1.5 million exposures in 2 weeks through new product launch campaign using COEX digital signage.",
    category: "digital",
    client: "AI 스타트업",
    results: "2주간 150만 노출",
    exposures: "150만",
    exposuresEn: "1.5M",
    reachIncrease: "+180%",
    testimonial: "예산이 한정적이었는데 데이터 기반으로 최적의 매체를 추천받아 놀라운 ROI를 달성했습니다.",
    testimonialEn: "Despite a limited budget, the data-driven media recommendations delivered an amazing ROI.",
    testimonialAuthor: "박준혁 대표",
    testimonialAuthorEn: "Junhyuk Park, CEO",
  },
  {
    id: 3,
    title: "엔터테인먼트 지하철 광고",
    titleEn: "Entertainment Subway Campaign",
    description: "서울 지하철 주요 7개 역사 랩핑 광고로 앨범 초동 판매 200% 증가를 이끌었습니다.",
    descriptionEn: "Led to 200% increase in first-week album sales through wrapping ads at 7 major Seoul subway stations.",
    category: "transport",
    client: "대형 엔터테인먼트사",
    results: "초동 판매 200% 증가",
    exposures: "680만",
    exposuresEn: "6.8M",
    reachIncrease: "+250%",
    testimonial: "역사별 유동인구 데이터 분석이 정말 정확했어요. 다음 캠페인도 싱커드와 함께합니다.",
    testimonialEn: "The foot traffic analysis per station was incredibly accurate. We'll definitely use THINKAD again.",
    testimonialAuthor: "이하은 팀장",
    testimonialAuthorEn: "Haeun Lee, Team Lead",
  },
  {
    id: 4,
    title: "식음료 브랜드 전국 버스 캠페인",
    titleEn: "F&B Brand National Bus Campaign",
    description: "전국 주요 도시 시내버스 500대를 활용한 신제품 런칭 캠페인으로 매출 40% 증가를 달성했습니다.",
    descriptionEn: "Achieved 40% sales increase through new product launch campaign using 500 city buses across major cities.",
    category: "transport",
    client: "국내 식음료 대기업",
    results: "매출 40% 증가",
    exposures: "1,200만",
    exposuresEn: "12M",
    reachIncrease: "+320%",
    testimonial: "전국 단위 캠페인을 원스톱으로 관리해주셔서 내부 리소스를 크게 절약할 수 있었습니다.",
    testimonialEn: "Managing a national campaign in one stop saved significant internal resources for us.",
    testimonialAuthor: "최민수 브랜드 매니저",
    testimonialAuthorEn: "Minsu Choi, Brand Manager",
  },
  {
    id: 5,
    title: "금융사 여의도 디지털 OOH",
    titleEn: "Financial Corp Yeouido Digital OOH",
    description: "여의도 금융 중심가 디지털 사이니지를 활용한 기업 브랜딩 캠페인으로 투자자 문의 250% 증가를 이끌었습니다.",
    descriptionEn: "Led to 250% increase in investor inquiries through corporate branding campaign using digital signage in Yeouido financial district.",
    category: "digital",
    client: "대형 증권사",
    results: "투자자 문의 250% 증가",
    exposures: "320만",
    exposuresEn: "3.2M",
    reachIncrease: "+250%",
    testimonial: "금융 타겟에 맞는 정밀한 매체 선정이 인상적이었습니다. 문의량이 극적으로 증가했습니다.",
    testimonialEn: "The precise media selection targeting the financial audience was impressive. Inquiries increased dramatically.",
    testimonialAuthor: "정우성 CMO",
    testimonialAuthorEn: "Wooseong Jung, CMO",
  },
  {
    id: 6,
    title: "뷰티 브랜드 명동 전광판",
    titleEn: "Beauty Brand Myeongdong LED",
    description: "명동 중심가 대형 전광판을 활용한 크로스보더 캠페인으로 해외 관광객 유입 180% 증가를 달성했습니다.",
    descriptionEn: "Achieved 180% increase in foreign tourist visits through cross-border campaign using Myeongdong central LED.",
    category: "digital",
    client: "K-뷰티 브랜드",
    results: "관광객 유입 180% 증가",
    exposures: "520만",
    exposuresEn: "5.2M",
    reachIncrease: "+180%",
    testimonial: "해외 관광객 타겟팅에 대한 데이터 분석이 탁월했습니다. 크로스보더 캠페인의 새로운 기준을 제시했어요.",
    testimonialEn: "Exceptional data analysis for foreign tourist targeting. It set a new standard for cross-border campaigns.",
    testimonialAuthor: "한소희 해외사업부장",
    testimonialAuthorEn: "Sohee Han, International Division Head",
  },
  {
    id: 7,
    title: "테크 기업 해운대 빌보드",
    titleEn: "Tech Company Haeundae Billboard",
    description: "해운대 해변 빌보드를 활용한 여름 시즌 캠페인으로 앱 다운로드 120% 증가를 이끌었습니다.",
    descriptionEn: "Led to 120% increase in app downloads through summer season campaign using Haeundae beach billboard.",
    category: "billboard",
    client: "모바일 플랫폼",
    results: "앱 다운로드 120% 증가",
    exposures: "280만",
    exposuresEn: "2.8M",
    reachIncrease: "+120%",
    testimonial: "시즌 특성에 맞는 매체 전략 제안이 정확했습니다. 여름 시즌 KPI를 초과 달성했어요.",
    testimonialEn: "The seasonal media strategy was spot-on. We exceeded our summer season KPI targets.",
    testimonialAuthor: "강지호 그로스팀장",
    testimonialAuthorEn: "Jiho Kang, Growth Team Lead",
  },
  {
    id: 8,
    title: "엔터 기업 제주 관광 캠페인",
    titleEn: "Entertainment Jeju Tourism Campaign",
    description: "제주공항 및 관광단지 디지털 광고를 통한 콘서트 홍보 캠페인으로 티켓 판매 완판을 달성했습니다.",
    descriptionEn: "Achieved sold-out ticket sales through concert promotion campaign via Jeju airport and resort digital ads.",
    category: "special",
    client: "공연 기획사",
    results: "티켓 전석 완판",
    exposures: "190만",
    exposuresEn: "1.9M",
    reachIncrease: "+200%",
    testimonial: "공항과 관광단지를 연결한 캠페인 설계가 완벽했습니다. 완판이라는 최고의 결과를 만들어줬어요.",
    testimonialEn: "The campaign design connecting the airport and tourist areas was perfect. It delivered the ultimate result: sold out.",
    testimonialAuthor: "오지영 프로듀서",
    testimonialAuthorEn: "Jiyoung Oh, Producer",
  },
];

const categoryColors: Record<string, string> = {
  billboard: "bg-blue-50 text-blue-700",
  digital: "bg-purple-50 text-purple-700",
  transport: "bg-orange-50 text-orange-700",
  special: "bg-emerald-50 text-emerald-700",
};

export default function CasesPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [activeCategory, setActiveCategory] = useState("all");

  const categories = [
    { value: "all", label: t("cases.all") },
    { value: "billboard", label: t("cases.billboard") },
    { value: "digital", label: t("cases.digital") },
    { value: "transport", label: t("cases.transport") },
    { value: "special", label: t("cases.special") },
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
                className="group overflow-hidden border-0 shadow-md transition-all hover:shadow-xl hover:-translate-y-1"
              >
                <div className="flex h-48 items-center justify-center bg-gradient-to-br from-gold/10 to-navy/10 overflow-hidden">
                  <TrendingUp className="h-12 w-12 text-gold/40 transition-transform group-hover:scale-110" />
                </div>
                <CardHeader className="pb-3">
                  <Badge
                    className={`w-fit text-xs ${categoryColors[cs.category] || ""}`}
                  >
                    {categories.find((c) => c.value === cs.category)?.label}
                  </Badge>
                  <CardTitle className="text-base">
                    {isKo ? cs.title : cs.titleEn}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CardDescription className="text-sm leading-relaxed">
                    {isKo ? cs.description : cs.descriptionEn}
                  </CardDescription>

                  <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Eye className="h-3 w-3" />
                        {isKo ? "노출수" : "Exposures"}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-navy">
                        {isKo ? cs.exposures : cs.exposuresEn}
                      </div>
                    </div>
                    <div className="text-center border-x border-slate-200">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {isKo ? "도달률" : "Reach"}
                      </div>
                      <div className="mt-0.5 text-sm font-bold text-emerald-600">
                        {cs.reachIncrease}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
                        <TrendingUp className="h-3 w-3" />
                        {isKo ? "성과" : "Result"}
                      </div>
                      <div className="mt-0.5 text-xs font-bold text-gold-dark">
                        {cs.results}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl bg-navy/[0.03] p-3">
                    <Quote className="mb-1 h-4 w-4 text-gold/30" />
                    <p className="text-xs leading-relaxed text-navy/70 italic">
                      &ldquo;{isKo ? cs.testimonial : cs.testimonialEn}&rdquo;
                    </p>
                    <p className="mt-2 text-[11px] font-semibold text-navy/50">
                      — {isKo ? cs.testimonialAuthor : cs.testimonialAuthorEn}
                    </p>
                  </div>

                  <Link href="/contact">
                    <Button
                      size="sm"
                      className="w-full bg-gold text-navy text-xs font-bold hover:bg-gold-dark mt-1"
                    >
                      {isKo ? "비슷한 캠페인 문의하기" : "Inquire About Similar Campaign"}
                      <ArrowRight className="ml-1 h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
