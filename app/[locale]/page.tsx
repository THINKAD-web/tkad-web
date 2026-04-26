import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  fetchHomeFeaturedMedia,
  fetchHomePopularMedia,
} from "@/lib/public-media-catalog";
import { type MediaItem, getPrimaryMediaImageUrl } from "@/lib/media-data";
import { formatMediaPriceWonWithSymbol } from "@/lib/media-price-format";
import { ArrowRight, ArrowDown, Search, Camera, Database, ClipboardCheck, Eye, BarChart3, FileCheck } from "lucide-react";
import { BtnBlock, SectionHead, MediaCard } from "@/components/brutalist";
import { testimonials } from "@/data/testimonials";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations();
  /** Phase 3 — 브루탈리스트 메인 페이지. 데이터 fetcher 는 그대로. */
  const [featuredCatalog, popularCatalog] = await Promise.all([
    fetchHomeFeaturedMedia(8),
    fetchHomePopularMedia(12),
  ]);

  return (
    <HomeContent
      locale={locale}
      t={t}
      featuredCatalog={featuredCatalog}
      popularCatalog={popularCatalog}
    />
  );
}

function HomeContent({
  locale,
  t,
  featuredCatalog,
  popularCatalog,
}: {
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
  featuredCatalog: MediaItem[];
  popularCatalog: MediaItem[];
}) {
  const isKo = locale === "ko";
  /** TOP 6 — featured 우선, 부족하면 popular 로 채움 (중복 제외) */
  const seen = new Set<string>();
  const top6: MediaItem[] = [];
  for (const m of [...featuredCatalog, ...popularCatalog]) {
    if (top6.length >= 6) break;
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    top6.push(m);
  }

  return (
    <>
      <Hero isKo={isKo} t={t} />
      <Ticker isKo={isKo} />
      <Stats isKo={isKo} />
      <Process isKo={isKo} />
      <Regional isKo={isKo} />
      <MediaTop6 isKo={isKo} items={top6} />
      <CaseStudies isKo={isKo} />
      <WhyUs isKo={isKo} />
      <Testimonials isKo={isKo} />
      <FinalCta isKo={isKo} t={t} />
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (a) HERO
 * 풀-블리드 흰 배경 + 두 칼럼 그리드 (좌: 마스시브 타이틀, 우: 서브 + CTA).
 * 헤더 sticky 와 만나는 상단 보더는 BrutalNav 가 이미 그어줌.
 * ──────────────────────────────────────────────────────────────── */
function Hero({
  isKo,
  t,
}: {
  isKo: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <section className="relative border-b-2 border-bx-black bg-bx-white">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-12">
        <div className="col-span-1 border-bx-black px-6 py-12 sm:px-10 sm:py-16 lg:col-span-8 lg:border-r-2 lg:py-24">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
            <span className="text-bx-black">[00]</span>
            <span className="ml-2">/ Index</span>
            <span className="ml-2">— THINKAD · {new Date().getFullYear()}</span>
          </div>
          <h1 className="mt-6 text-[clamp(2.5rem,7vw,7.5rem)] font-bold leading-[0.92] tracking-[-0.03em] text-bx-black">
            {isKo ? (
              <>
                <span className="block">생각하는</span>
                <span className="block">
                  <span className="bx-invert">광고</span>를
                </span>
                <span className="block">
                  만드는 <span className="bx-accent">싱커드</span>
                </span>
              </>
            ) : (
              <>
                <span className="block">The</span>
                <span className="block">
                  <span className="bx-invert">thinking</span>
                </span>
                <span className="block">
                  ad <span className="bx-accent">agency</span>
                </span>
              </>
            )}
          </h1>
        </div>
        <aside className="col-span-1 flex flex-col justify-between border-t-2 border-bx-black bg-bx-off px-6 py-10 sm:px-10 lg:col-span-4 lg:border-t-0 lg:py-24">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
              // {isKo ? "대한민국 No.1 OOH 광고 에이전시" : "Korea's No.1 OOH agency"}
            </p>
            <p className="mt-4 max-w-md text-base leading-relaxed text-bx-black sm:text-lg">
              {t("hero.subtitle")}
            </p>
          </div>
          <div className="mt-10 flex flex-col gap-3">
            <BtnBlock href="/contact" variant="primary" className="w-full justify-between">
              <span>{isKo ? "무료 상담 신청" : "Free Consultation"}</span>
            </BtnBlock>
            <BtnBlock href="/media" variant="secondary" icon={false} className="w-full justify-between">
              <span>{t("hero.cta")}</span>
              <ArrowDown className="h-4 w-4" />
            </BtnBlock>
          </div>
        </aside>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (a) TICKER
 * 무한 가로 스크롤 마퀴. 광고주를 직접 노출하지 않고 산업군 라벨을 사용.
 * (실제 브랜드명을 마음대로 노출하면 부정경쟁방지법·표시광고법 리스크.)
 * CSS animation 으로 GPU 만 사용. prefers-reduced-motion 시 정지.
 * ──────────────────────────────────────────────────────────────── */
const TICKER_BRANDS = [
  "GLOBAL BEAUTY",
  "TECH / IT",
  "MOBILITY",
  "FOOD & BEVERAGE",
  "FASHION",
  "RETAIL",
  "TELECOM",
  "MEDIA & ENT",
  "FINANCE",
  "PHARMA · HEALTH",
  "EDUCATION",
  "TRAVEL · TOURISM",
  "GAMING",
  "LIFESTYLE",
  "LUXURY",
  "F&B · DELIVERY",
] as const;

function Ticker({ isKo }: { isKo: boolean }) {
  const items = [...TICKER_BRANDS, ...TICKER_BRANDS]; // duplicated for seamless loop
  return (
    <section
      aria-label={isKo ? "집행 산업군 마퀴" : "Industries we serve"}
      className="relative overflow-hidden border-b-2 border-bx-black bg-bx-black"
    >
      <div className="bx-marquee flex gap-12 whitespace-nowrap py-5 will-change-transform">
        {items.map((brand, i) => (
          <span
            key={`${brand}-${i}`}
            className="font-mono text-sm font-bold uppercase tracking-[0.3em] text-bx-white"
          >
            {brand}
            <span className="ml-12 text-bx-accent">/</span>
          </span>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (a) STATS
 * 4컬 통계 블록 — 셀 사이 2px 검정 보더, 각 셀 모노스페이스 라벨 + 거대 숫자.
 * ──────────────────────────────────────────────────────────────── */
function Stats({ isKo }: { isKo: boolean }) {
  const stats = [
    {
      no: "01",
      value: "500+",
      label: isKo ? "검증 매체" : "Verified media",
      meta: isKo ? "전국 OOH 인벤토리" : "Nationwide inventory",
    },
    {
      no: "02",
      value: "15",
      unit: isKo ? "년" : "yrs",
      label: isKo ? "OOH 운영 경력" : "OOH operations",
      meta: isKo ? "축적된 효과 데이터" : "Compounded data",
    },
    {
      no: "03",
      value: "100+",
      label: isKo ? "대기업 파트너" : "Enterprise partners",
      meta: isKo ? "삼성·LG·현대 외" : "Samsung · LG · Hyundai +",
    },
    {
      no: "04",
      value: "24",
      unit: "/7",
      label: isKo ? "원스톱 운영" : "One-stop ops",
      meta: isKo ? "계약~사후관리" : "Contract → post-care",
    },
  ];
  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.no}
            className={[
              "border-bx-black p-6 sm:p-8",
              // 가로 보더: 짝수번째(0,2)는 우측 보더 lg
              i % 2 === 0 ? "border-r-2" : "lg:border-r-2",
              // lg 4열에서 마지막 (i=3) 우측 보더 제거
              i === 3 ? "lg:border-r-0" : "",
              // 모바일/sm 2열에서 위 두 셀과 아래 두 셀 사이 보더
              i >= 2 ? "border-t-2 lg:border-t-0" : "",
              // lg에서 모든 셀 동일 라인
              "lg:border-r-2",
              i === 3 ? "lg:border-r-0" : "",
            ].join(" ")}
          >
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
              [{s.no}] / {s.label}
            </div>
            <p className="mt-4 flex items-baseline gap-1 text-5xl font-bold leading-none tracking-tight text-bx-black sm:text-6xl lg:text-7xl">
              {s.value}
              {s.unit ? (
                <span className="text-2xl font-medium text-bx-gray-dim sm:text-3xl">
                  {s.unit}
                </span>
              ) : null}
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
              // {s.meta}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (b) PROCESS — 4단계 매체 검증 프로세스
 * 4컬 그리드 (모바일 1열, sm 2열, lg 4열). 각 셀에 [STEP NN] / 아이콘 /
 * 타이틀 / 설명. 셀 사이 2px 보더 + grayscale 아이콘.
 * ──────────────────────────────────────────────────────────────── */
function Process({ isKo }: { isKo: boolean }) {
  const steps = [
    {
      no: "01",
      icon: Search,
      title: isKo ? "현장 방문" : "Site Visit",
      desc: isKo
        ? "담당자가 직접 매체 현장을 방문해 설치 환경·주변 유동인구를 확인합니다."
        : "Our team personally visits each site to check installation conditions and foot traffic.",
    },
    {
      no: "02",
      icon: Camera,
      title: isKo ? "촬영 · 실측" : "Photo · Measurement",
      desc: isKo
        ? "매체 크기·시인성·조도를 정밀 측정하고 다각도로 촬영해 기록합니다."
        : "We precisely measure size, visibility, and illumination with multi-angle photography.",
    },
    {
      no: "03",
      icon: Database,
      title: isKo ? "데이터 검증" : "Data Verification",
      desc: isKo
        ? "유동인구·차량 통행량·노출 빈도를 분석해 매체 효과를 검증합니다."
        : "We analyze foot traffic, vehicle flow, and exposure frequency to verify effectiveness.",
    },
    {
      no: "04",
      icon: ClipboardCheck,
      title: isKo ? "매체 등록" : "Registration",
      desc: isKo
        ? "검증을 통과한 매체만 싱커드 플랫폼에 등록되어 광고주에게 제안됩니다."
        : "Only verified media are registered and proposed to advertisers.",
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-16 sm:px-10">
        <SectionHead
          number="01"
          category={isKo ? "Verification" : "Verification"}
          title={
            isKo ? (
              <>
                싱커드만의 <span className="bx-accent">4단계 매체 검증</span>
              </>
            ) : (
              <>
                THINKAD&apos;s <span className="bx-accent">4-step verification</span>
              </>
            )
          }
          meta={
            isKo
              ? "엄격한 검증 프로세스를 통과한 매체만 등록됩니다"
              : "Every media must pass our rigorous verification before listing"
          }
        />
      </div>
      <div className="grid grid-cols-1 border-t-2 border-bx-black sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => {
          const Icon = s.icon;
          return (
            <article
              key={s.no}
              className={[
                "group relative border-bx-black p-6 transition-colors hover:bg-bx-off sm:p-8",
                i % 2 === 1 ? "sm:border-l-2" : "",
                i >= 2 ? "sm:border-t-2 lg:border-t-0" : "",
                "lg:border-l-2",
                i === 0 ? "lg:border-l-0" : "",
              ].join(" ")}
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
                [STEP {s.no}]
              </div>
              <div className="mt-6 inline-flex h-12 w-12 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors group-hover:bg-bx-black group-hover:text-bx-white">
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </div>
              <h3 className="mt-5 text-2xl font-bold leading-tight tracking-tight text-bx-black">
                {s.title}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-bx-gray-dim">
                {s.desc}
              </p>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (b) REGIONAL — 지역 셀렉션 (서울·부산·제주·전국)
 * 4컬 큰 타일. 각 타일 → /media?region=… 진입 (광고주 의도 빠른 분기).
 * 사각 / 2px 보더 / hover 시 검정 invert.
 * ──────────────────────────────────────────────────────────────── */
function Regional({ isKo }: { isKo: boolean }) {
  const regions = [
    {
      no: "01",
      key: "seoul",
      name: isKo ? "서울" : "Seoul",
      sub: isKo ? "강남·성수·홍대 등 200+" : "Gangnam · Seongsu · Hongdae 200+",
      meta: isKo ? "도심 OOH 핵심" : "Urban OOH core",
    },
    {
      no: "02",
      key: "busan",
      name: isKo ? "부산" : "Busan",
      sub: isKo ? "해운대·서면·부산역 60+" : "Haeundae · Seomyeon · Busan Stn 60+",
      meta: isKo ? "남부 거점" : "Southern hub",
    },
    {
      no: "03",
      key: "jeju",
      name: isKo ? "제주" : "Jeju",
      sub: isKo ? "공항·중문·관광 30+" : "Airport · Jungmun · Resort 30+",
      meta: isKo ? "관광 마켓" : "Tourism market",
    },
    {
      no: "04",
      key: "national",
      name: isKo ? "전국" : "Nationwide",
      sub: isKo ? "주요 도시 광역 패키지" : "Multi-city campaign packages",
      meta: isKo ? "전국 도달" : "Nationwide reach",
    },
  ];
  return (
    <section className="border-b-2 border-bx-black bg-bx-off">
      <div className="mx-auto max-w-[1400px] px-6 pt-16 sm:px-10">
        <SectionHead
          number="02"
          category="Regional"
          title={
            isKo ? (
              <>
                지역별 <span className="bx-invert">매체 인벤토리</span>
              </>
            ) : (
              <>
                Regional <span className="bx-invert">inventory</span>
              </>
            )
          }
          meta={
            isKo
              ? "관심 지역을 클릭해 즉시 매체 목록을 확인하세요"
              : "Click a region to jump straight into media listings"
          }
        />
      </div>
      <div className="grid grid-cols-1 border-t-2 border-bx-black sm:grid-cols-2 lg:grid-cols-4">
        {regions.map((r, i) => (
          <a
            key={r.key}
            href={`/${isKo ? "ko" : "en"}/media?region=${r.key}`}
            className={[
              "group relative flex flex-col justify-between border-bx-black bg-bx-white p-8 transition-colors hover:bg-bx-black hover:text-bx-white sm:p-10",
              i % 2 === 1 ? "sm:border-l-2" : "",
              i >= 2 ? "sm:border-t-2 lg:border-t-0" : "",
              "lg:border-l-2",
              i === 0 ? "lg:border-l-0" : "",
            ].join(" ")}
          >
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim group-hover:text-bx-gray">
              [{r.no}] / {r.name}
            </div>
            <div className="mt-12">
              <p className="text-4xl font-bold leading-none tracking-tight sm:text-5xl">
                {r.name}
              </p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim group-hover:text-bx-gray">
                // {r.sub}
              </p>
            </div>
            <div className="mt-12 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em]">
              <span className="text-bx-gray-dim group-hover:text-bx-accent">
                {r.meta}
              </span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (c) MEDIA TOP 6
 * SectionHead [03] / Inventory + 3×2 그리드. MediaCard 재사용
 * (grayscale → hover color, 사각, 2px 보더, [번호] [Type] · // location).
 * ──────────────────────────────────────────────────────────────── */
function MediaTop6({
  isKo,
  items,
}: {
  isKo: boolean;
  items: MediaItem[];
}) {
  if (items.length === 0) return null;
  const typeLabelOf = (m: MediaItem) => {
    const ko: Record<string, string> = {
      digital: "Digital",
      static: "Static",
      mobile: "Mobile",
      network: "Network",
    };
    return ko[m.type] ?? m.type;
  };
  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="03"
        category="Inventory"
        title={
          isKo ? (
            <>
              싱커드 <span className="bx-accent">추천 매체</span> TOP 6
            </>
          ) : (
            <>
              Curated <span className="bx-accent">media</span> TOP 6
            </>
          )
        }
        meta={
          isKo
            ? "검증 데이터 기반\n가장 효과적인 매체"
            : "Most effective media,\nranked by verified data"
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {items.slice(0, 6).map((m, i) => {
          const img = getPrimaryMediaImageUrl(m);
          const price = formatMediaPriceWonWithSymbol(m.price);
          return (
            <div
              key={m.id}
              className={[
                "border-bx-black",
                // 셀 사이 보더 — MediaCard 자체 2px 보더와 겹쳐 4px 안되게 셀에선 하나만
                i > 0 ? "border-t-2 sm:border-t-0" : "",
                i % 2 === 1 ? "sm:border-l-2" : "",
                i >= 2 ? "sm:border-t-2" : "",
                "lg:border-l-2 lg:border-t-0",
                i % 3 === 0 ? "lg:border-l-0" : "",
                i >= 3 ? "lg:border-t-2" : "",
              ].join(" ")}
            >
              <MediaCard
                href={`/media/${m.id}`}
                imageSrc={img}
                imageAlt={isKo ? m.name : m.nameEn || m.name}
                rank={i + 1}
                type={typeLabelOf(m)}
                name={isKo ? m.name : m.nameEn || m.name}
                location={isKo ? m.location : m.locationEn || m.location}
                visibility={m.visibilityScore ?? null}
                dailyTraffic={m.dailyFootTraffic ?? null}
                monthlyImpression={m.monthlyFootTraffic ?? null}
                price={price}
                isVerified
                className="h-full border-0"
              />
            </div>
          );
        })}
      </div>
      <div className="flex justify-end border-t-2 border-bx-black px-6 py-6 sm:px-10">
        <BtnBlock href="/media" variant="secondary">
          {isKo ? "전체 매체" : "Browse all"}
        </BtnBlock>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (c) CASE STUDIES
 * 정적 사례 카드 4개 (실제 사례 데이터는 /cases 라우트에서 별도 fetch 가능,
 * 메인 페이지에서는 큐레이션 카드만 노출).
 * ──────────────────────────────────────────────────────────────── */
function CaseStudies({ isKo }: { isKo: boolean }) {
  const cases = [
    {
      no: "01",
      brand: "SAMSUNG",
      year: "2025",
      title: isKo ? "갤럭시 신제품 런칭 캠페인" : "Galaxy Launch Campaign",
      summary: isKo
        ? "강남·홍대·코엑스 디지털 매체 패키지로 런칭 위크 노출 1.2억"
        : "Gangnam · Hongdae · COEX digital package — 120M impressions in launch week",
      stat: { value: "1.2억", label: isKo ? "노출" : "impressions" },
    },
    {
      no: "02",
      brand: "MUSINSA",
      year: "2025",
      title: isKo ? "S/S 시즌 패션 캠페인" : "S/S Fashion Campaign",
      summary: isKo
        ? "성수·홍대 거점 OOH + 모바일 연계로 20대 도달률 78% 달성"
        : "Seongsu · Hongdae OOH + mobile retargeting — 78% reach on Gen Z",
      stat: { value: "78%", label: isKo ? "20대 도달률" : "Gen Z reach" },
    },
    {
      no: "03",
      brand: "STARBUCKS",
      year: "2024",
      title: isKo ? "썸머 시즌 음료 프로모션" : "Summer Drinks Promo",
      summary: isKo
        ? "전국 50개 매체 동시 집행 — CTR 4.2x 업리프트"
        : "50 nationwide media simultaneous — 4.2x CTR uplift vs baseline",
      stat: { value: "4.2x", label: isKo ? "CTR 업리프트" : "CTR uplift" },
    },
    {
      no: "04",
      brand: "OLIVE YOUNG",
      year: "2024",
      title: isKo ? "K-뷰티 신제품 인지도 캠페인" : "K-Beauty Awareness",
      summary: isKo
        ? "지하철 2호선 + 강남대로 디지털로 브랜드 회상률 +23p"
        : "Line 2 subway + Gangnam digital — brand recall +23pp",
      stat: { value: "+23pp", label: isKo ? "브랜드 회상" : "brand recall" },
    },
  ];
  return (
    <section className="border-b-2 border-bx-black bg-bx-off">
      <SectionHead
        number="04"
        category="Case studies"
        title={
          isKo ? (
            <>
              <span className="bx-invert">집행 사례</span>
            </>
          ) : (
            <>
              <span className="bx-invert">Case studies</span>
            </>
          )
        }
        meta={
          isKo
            ? "선택받은 광고주\n실측 성과 결과"
            : "Selected advertisers\nMeasured outcomes"
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2">
        {cases.map((c, i) => (
          <article
            key={c.no}
            className={[
              "group flex flex-col bg-bx-white p-6 transition-colors hover:bg-bx-black hover:text-bx-white sm:p-10",
              i % 2 === 1 ? "sm:border-l-2 sm:border-bx-black" : "",
              i >= 2 ? "border-t-2 border-bx-black" : "",
            ].join(" ")}
          >
            <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim group-hover:text-bx-gray">
              <span>
                <span className="text-bx-black group-hover:text-bx-white">[{c.no}]</span>
                <span className="ml-2">/ {c.brand}</span>
              </span>
              <span>{c.year}</span>
            </div>
            <h3 className="mt-8 text-2xl font-bold leading-tight tracking-tight text-bx-black group-hover:text-bx-white sm:text-3xl">
              {c.title}
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-bx-gray-dim group-hover:text-bx-gray">
              {c.summary}
            </p>
            <div className="mt-8 flex items-baseline gap-3 border-t-2 border-bx-black pt-6 group-hover:border-bx-gray">
              <span className="text-4xl font-bold tracking-tight text-bx-accent">
                {c.stat.value}
              </span>
              <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim group-hover:text-bx-gray">
                // {c.stat.label}
              </span>
            </div>
          </article>
        ))}
      </div>
      <div className="flex justify-end border-t-2 border-bx-black px-6 py-6 sm:px-10">
        <BtnBlock href="/cases" variant="primary">
          {isKo ? "전체 사례" : "All cases"}
        </BtnBlock>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (d) WHY US
 * 3컬 차별점 그리드. 큰 번호 + 아이콘 + 카피 + 강조.
 * ──────────────────────────────────────────────────────────────── */
function WhyUs({ isKo }: { isKo: boolean }) {
  const items = [
    {
      no: "01",
      icon: Eye,
      title: isKo ? "직접 현장 검증" : "On-site Verification",
      desc: isKo
        ? "모든 매체를 담당자가 직접 방문해 실제 노출 환경·시인성·유동인구를 확인합니다."
        : "Every media is personally verified on site for actual exposure, visibility, and foot traffic.",
      stat: isKo ? "100%" : "100%",
      statLabel: isKo ? "현장 방문" : "Site visits",
    },
    {
      no: "02",
      icon: BarChart3,
      title: isKo ? "1년+ 효과 데이터" : "1+ Year Performance Data",
      desc: isKo
        ? "단기 캠페인이 아닌, 1년 이상 축적된 매체별 효과 데이터로 ROI 검증된 매체만 추천합니다."
        : "We recommend only media verified by 1+ years of compounded performance data, not short-term tests.",
      stat: "1Y+",
      statLabel: isKo ? "데이터 축적" : "Data depth",
    },
    {
      no: "03",
      icon: FileCheck,
      title: isKo ? "원스톱 운영" : "One-stop Operations",
      desc: isKo
        ? "계약, 설치, 집행, 모니터링, 리포팅, 사후관리까지 전 과정을 싱커드가 책임집니다."
        : "Contract, install, run, monitor, report, post-care — all under one roof.",
      stat: "24/7",
      statLabel: isKo ? "운영 지원" : "Ops support",
    },
  ];
  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-16 sm:px-10">
        <SectionHead
          number="05"
          category="Why us"
          title={
            isKo ? (
              <>
                왜 <span className="bx-accent">싱커드</span>인가?
              </>
            ) : (
              <>
                Why <span className="bx-accent">THINKAD</span>?
              </>
            )
          }
          meta={
            isKo
              ? "검증되지 않은 매체에 광고비를 낭비하지 마세요"
              : "Don't waste ad budget on unverified media"
          }
        />
      </div>
      <div className="grid grid-cols-1 border-t-2 border-bx-black lg:grid-cols-3">
        {items.map((it, i) => {
          const Icon = it.icon;
          return (
            <article
              key={it.no}
              className={[
                "group relative flex flex-col bg-bx-white p-8 transition-colors hover:bg-bx-off sm:p-10",
                i > 0 ? "border-t-2 border-bx-black lg:border-l-2 lg:border-t-0" : "",
              ].join(" ")}
            >
              <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
                [{it.no}] / Why
              </div>
              <div className="mt-8 inline-flex h-14 w-14 items-center justify-center border-2 border-bx-black bg-bx-white text-bx-black transition-colors group-hover:bg-bx-accent group-hover:border-bx-accent group-hover:text-bx-white">
                <Icon className="h-6 w-6" strokeWidth={1.6} />
              </div>
              <h3 className="mt-6 text-2xl font-bold leading-tight tracking-tight text-bx-black sm:text-3xl">
                {it.title}
              </h3>
              <p className="mt-4 flex-1 text-sm leading-relaxed text-bx-gray-dim">
                {it.desc}
              </p>
              <div className="mt-8 flex items-baseline gap-3 border-t-2 border-bx-black pt-6">
                <span className="text-4xl font-bold tracking-tight text-bx-black">
                  {it.stat}
                </span>
                <span className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
                  // {it.statLabel}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (d) TESTIMONIALS
 * 4건 정적 그리드 (캐러셀 대신). 각 카드 = 따옴표·본문·이름·회사·KPI.
 * ──────────────────────────────────────────────────────────────── */
function Testimonials({ isKo }: { isKo: boolean }) {
  const list = testimonials.slice(0, 4);
  if (list.length === 0) return null;
  return (
    <section className="border-b-2 border-bx-black bg-bx-off">
      <div className="mx-auto max-w-[1400px] px-6 pb-16 pt-16 sm:px-10">
        <SectionHead
          number="06"
          category="Testimonials"
          title={
            isKo ? (
              <>
                광고주가 <span className="bx-invert">직접 전하는</span> 이야기
              </>
            ) : (
              <>
                <span className="bx-invert">What our clients</span> say
              </>
            )
          }
          meta={
            isKo
              ? "싱커드와 함께 성장한 파트너의 실제 목소리"
              : "Real voices from partners who grew with THINKAD"
          }
        />
      </div>
      <div className="grid grid-cols-1 border-t-2 border-bx-black sm:grid-cols-2">
        {list.map((t, i) => (
          <article
            key={t.id}
            className={[
              "group flex flex-col bg-bx-white p-6 transition-colors sm:p-10",
              i % 2 === 1 ? "sm:border-l-2 sm:border-bx-black" : "",
              i >= 2 ? "border-t-2 border-bx-black" : "",
            ].join(" ")}
          >
            <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
              <span className="text-bx-black">[{String(i + 1).padStart(2, "0")}]</span>
              <span className="ml-2">/ {isKo ? t.industryKo : t.industryEn}</span>
            </div>
            <p className="mt-8 text-xl font-medium leading-snug text-bx-black sm:text-2xl">
              <span className="text-bx-accent">&ldquo;</span>
              {isKo ? t.bodyKo : t.bodyEn}
              <span className="text-bx-accent">&rdquo;</span>
            </p>
            <div className="mt-auto pt-8">
              <div className="flex items-center justify-between border-t-2 border-bx-black pt-6">
                <div>
                  <p className="text-sm font-bold text-bx-black">
                    {isKo ? t.nameKo : t.nameEn}
                  </p>
                  <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                    // {isKo ? t.companyKo : t.companyEn}
                  </p>
                </div>
                <span className="bg-bx-black px-2.5 py-1 font-mono text-[11px] font-bold text-bx-white">
                  {isKo ? t.metricKo : t.metricEn}
                </span>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * (d) FINAL CTA
 * 풀-블리드 검정 배너. 좌측 거대 카피 + 우측 CTA accent 변형.
 * ──────────────────────────────────────────────────────────────── */
function FinalCta({
  isKo,
  t,
}: {
  isKo: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
}) {
  return (
    <section className="border-b-2 border-bx-black bg-bx-black text-bx-white">
      <div className="mx-auto grid max-w-[1400px] grid-cols-1 lg:grid-cols-12">
        <div className="col-span-1 border-bx-white px-6 py-14 sm:px-10 sm:py-20 lg:col-span-8 lg:border-r-2">
          <div className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray">
            <span className="text-bx-accent">[07]</span>
            <span className="ml-2">/ Final</span>
            <span className="ml-2">— {isKo ? "지금 시작하세요" : "Start now"}</span>
          </div>
          <h2 className="mt-6 text-[clamp(2rem,5.5vw,5.5rem)] font-bold leading-[0.96] tracking-[-0.03em]">
            {isKo ? (
              <>
                <span className="block">{t("ctaBanner.title")}</span>
              </>
            ) : (
              <span className="block">{t("ctaBanner.title")}</span>
            )}
          </h2>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-bx-gray sm:text-lg">
            {t("ctaBanner.description")}
          </p>
        </div>
        <aside className="col-span-1 flex flex-col justify-center gap-4 border-t-2 border-bx-white bg-bx-black px-6 py-12 sm:px-10 lg:col-span-4 lg:border-t-0 lg:py-20">
          <BtnBlock href="/contact" variant="accent" stack className="w-full justify-between">
            {t("ctaBanner.cta")}
          </BtnBlock>
          <BtnBlock href="/media" variant="dark" className="w-full justify-between border-bx-white">
            {isKo ? "매체 살펴보기" : "Browse media"}
          </BtnBlock>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray">
            // {isKo
              ? "30초 신청 · 24시간 내 컨설턴트 연락"
              : "30s apply · expert contact within 24h"}
          </p>
        </aside>
      </div>
    </section>
  );
}
