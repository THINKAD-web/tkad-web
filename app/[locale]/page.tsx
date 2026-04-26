import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  fetchHomeFeaturedMedia,
  fetchHomePopularMedia,
} from "@/lib/public-media-catalog";
import { type MediaItem } from "@/lib/media-data";
import { ArrowRight, ArrowDown } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";

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
  // featuredCatalog/popularCatalog 는 chunk (c) 에서 사용 — 현재 chunk(a)에서는 미사용
  featuredCatalog: _featuredCatalog,
  popularCatalog: _popularCatalog,
}: {
  locale: string;
  t: Awaited<ReturnType<typeof getTranslations>>;
  featuredCatalog: MediaItem[];
  popularCatalog: MediaItem[];
}) {
  const isKo = locale === "ko";

  return (
    <>
      <Hero isKo={isKo} t={t} />
      <Ticker isKo={isKo} />
      <Stats isKo={isKo} />
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
            <BtnBlock href="/contact" variant="primary" size="lg" className="w-full justify-between">
              <span>{isKo ? "무료 상담 신청" : "Free Consultation"}</span>
              <ArrowRight className="h-4 w-4" />
            </BtnBlock>
            <BtnBlock href="/media" variant="secondary" size="lg" className="w-full justify-between">
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
 * 무한 가로 스크롤 마퀴. 광고주·파트너 브랜드를 모노스페이스로.
 * CSS animation 으로 GPU 만 사용. prefers-reduced-motion 시 정지.
 * ──────────────────────────────────────────────────────────────── */
const TICKER_BRANDS = [
  "SAMSUNG",
  "LG",
  "HYUNDAI",
  "KAKAO",
  "NAVER",
  "COUPANG",
  "CJ ENM",
  "SK TELECOM",
  "STARBUCKS",
  "EMART",
  "SHINSEGAE",
  "LOTTE",
  "ASIANA",
  "OLIVE YOUNG",
  "MUSINSA",
  "29CM",
] as const;

function Ticker({ isKo }: { isKo: boolean }) {
  const items = [...TICKER_BRANDS, ...TICKER_BRANDS]; // duplicated for seamless loop
  return (
    <section
      aria-label={isKo ? "주요 파트너 마퀴" : "Featured partners marquee"}
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
