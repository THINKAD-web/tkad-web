import { resolveLocaleParam } from "@/lib/resolve-locale";
import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  fetchHomeFeaturedMedia,
  fetchHomePopularMedia,
} from "@/lib/public-media-catalog";
import { type MediaItem, getPrimaryMediaImageUrl } from "@/lib/media-data";
import { formatMediaPriceWonWithSymbol } from "@/lib/media-price-format";
import { ArrowRight, ArrowDown } from "lucide-react";
import { BtnBlock, SectionHead, MediaCard } from "@/components/brutalist";
import { testimonials } from "@/data/testimonials";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const locale = await resolveLocaleParam(params);
  setRequestLocale(locale);
  const t = await getTranslations();
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

  /** TOP 6 — featured 우선, 부족하면 popular 로 채움 (중복 제거) */
  const seen = new Set<string>();
  const top6: MediaItem[] = [];
  for (const m of [...featuredCatalog, ...popularCatalog]) {
    if (top6.length >= 6) break;
    if (seen.has(m.id)) continue;
    seen.add(m.id);
    top6.push(m);
  }

  /** HERO 우측 이미지 — DB 의 첫 추천 매체 이미지 */
  const heroMedia = featuredCatalog[0] ?? null;

  return (
    <>
      <Hero isKo={isKo} t={t} heroMedia={heroMedia} />
      <Ticker isKo={isKo} />
      {/* TODO: Stats / Process / Regional / MediaTop6 / CaseStudies / WhyUs / Testimonials / FinalCta */}
    </>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 1. HERO — 12컬럼 그리드
 *   좌 1-3: 메타 사이드바 (off bg)
 *   중 3-10: 거대 헤드라인 + 상단 status + 하단 lede + 버튼
 *   우 10-13: 강남역 첫 매체 이미지 + 라벨
 * ──────────────────────────────────────────────────────────────── */
function Hero({
  isKo,
  t,
  heroMedia,
}: {
  isKo: boolean;
  t: Awaited<ReturnType<typeof getTranslations>>;
  heroMedia: MediaItem | null;
}) {
  const heroImg = heroMedia ? getPrimaryMediaImageUrl(heroMedia) : null;
  const heroName = heroMedia
    ? isKo
      ? heroMedia.name
      : heroMedia.nameEn || heroMedia.name
    : null;
  const heroLoc = heroMedia
    ? isKo
      ? heroMedia.location
      : heroMedia.locationEn || heroMedia.location
    : null;

  return (
    <section className="relative border-b-2 border-bx-black bg-bx-white">
      <div className="grid grid-cols-1 lg:grid-cols-12">
        {/* 좌측 메타 사이드바 — lg cols 1-3 */}
        <aside className="border-bx-black bg-bx-off px-6 py-10 sm:px-8 sm:py-12 lg:col-span-3 lg:border-r-2 lg:py-16">
          <div className="space-y-8">
            <MetaRow label="Index" value="2026 / Ver. 015" />
            <MetaRow
              label="Coordinates"
              value={
                <>
                  37.5004°N / 127.0270°E
                  <br />
                  Seoul · KR
                </>
              }
            />
            <MetaRow
              label="Service"
              value={
                isKo
                  ? "Out-of-Home Advertising Agency"
                  : "Out-of-Home Advertising Agency"
              }
            />
            <MetaRow
              label="Status"
              value={
                <span className="inline-flex items-center gap-2">
                  <span className="font-mono text-bx-accent" aria-hidden>
                    ▮▮▮▮▮▮▮▮▮▮
                  </span>
                  <span>Operational</span>
                </span>
              }
            />
          </div>
        </aside>

        {/* 중앙 메인 영역 — lg cols 4-10 (7컬) */}
        <div className="border-t-2 border-bx-black px-6 py-10 sm:px-10 sm:py-14 lg:col-span-7 lg:border-t-0 lg:border-r-2 lg:px-12 lg:py-20">
          {/* 상단 라벨 */}
          <p className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
            <span
              className="bx-pulse inline-block h-2 w-2 bg-bx-accent"
              aria-hidden
            />
            <span>
              {isKo
                ? "Now serving 100+ brands across Korea"
                : "Now serving 100+ brands across Korea"}
            </span>
          </p>

          {/* 거대 헤드라인 */}
          <h1 className="mt-10 font-extrabold leading-[0.85] tracking-[-0.03em] text-bx-black [font-size:clamp(3.75rem,11vw,11.25rem)]">
            {isKo ? (
              <>
                <span className="block">매체는</span>
                <span className="block">
                  <span className="bx-invert">검증</span>으로
                </span>
                <span className="block">
                  <span className="bx-accent">말한다.</span>
                </span>
              </>
            ) : (
              <>
                <span className="block">Media is</span>
                <span className="block">
                  <span className="bx-invert">verified</span>
                </span>
                <span className="block">
                  <span className="bx-accent">on the ground.</span>
                </span>
              </>
            )}
          </h1>

          {/* 하단 — 좌측 lede + 우측 버튼 스택 */}
          <div className="mt-12 grid grid-cols-1 gap-8 border-t-2 border-bx-black pt-8 lg:grid-cols-2 lg:gap-10">
            <p className="max-w-md text-base leading-relaxed text-bx-gray-dim sm:text-lg">
              {t("hero.subtitle")}
            </p>
            <div className="flex flex-col">
              <BtnBlock
                href="/contact"
                variant="primary"
                stack
                className="w-full justify-between"
              >
                {isKo ? "무료 상담 신청" : "Free Consultation"}
              </BtnBlock>
              <BtnBlock
                href="/media"
                variant="secondary"
                icon={false}
                className="w-full justify-between"
              >
                <span>{isKo ? "매체 카탈로그" : "Media catalog"}</span>
                <ArrowDown className="h-4 w-4" aria-hidden />
              </BtnBlock>
            </div>
          </div>
        </div>

        {/* 우측 이미지 — lg cols 11-13 (3컬) */}
        <div className="relative border-t-2 border-bx-black lg:col-span-2 lg:border-t-0">
          <div className="relative h-64 w-full overflow-hidden bg-bx-off lg:h-full lg:min-h-[600px]">
            {heroImg ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={heroImg}
                alt={heroName ?? ""}
                className="h-full w-full object-cover grayscale"
                loading="eager"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
                [ no image ]
              </div>
            )}

            {/* 좌상단 라벨 */}
            <span className="absolute left-0 top-0 bg-bx-black px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-white">
              [01] Featured
            </span>

            {/* 좌하단 좌표/장소 */}
            <span className="absolute bottom-0 left-0 right-12 bg-bx-white border-t-2 border-r-2 border-bx-black px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-bx-black">
              {heroLoc ? `// ${heroLoc}` : "// Seoul · Gangnam"}
            </span>

            {/* 우하단 주황 화살표 박스 */}
            {heroMedia ? (
              <a
                href={`/${isKo ? "ko" : "en"}/media/${heroMedia.id}`}
                aria-label={isKo ? "추천 매체 상세" : "Featured detail"}
                className="absolute bottom-0 right-0 inline-flex h-12 w-12 items-center justify-center bg-bx-accent text-bx-white transition-colors hover:bg-bx-black"
              >
                <ArrowRight className="h-5 w-5" aria-hidden />
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetaRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div>
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
        {label}
      </p>
      <p className="mt-2 font-mono text-[12px] leading-snug text-bx-black">
        {value}
      </p>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 2. TICKER — 검정 배경 가로 무한 스크롤
 *   "500+ Verified Media ● 15 Years ● 100+ Partners ●
 *    서울·부산·대구·인천·대전 ● 현장 검증 ● 데이터 분석 ● 원스톱 관리"
 *   도트는 주황색.
 * ──────────────────────────────────────────────────────────────── */
const TICKER_PHRASES_KO = [
  "500+ Verified Media",
  "15 Years",
  "100+ Partners",
  "서울 · 부산 · 대구 · 인천 · 대전",
  "현장 검증",
  "데이터 분석",
  "원스톱 관리",
];
const TICKER_PHRASES_EN = [
  "500+ Verified Media",
  "15 Years",
  "100+ Partners",
  "Seoul · Busan · Daegu · Incheon · Daejeon",
  "On-site Verification",
  "Data-driven",
  "One-stop Operations",
];

function Ticker({ isKo }: { isKo: boolean }) {
  const phrases = isKo ? TICKER_PHRASES_KO : TICKER_PHRASES_EN;
  // 한 트랙을 두 번 이어붙여 seamless loop
  const track = [...phrases, ...phrases, ...phrases, ...phrases];
  return (
    <section
      aria-label={isKo ? "운영 지표 마퀴" : "Operations marquee"}
      className="relative overflow-hidden border-b-2 border-bx-black bg-bx-black"
    >
      <div className="bx-marquee flex items-center gap-10 whitespace-nowrap py-5 will-change-transform">
        {track.map((phrase, i) => (
          <span
            key={`${phrase}-${i}`}
            className="inline-flex items-center gap-10 font-mono text-sm font-semibold uppercase tracking-[0.28em] text-bx-white"
          >
            <span>{phrase}</span>
            <span className="text-bx-accent" aria-hidden>
              ●
            </span>
          </span>
        ))}
      </div>
    </section>
  );
}
