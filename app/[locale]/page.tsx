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

/* ────────────────────────────────────────────────────────────────
 * 3. STATS — 4컬럼 통계 (2px 보더 분할)
 *   500+ / 검증된 매체     // 01
 *   15Y  / OOH 경력         // 02
 *   100+ / 대기업 파트너    // 03
 *   24h  / 상담 회신        // 04
 *   숫자: Pretendard 800 80px
 * ──────────────────────────────────────────────────────────────── */
function Stats({ isKo }: { isKo: boolean }) {
  const stats = [
    {
      no: "01",
      value: "500+",
      label: isKo ? "검증된 매체" : "Verified media",
    },
    {
      no: "02",
      value: "15",
      unit: "Y",
      label: isKo ? "OOH 경력" : "Years of OOH",
    },
    {
      no: "03",
      value: "100+",
      label: isKo ? "대기업 파트너" : "Enterprise partners",
    },
    {
      no: "04",
      value: "24",
      unit: "h",
      label: isKo ? "상담 회신" : "Response time",
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <div className="grid grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.no}
            className={[
              "relative border-bx-black px-6 py-12 sm:px-8 sm:py-14",
              // 모바일 2컬: 우측 보더는 짝수 인덱스에만, lg 4컬에선 마지막 셀 제외 모두
              i % 2 === 0 ? "border-r-2" : "lg:border-r-2",
              i === 3 ? "lg:border-r-0" : "",
              // 모바일 2행 사이 위 보더
              i >= 2 ? "border-t-2 lg:border-t-0" : "",
              // lg 4컬에서도 모든 셀 우측 보더 (마지막 제외)
              "lg:border-r-2",
              i === 3 ? "lg:border-r-0" : "",
            ].join(" ")}
          >
            {/* 우상단 // NN */}
            <span className="absolute right-4 top-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim sm:right-6 sm:top-6">
              // {s.no}
            </span>

            <p className="flex items-baseline gap-1 font-extrabold leading-none tracking-[-0.03em] text-bx-black [font-size:clamp(3rem,7vw,5rem)]">
              {s.value}
              {s.unit ? (
                <span className="text-3xl font-bold text-bx-gray-dim sm:text-4xl">
                  {s.unit}
                </span>
              ) : null}
            </p>
            <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
              / {s.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 4. PROCESS — 4단계 매체 검증
 *   SectionHead [01] / Process | "매체는 발걸음으로 [검증]한다." | Four-step Verification
 *   각 셀: 64×64 검정 보더 번호 박스 → step (모노) → 제목 → 설명
 *   hover: 셀 배경 #f5f5f5, 박스 → 주황 배경 + 흰 글자
 * ──────────────────────────────────────────────────────────────── */
function Process({ isKo }: { isKo: boolean }) {
  const steps = [
    {
      no: "01",
      stepKo: "현장 방문",
      stepEn: "Site Visit",
      titleKo: "발로 뛰어 확인하는 매체 환경",
      titleEn: "Walked, watched, verified",
      descKo:
        "담당자가 직접 매체 현장을 방문하여 시야, 환경, 주변 유동인구를 확인합니다.",
      descEn:
        "Our team personally visits each site to check sightline, environment, and surrounding foot traffic.",
    },
    {
      no: "02",
      stepKo: "촬영·실측",
      stepEn: "Photo · Measurement",
      titleKo: "정밀하게 기록되는 매체 데이터",
      titleEn: "Precisely measured & documented",
      descKo:
        "매체 크기, 시인성, 조도를 정밀 측정하고 다각도로 기록·문서화합니다.",
      descEn:
        "We measure size, visibility, and illumination, then document the media from multiple angles.",
    },
    {
      no: "03",
      stepKo: "데이터 검증",
      stepEn: "Data Verification",
      titleKo: "수치로 입증되는 매체 효과",
      titleEn: "Numbers prove the media",
      descKo:
        "유동인구·차량 통행량·노출 빈도를 분석하여 매체 효과를 정량 검증합니다.",
      descEn:
        "We quantify exposure by analyzing foot traffic, vehicle flow, and frequency.",
    },
    {
      no: "04",
      stepKo: "매체 등록",
      stepEn: "Registration",
      titleKo: "검증된 매체만 등록되는 큐레이션",
      titleEn: "Only verified media listed",
      descKo:
        "검증을 통과한 매체만 싱커드 플랫폼에 등록되어 광고주에게 제안됩니다.",
      descEn:
        "Only media that pass verification are listed on the THINKAD platform.",
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="01"
        category="Process"
        title={
          isKo ? (
            <>
              매체는 발걸음으로 <span className="bx-accent">[검증]</span>한다.
            </>
          ) : (
            <>
              <span className="bx-accent">Verification</span> by foot.
            </>
          )
        }
        meta={isKo ? "Four-step\nVerification" : "Four-step\nVerification"}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((s, i) => (
          <article
            key={s.no}
            className={[
              "group relative border-bx-black p-6 transition-colors duration-150 hover:bg-bx-off sm:p-8",
              // 보더: sm 2컬, lg 4컬
              i % 2 === 1 ? "sm:border-l-2" : "",
              i >= 2 ? "sm:border-t-2 lg:border-t-0" : "",
              "lg:border-l-2",
              i === 0 ? "lg:border-l-0" : "",
            ].join(" ")}
          >
            {/* 64×64 번호 박스 — hover 시 주황 invert */}
            <span className="inline-flex h-16 w-16 items-center justify-center border-2 border-bx-black bg-bx-white font-mono text-base font-bold text-bx-black transition-colors duration-150 group-hover:border-bx-accent group-hover:bg-bx-accent group-hover:text-bx-white">
              {s.no}
            </span>

            {/* step (모노) */}
            <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
              / {isKo ? s.stepKo : s.stepEn}
            </p>

            {/* 큰 제목 */}
            <h3 className="mt-3 text-2xl font-bold leading-tight tracking-tight text-bx-black">
              {isKo ? s.titleKo : s.titleEn}
            </h3>

            {/* 설명 */}
            <p className="mt-4 text-sm leading-relaxed text-bx-gray-dim">
              {isKo ? s.descKo : s.descEn}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 5. REGIONAL — 2컬럼
 *   좌측 (off bg): [02] / Network + 큰 제목 + 설명 + 5대 도시 2x3 리스트
 *   우측 (검정 bg): 8x10 도트 그리드 + 떠있는 라벨 3개
 * ──────────────────────────────────────────────────────────────── */
function Regional({ isKo }: { isKo: boolean }) {
  const regions = [
    { name: isKo ? "서울" : "Seoul", count: "320+" },
    { name: isKo ? "부산" : "Busan", count: "68" },
    { name: isKo ? "대구" : "Daegu", count: "42" },
    { name: isKo ? "인천" : "Incheon", count: "38" },
    { name: isKo ? "대전" : "Daejeon", count: "24" },
    {
      name: isKo ? "광주·기타" : "Gwangju · etc.",
      count: "30+",
    },
  ];

  /** 도트 시각화: 0..79 (8행 x 10열).
   * 활성 6개(주황+pulse) / 중간 12개(흰 70%) / 약함 15개(흰 40%) / 나머지 흰 10% */
  const ACTIVE = new Set([3, 12, 25, 38, 47, 56]);
  const MEDIUM = new Set([0, 5, 14, 21, 28, 33, 42, 51, 60, 64, 70, 75]);
  const WEAK = new Set([
    1, 2, 7, 11, 17, 22, 27, 35, 41, 50, 53, 58, 62, 68, 73,
  ]);

  return (
    <section className="border-b-2 border-bx-black">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* 좌측 — off 배경, [02] / Network */}
        <div className="border-bx-black bg-bx-off px-6 py-12 sm:px-10 sm:py-16 lg:border-r-2 lg:px-12 lg:py-20">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
            <span className="text-bx-black">[02]</span>
            <span className="ml-2"> / Network</span>
          </p>
          <h2 className="mt-6 font-bold leading-[0.96] tracking-[-0.02em] text-bx-black [font-size:clamp(2.25rem,4.5vw,4rem)]">
            {isKo ? (
              <>
                전국 <span className="bx-accent">[5대 도시]</span>
                <br />
                매체 커버리지
              </>
            ) : (
              <>
                Coverage across
                <br />
                <span className="bx-accent">[5 major cities]</span>
              </>
            )}
          </h2>
          <p className="mt-6 max-w-md text-sm leading-relaxed text-bx-gray-dim sm:text-base">
            {isKo
              ? "서울 도심 핵심 매체부터 부산·대구·인천·대전 등 전국 거점 도시까지, 검증된 OOH 인벤토리를 한 곳에서 운영합니다."
              : "From core Seoul inventory to Busan, Daegu, Incheon, and Daejeon — verified OOH media nationwide, managed in one place."}
          </p>

          {/* 5대 도시 2x3 그리드 */}
          <ul className="mt-10 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-2">
            {regions.map((r) => (
              <li
                key={r.name}
                className="flex items-baseline justify-between border-b-2 border-bx-black pb-2"
              >
                <span className="text-base font-bold text-bx-black">
                  {r.name}
                </span>
                <span className="font-mono text-sm font-bold tabular-nums text-bx-accent">
                  {r.count}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* 우측 — 검정 배경 도트 그리드 */}
        <div className="relative overflow-hidden bg-bx-black p-8 sm:p-10 lg:p-12">
          {/* 떠있는 라벨 3개 */}
          <FloatingLabel
            top="14%"
            left="22%"
            primary={isKo ? "강남" : "Gangnam"}
            secondary="92만/일"
            tone="accent"
          />
          <FloatingLabel
            top="42%"
            left="58%"
            primary={isKo ? "성수" : "Seongsu"}
            secondary="8.5만/일"
            tone="white"
          />
          <FloatingLabel
            top="72%"
            left="36%"
            primary={isKo ? "명동" : "Myeongdong"}
            secondary={isKo ? "핫매체" : "Hot"}
            tone="accent"
          />

          {/* 8x10 도트 그리드 */}
          <div
            aria-hidden
            className="grid h-full w-full grid-cols-10 gap-3 sm:gap-4"
            style={{ gridTemplateRows: "repeat(8, 1fr)" }}
          >
            {Array.from({ length: 80 }).map((_, i) => {
              const isActive = ACTIVE.has(i);
              const isMedium = MEDIUM.has(i);
              const isWeak = WEAK.has(i);
              const cls = isActive
                ? "bg-bx-accent bx-pulse"
                : isMedium
                  ? "bg-bx-white opacity-70"
                  : isWeak
                    ? "bg-bx-white opacity-40"
                    : "bg-bx-white opacity-10";
              return (
                <span
                  key={i}
                  className={`block h-2 w-2 rounded-none sm:h-2.5 sm:w-2.5 ${cls}`}
                />
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

function FloatingLabel({
  top,
  left,
  primary,
  secondary,
  tone,
}: {
  top: string;
  left: string;
  primary: string;
  secondary: string;
  tone: "accent" | "white";
}) {
  return (
    <span
      className={[
        "pointer-events-none absolute z-10 inline-flex items-center gap-2 border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em]",
        tone === "accent"
          ? "border-bx-accent bg-bx-black text-bx-white"
          : "border-bx-white bg-bx-black text-bx-white",
      ].join(" ")}
      style={{ top, left, transform: "translate(-50%, -50%)" }}
    >
      <span className={tone === "accent" ? "text-bx-accent" : "text-bx-white"}>
        {primary}
      </span>
      <span className="text-bx-gray-dim" aria-hidden>
        ·
      </span>
      <span>{secondary}</span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 6. MEDIA TOP 6 — SectionHead + 3x2 MediaCard 그리드 + 검정 배너
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
    const map: Record<string, string> = {
      digital: isKo ? "디지털" : "Digital",
      static: isKo ? "고정형" : "Static",
      mobile: isKo ? "교통" : "Mobile",
      network: isKo ? "네트워크" : "Network",
    };
    return map[m.type] ?? m.type;
  };

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="03"
        category="Top Picks"
        title={
          isKo ? (
            <>
              싱커드 추천 매체 <span className="bx-accent">[TOP 6]</span>
            </>
          ) : (
            <>
              Curated <span className="bx-accent">[TOP 6]</span>
            </>
          )
        }
        meta={isKo ? "Editor's Picks\nSpring 2026" : "Editor's Picks\nSpring 2026"}
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

      {/* 하단 검정 배너 — 'VIEW ALL 500+ MEDIA / 전체 매체 보기 →' */}
      <a
        href={`/${isKo ? "ko" : "en"}/media`}
        className="group flex items-center justify-between border-t-2 border-bx-black bg-bx-black px-6 py-6 transition-colors hover:bg-bx-accent sm:px-10 sm:py-8"
      >
        <span className="font-mono text-[12px] font-bold uppercase tracking-[0.28em] text-bx-white sm:text-sm">
          VIEW ALL 500+ MEDIA
        </span>
        <span className="flex items-center gap-3 font-mono text-[12px] font-bold uppercase tracking-[0.28em] text-bx-white sm:text-sm">
          {isKo ? "전체 매체 보기" : "Browse all"}
          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </span>
      </a>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 7. CASE STUDIES — 3컬 (Beauty · SaaS·Fintech · K-POP)
 *   각 셀: 16:10 grayscale 이미지 (hover 컬러) + 좌상단 카테고리 태그
 *   + 좌하단 주황 결과 박스 + 하단 메타 + 제목 + 설명
 * ──────────────────────────────────────────────────────────────── */
function CaseStudies({ isKo }: { isKo: boolean }) {
  const cases = [
    {
      no: "01",
      category: "Beauty",
      result: "+300%",
      brand: "Global Beauty Brand A",
      year: "2025",
      titleKo: "강남 10개 빌보드 동시 집행",
      titleEn: "10 simultaneous Gangnam billboards",
      descKo:
        "검증 데이터 기반으로 매체 10개를 한 번에 집행, 브랜드 인지도 +300% 달성.",
      descEn:
        "10 media run simultaneously based on verified data — brand awareness +300%.",
      imageUrl:
        "https://images.unsplash.com/photo-1519222970733-f546218fa6d7?w=1200&q=80&auto=format&fit=crop",
    },
    {
      no: "02",
      category: "SaaS · Fintech",
      result: "2주 / 150만",
      brand: "Fintech Startup B",
      year: "2025",
      titleKo: "지하철 2호선 단기 런칭 캠페인",
      titleEn: "Subway Line 2 launch sprint",
      descKo:
        "2주 단기 캠페인으로 150만 노출 확보, 전환율 4.2배 개선.",
      descEn:
        "2-week sprint hit 1.5M impressions and 4.2x conversion uplift.",
      imageUrl:
        "https://images.unsplash.com/photo-1517022812141-23620dba5c23?w=1200&q=80&auto=format&fit=crop",
    },
    {
      no: "03",
      category: "K-POP",
      result: "+200%",
      brand: "Entertainment C",
      year: "2024",
      titleKo: "성수·홍대 K-POP 컴백 캠페인",
      titleEn: "Seongsu · Hongdae comeback push",
      descKo:
        "10대·20대 도달률 78% 달성, 팬덤 인게이지먼트 +200%.",
      descEn:
        "78% reach on Gen Z + +200% fandom engagement.",
      imageUrl:
        "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200&q=80&auto=format&fit=crop",
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="04"
        category="Case Studies"
        title={
          isKo ? (
            <>
              실제로 <span className="bx-accent">[달라진]</span> 결과.
            </>
          ) : (
            <>
              Real, <span className="bx-accent">[measured]</span> outcomes.
            </>
          )
        }
        meta={
          isKo
            ? "Featured Cases\n2024–2026"
            : "Featured Cases\n2024–2026"
        }
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {cases.map((c, i) => (
          <article
            key={c.no}
            className={[
              "group flex flex-col bg-bx-white",
              "border-bx-black",
              i > 0 ? "border-t-2 sm:border-t-0" : "",
              i % 2 === 1 ? "sm:border-l-2" : "",
              i >= 2 ? "sm:border-t-2 lg:border-t-0" : "",
              "lg:border-l-2",
              i === 0 ? "lg:border-l-0" : "",
            ].join(" ")}
          >
            {/* 16:10 이미지 */}
            <div className="relative aspect-[16/10] overflow-hidden border-b-2 border-bx-black bg-bx-off">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.imageUrl}
                alt=""
                className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 ease-out group-hover:grayscale-0 group-hover:scale-[1.04]"
                loading="lazy"
              />

              {/* 좌상단 카테고리 태그 (흰배경 + 검정보더) */}
              <span className="absolute left-0 top-0 border-b-2 border-r-2 border-bx-black bg-bx-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black">
                [ {c.category} ]
              </span>

              {/* 좌하단 주황 결과 박스 (주황 배경 + 검정 보더) */}
              <span className="absolute left-0 bottom-0 border-r-2 border-t-2 border-bx-black bg-bx-accent px-3 py-1.5 font-mono text-[12px] font-bold uppercase tracking-[0.18em] text-bx-white">
                {c.result}
              </span>
            </div>

            {/* 하단 정보 */}
            <div className="flex flex-1 flex-col p-6 sm:p-8">
              <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
                <span className="text-bx-black">[{c.no}]</span>
                <span className="ml-2"> / {c.brand}</span>
                <span className="ml-2"> · {c.year}</span>
              </p>
              <h3 className="mt-4 text-xl font-bold leading-tight tracking-tight text-bx-black sm:text-2xl">
                {isKo ? c.titleKo : c.titleEn}
              </h3>
              <p className="mt-3 text-sm leading-relaxed text-bx-gray-dim">
                {isKo ? c.descKo : c.descEn}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 8. WHY US — 3컬 (셀 사이 2px 흰 보더)
 *   셀1 검정 / 셀2 주황 / 셀3 흰 — 색감으로 위계 표현
 * ──────────────────────────────────────────────────────────────── */
function WhyUs({ isKo }: { isKo: boolean }) {
  const pillars = [
    {
      no: "01",
      titleKo: "직접 현장 검증",
      titleEn: "On-site verification",
      descKo:
        "모든 매체를 담당자가 직접 방문하여 시인성·노출 환경·유동인구를 확인합니다. 사진과 리포트로 기록된 검증 데이터 제공.",
      descEn:
        "Every media is personally verified on site for visibility, exposure, and traffic. Documented with photos and reports.",
      tag: "100% SITE VISITS",
      tone: "black" as const,
    },
    {
      no: "02",
      titleKo: "1년+ 축적 데이터",
      titleEn: "1+ year of data",
      descKo:
        "단기 캠페인이 아닌 1년 이상 축적된 매체별 효과 데이터로 ROI 검증된 매체만 추천합니다.",
      descEn:
        "Recommendations come from 1+ year of compounded performance data, not short-term tests.",
      tag: "DATA-DRIVEN",
      tone: "accent" as const,
    },
    {
      no: "03",
      titleKo: "계약~사후 책임 관리",
      titleEn: "End-to-end ownership",
      descKo:
        "계약·설치·집행·모니터링·리포팅·사후관리까지 전 과정을 싱커드가 책임집니다.",
      descEn:
        "Contract, install, run, monitor, report, post-care — all under one roof.",
      tag: "ONE-STOP",
      tone: "white" as const,
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="05"
        category="Why Us"
        title={
          isKo ? (
            <>
              왜 <span className="bx-accent">[싱커드]</span>인가.
            </>
          ) : (
            <>
              Why <span className="bx-accent">[THINKAD]</span>.
            </>
          )
        }
        meta={isKo ? "Three Pillars" : "Three Pillars"}
      />
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {pillars.map((p, i) => {
          const toneCls =
            p.tone === "black"
              ? "bg-bx-black text-bx-white"
              : p.tone === "accent"
                ? "bg-bx-accent text-bx-white"
                : "bg-bx-white text-bx-black";
          const labelCls =
            p.tone === "white"
              ? "text-bx-gray-dim"
              : p.tone === "accent"
                ? "text-bx-black"
                : "text-bx-gray";
          const tagBg =
            p.tone === "white"
              ? "border-bx-black bg-bx-white text-bx-black"
              : p.tone === "accent"
                ? "border-bx-black bg-bx-black text-bx-white"
                : "border-bx-white bg-bx-black text-bx-accent";
          return (
            <article
              key={p.no}
              className={[
                "flex flex-col p-8 sm:p-10 lg:p-12",
                toneCls,
                // 셀 사이 — lg에서는 2px 흰 보더로 분할 (검정/주황 위 흰 라인)
                i > 0 ? "border-t-2 lg:border-l-2 lg:border-t-0" : "",
                p.tone === "white" ? "border-bx-black" : "border-bx-white",
              ].join(" ")}
            >
              <p
                className={`font-mono text-[12px] font-bold uppercase tracking-[0.22em] ${labelCls}`}
              >
                {p.no} / {isKo ? p.titleKo : p.titleEn}
              </p>
              <h3 className="mt-8 font-extrabold leading-[0.96] tracking-[-0.02em] [font-size:clamp(2rem,3.5vw,2.5rem)]">
                {isKo ? p.titleKo : p.titleEn}
              </h3>
              <p className="mt-6 text-sm leading-relaxed sm:text-base">
                {isKo ? p.descKo : p.descEn}
              </p>
              <span
                className={`mt-auto inline-flex w-fit items-center border-2 px-3 py-1.5 pt-10 font-mono text-[11px] font-bold uppercase tracking-[0.22em] ${tagBg}`}
                style={{ paddingTop: "6px" }}
              >
                {p.tag}
              </span>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 9. TESTIMONIALS — SectionHead [06] / Voices + 3컬
 *   각 셀: 상단 메타바(카테고리 + 주황 결과 박스) → 큰 인용문 → 작성자/회사
 *   data/testimonials.ts 의 상위 3건 사용.
 * ──────────────────────────────────────────────────────────────── */
function Testimonials({ isKo }: { isKo: boolean }) {
  const list = testimonials.slice(0, 3);
  if (list.length === 0) return null;

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="06"
        category="Voices"
        title={
          isKo ? (
            <>
              광고주가 <span className="bx-accent">[직접]</span> 전하는 이야기.
            </>
          ) : (
            <>
              Voices, <span className="bx-accent">[direct]</span> from clients.
            </>
          )
        }
        meta={isKo ? "Real voices" : "Real voices"}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t, i) => (
          <article
            key={t.id}
            className={[
              "flex flex-col bg-bx-white",
              "border-bx-black",
              i > 0 ? "border-t-2 sm:border-t-0" : "",
              i % 2 === 1 ? "sm:border-l-2" : "",
              i >= 2 ? "sm:border-t-2 lg:border-t-0" : "",
              "lg:border-l-2",
              i === 0 ? "lg:border-l-0" : "",
            ].join(" ")}
          >
            {/* 상단 메타바 — 카테고리 + 주황 결과 박스 */}
            <div className="flex items-stretch justify-between border-b-2 border-bx-black">
              <span className="px-5 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-black sm:px-6">
                [ {isKo ? t.industryKo : t.industryEn} ]
              </span>
              <span className="bg-bx-accent px-4 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-bx-white sm:px-5">
                {isKo ? t.metricKo : t.metricEn}
              </span>
            </div>

            {/* 큰 인용문 */}
            <blockquote className="flex-1 p-6 sm:p-8">
              <p className="text-lg font-medium leading-snug tracking-tight text-bx-black sm:text-xl">
                <span className="text-bx-accent">&ldquo;</span>
                {isKo ? t.bodyKo : t.bodyEn}
                <span className="text-bx-accent">&rdquo;</span>
              </p>
            </blockquote>

            {/* 하단 — 작성자 + 회사 */}
            <div className="border-t-2 border-bx-black bg-bx-off p-5 sm:p-6">
              <p className="text-sm font-bold text-bx-black">
                {isKo ? t.nameKo : t.nameEn}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                // {isKo ? t.companyKo : t.companyEn}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 10. FINAL CTA — 검정 배경, 2:1 그리드
 *   좌측 (2컬): [ → ] / Get Started + 거대 카피 (italic outline + accent)
 *   우측 (1컬): Response Time / 24h + 설명 + 버튼 스택
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
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* 좌측 — lg 2컬 */}
        <div className="border-bx-white px-6 py-14 sm:px-10 sm:py-20 lg:col-span-2 lg:border-r-2 lg:px-12 lg:py-24">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray">
            <span className="text-bx-accent">[ → ]</span>
            <span className="ml-2"> / Get Started</span>
          </p>
          <h2 className="mt-8 font-extrabold leading-[0.92] tracking-[-0.03em] [font-size:clamp(2.5rem,7vw,6rem)]">
            {isKo ? (
              <>
                <span className="block">당신의 브랜드를</span>
                <span className="block">
                  <span className="bx-outline">도시</span>{" "}
                  <span className="bx-accent">위에</span>.
                </span>
              </>
            ) : (
              <>
                <span className="block">Put your brand</span>
                <span className="block">
                  <span className="bx-outline">on the</span>{" "}
                  <span className="bx-accent">streets</span>.
                </span>
              </>
            )}
          </h2>
        </div>

        {/* 우측 — Response Time + 버튼 */}
        <aside className="flex flex-col gap-8 border-t-2 border-bx-white px-6 py-14 sm:px-10 lg:border-t-0 lg:px-10 lg:py-24">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray">
              Response Time
            </p>
            <p className="mt-3 text-5xl font-extrabold leading-none tracking-tight text-bx-accent">
              24h
            </p>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-bx-gray">
              {isKo
                ? "30초 신청 · 24시간 내 전문 컨설턴트 회신"
                : "30s application · expert contact within 24h"}
            </p>
          </div>
          <div className="flex flex-col">
            <BtnBlock
              href="/contact"
              variant="accent"
              stack
              className="w-full justify-between"
            >
              {t("ctaBanner.cta")}
            </BtnBlock>
            <BtnBlock
              href="/media"
              variant="secondary"
              icon={false}
              className="w-full justify-between border-bx-white bg-bx-black text-bx-white hover:bg-bx-white hover:text-bx-black"
            >
              <span>{isKo ? "매체 카탈로그" : "Browse media"}</span>
              <ArrowRight className="h-4 w-4" aria-hidden />
            </BtnBlock>
          </div>
        </aside>
      </div>
    </section>
  );
}
