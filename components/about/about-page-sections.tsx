import { Link } from "@/i18n/navigation";
import {
  categoryHeroCtaPrimaryClass,
  categoryHeroCtaSecondaryClass,
  CategoryHeroCtaRow,
} from "@/components/category-explore-hero";
import {
  AboutBrandTimeline,
  ABOUT_TIMELINE_ICONS,
  type AboutTimelineItem,
} from "@/components/about/about-brand-timeline";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = { isKo: boolean };

export function AboutPageSections({ isKo }: Props) {
  const storyParagraphs = isKo
    ? [
        "옥외광고를 하려면 수십 개 대행사에 전화해야 했습니다.\n단가는 물어봐야 알 수 있었고,\n같은 매체도 대행사마다 가격이 달랐습니다.",
        "싱커드는 2014년, 이 구조를 바꾸기로 했습니다.\n국내 최초로 OOH 매체 단가를 투명하게 공개하고\n쇼핑몰처럼 검색하고 비교할 수 있는 플랫폼을 만들었습니다.",
        "그 이후 수많은 회사들이 싱커드를 벤치마킹했고\n지금은 많은 광고주·대행사·매체사가\n싱커드를 업계 표준으로 인정합니다.",
      ]
    : [
        "Planning OOH meant calling dozens of agencies.\nRates were hidden until you asked,\nand the same media cost different prices by vendor.",
        "In 2014, THINKAD set out to change that.\nWe were the first in Korea to publish OOH media rates openly\nand built a platform to search and compare media like a store.",
        "Many companies benchmarked THINKAD afterward.\nToday advertisers, agencies, and media owners\nrecognize us as an industry standard.",
      ];

  const timelineItems: AboutTimelineItem[] = isKo
    ? [
        {
          year: "2014",
          icon: ABOUT_TIMELINE_ICONS.lightbulb,
          title: "국내 최초 OOH 단가 투명화",
          description: "매체별 단가를 온라인에 공개. 업계 최초",
        },
        {
          year: "2017",
          icon: ABOUT_TIMELINE_ICONS.shoppingBag,
          title: "쇼핑몰형 매체 검색 플랫폼",
          description: "카테고리별 매체 분류, 견적 원스톱 처리",
        },
        {
          year: "2022",
          icon: ABOUT_TIMELINE_ICONS.users,
          title: "미디어렙 공식 인정",
          description: "광고주·대행사·매체사 모두 레퍼런스로 활용",
        },
        {
          year: "2026",
          icon: ABOUT_TIMELINE_ICONS.sparkles,
          title: "AI 플랫폼으로 진화",
          description: "AI 플래너·전자계약·통합 분석 플랫폼 출시",
          current: true,
        },
      ]
    : [
        {
          year: "2014",
          icon: ABOUT_TIMELINE_ICONS.lightbulb,
          title: "First transparent OOH rates in Korea",
          description: "Published per-media pricing online — an industry first",
        },
        {
          year: "2017",
          icon: ABOUT_TIMELINE_ICONS.shoppingBag,
          title: "Store-style media search",
          description: "Category browsing and one-stop quoting",
        },
        {
          year: "2022",
          icon: ABOUT_TIMELINE_ICONS.users,
          title: "Recognized media rep",
          description: "Referenced by advertisers, agencies, and media owners",
        },
        {
          year: "2026",
          icon: ABOUT_TIMELINE_ICONS.sparkles,
          title: "Evolved into an AI platform",
          description: "AI planner, e-contracts, and unified analytics",
          current: true,
        },
      ];

  const diffCards = isKo
    ? [
        {
          icon: "🏆",
          title: "검증된 데이터",
          body: "추정이 아닌 실제 집행 데이터\n현장 검증 500+ 매체\n10년간 쌓인 실거래 단가",
        },
        {
          icon: "🤖",
          title: "AI + 전문가",
          body: "AI가 빠르게 찾고\n전문가가 정확하게 확인\n입찰·단가·현장까지 책임",
        },
        {
          icon: "🔗",
          title: "원스톱 집행",
          body: "검색 → 기획 → 견적 → 계약\n한 플랫폼에서 끝\n업계 유일 전자계약 시스템",
        },
      ]
    : [
        {
          icon: "🏆",
          title: "Verified data",
          body: "Real execution data, not estimates\n500+ field-verified media\nA decade of transaction pricing",
        },
        {
          icon: "🤖",
          title: "AI + experts",
          body: "AI finds options fast\nExperts validate accuracy\nAccountability through bidding and field ops",
        },
        {
          icon: "🔗",
          title: "One-stop execution",
          body: "Search → plan → quote → contract\nAll on one platform\nIndustry-only e-contract system",
        },
      ];

  const companyLeft = isKo
    ? [
        ["상호", "주식회사 싱커드"],
        ["대표", "이재한"],
        ["사업자번호", "319-86-00382"],
        ["통신판매업", "2017-서울성동-0681"],
        [
          "주소",
          "서울특별시 성동구 뚝섬로17가길 48\n성수에이원지식산업센터 1102호",
        ],
      ]
    : [
        ["Company", "THINKAD Co., Ltd."],
        ["CEO", "Jaehan Lee"],
        ["Business ID", "319-86-00382"],
        ["E-commerce reg.", "2017-Seoul Seongdong-0681"],
        [
          "Address",
          "1102, Seongsu A1 Knowledge Industry Center\n48, Ttukseom-ro 17ga-gil, Seongdong-gu, Seoul",
        ],
      ];

  const companyRight = isKo
    ? [
        ["전화", "02-515-2772"],
        ["이메일", "sales@tkad.co.kr"],
        ["운영시간", "평일 09:00 ~ 18:00\n(토·일·공휴일 휴무)"],
      ]
    : [
        ["Phone", "02-515-2772"],
        ["Email", "sales@tkad.co.kr"],
        ["Hours", "Weekdays 09:00–18:00\n(Closed weekends & holidays)"],
      ];

  return (
    <>
      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
            {isKo ? "수십 군데 전화하던 시대를 바꿨습니다" : "We changed the era of dozens of phone calls"}
          </h2>
          <div className="mx-auto max-w-2xl space-y-6 text-center text-base leading-relaxed text-gray-600 md:text-lg dark:text-white/70">
            {storyParagraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 24)} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </div>
      </section>

      <AboutBrandTimeline
        title={isKo ? "싱커드의 역사" : "THINKAD history"}
        items={timelineItems}
        currentLabel={isKo ? "현재" : "Now"}
      />

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
            {isKo ? "싱커드가 다른 이유" : "Why THINKAD is different"}
          </h2>
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {diffCards.map((card) => (
              <div
                key={card.title}
                className="rounded-2xl bg-white p-6 dark:bg-white/5"
              >
                <p className="mb-4 text-4xl" aria-hidden>
                  {card.icon}
                </p>
                <h3 className="mb-3 text-lg font-bold text-gray-900 dark:text-white">
                  {card.title}
                </h3>
                <p className="whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-white/60">
                  {card.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="mx-auto max-w-4xl px-4">
          <h2 className="mb-10 text-center text-2xl font-bold text-gray-900 dark:text-white md:text-3xl">
            {isKo ? "회사 정보" : "Company information"}
          </h2>
          <div className="grid gap-10 md:grid-cols-2">
            <dl className="space-y-4">
              {companyLeft.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-white/80">
                    {value}
                  </dd>
                </div>
              ))}
            </dl>
            <dl className="space-y-4">
              {companyRight.map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-white/45">
                    {label}
                  </dt>
                  <dd className="mt-1 whitespace-pre-line text-sm leading-relaxed text-gray-800 dark:text-white/80">
                    {label === (isKo ? "이메일" : "Email") ? (
                      <a
                        href="mailto:sales@tkad.co.kr"
                        className="text-violet-600 hover:underline dark:text-violet-400"
                      >
                        {value}
                      </a>
                    ) : (
                      value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="pb-16 md:pb-24">
        <div className="mx-auto max-w-4xl px-4">
          <div className="rounded-2xl bg-gradient-to-r from-violet-600 to-cyan-500 p-10 text-center">
            <h2 className="text-2xl font-bold text-white md:text-3xl">
              {isKo ? "지금 싱커드와 함께 시작하세요" : "Start with THINKAD today"}
            </h2>
            <p className="mx-auto mt-4 max-w-lg whitespace-pre-line text-sm leading-relaxed text-white/90 md:text-base">
              {isKo
                ? "500+ 검증 매체를 직접 검색하고\nAI 플래너로 3분 만에 캠페인을 설계하세요"
                : "Browse 500+ verified media\nand plan a campaign in 3 minutes with AI planner"}
            </p>
            <CategoryHeroCtaRow className="mt-8 justify-center">
              <Link
                href="/media"
                className={cn(
                  categoryHeroCtaPrimaryClass,
                  "border-0 bg-white text-violet-700 hover:bg-white/95",
                )}
              >
                {isKo ? "매체 탐색하기" : "Explore media"}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
              <Link
                href="/contact"
                className={cn(
                  categoryHeroCtaSecondaryClass,
                  "border-white/30 bg-white/10 text-white hover:bg-white/20",
                )}
              >
                {isKo ? "무료 상담 신청" : "Free consultation"}
              </Link>
            </CategoryHeroCtaRow>
          </div>
        </div>
      </section>
    </>
  );
}
