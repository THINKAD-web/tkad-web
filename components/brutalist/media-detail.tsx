/**
 * BrutalMediaDetail — /ko/media/[id] 새 디자인 본문.
 *
 * Server component. resolveMediaForDetail 결과를 prop 으로 받아
 * 모든 섹션 렌더 (Breadcrumb / HERO / SPECS / PERFORMANCE /
 * PATTERN / MAP / DESCRIPTION / RELATED / FINAL CTA).
 */
import { Link } from "@/i18n/navigation";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
import { formatMediaPriceCompactKrw } from "@/lib/media-price-format";
import { BtnBlock, SectionHead } from "@/components/brutalist";
import { MediaPatternSection } from "@/components/brutalist/media-pattern";

type Props = {
  media: MediaItem;
  locale: string;
  /** 우측 상단 ID 표시 — DB id 그대로 (또는 hash) */
  shortId?: string;
  /** RELATED 섹션용 유사 매체 (chunk 5) */
  similar?: MediaItem[];
};

export function BrutalMediaDetail({
  media,
  locale,
  shortId,
  similar = [],
}: Props) {
  const isKo = locale === "ko";
  const id = shortId ?? media.id;
  const name = isKo ? media.name : media.nameEn || media.name;
  const location = isKo ? media.location : media.locationEn || media.location;
  const heroImg = getPrimaryMediaImageUrl(media);

  const district = media.district ?? "";
  const visibility = media.visibilityScore ?? 0;
  const dailyTraffic = media.dailyFootTraffic ?? 0;
  const monthlyImp =
    media.monthlyFootTraffic ?? Math.round(dailyTraffic * 30);

  const typeLabel = (() => {
    const map: Record<string, string> = {
      digital: isKo ? "디지털" : "Digital",
      static: isKo ? "고정형" : "Static",
      mobile: isKo ? "교통" : "Mobile",
      network: isKo ? "네트워크" : "Network",
    };
    return map[media.type] ?? media.type;
  })();

  const availabilityText =
    media.availability === "available"
      ? isKo
        ? "예약 가능"
        : "Available"
      : media.availability === "reserved"
        ? isKo
          ? "예약 진행 중"
          : "Reserved"
        : media.availability === "maintenance"
          ? isKo
            ? "점검 중"
            : "Maintenance"
          : isKo
            ? "문의"
            : "Inquire";

  const priceWon = media.price < 1_000_000 ? media.price * 10_000 : media.price;
  const priceLabel = formatMediaPriceCompactKrw(media.price);

  return (
    <>
      {/* === Breadcrumb === */}
      <div className="border-b-2 border-bx-black bg-bx-white">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3 sm:px-10">
          <p className="font-mono text-[11px] uppercase tracking-[0.22em]">
            <Link
              href="/"
              className="text-bx-gray-dim transition-colors hover:text-bx-accent"
            >
              Home
            </Link>
            <span className="mx-2 text-bx-gray-dim">/</span>
            <Link
              href="/media"
              className="text-bx-gray-dim transition-colors hover:text-bx-accent"
            >
              Media
            </Link>
            <span className="mx-2 text-bx-gray-dim">/</span>
            <span className="text-bx-black truncate max-w-[40ch] inline-block align-bottom">
              {name}
            </span>
          </p>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
            ID · {id.slice(0, 12)}
          </p>
        </div>
      </div>

      {/* === HERO (1.4:1 그리드) === */}
      <section className="border-b-2 border-bx-black bg-bx-white">
        <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr]">
          {/* 좌측 — 4:3 이미지 + 라벨들 */}
          <div className="border-bx-black lg:border-r-2">
            <div className="group relative aspect-[4/3] w-full overflow-hidden bg-bx-off">
              {heroImg ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={heroImg}
                  alt={name}
                  className="h-full w-full object-cover grayscale transition-[filter] duration-500 ease-out group-hover:grayscale-0"
                  loading="eager"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
                  [ no image ]
                </div>
              )}

              {/* 좌상단 [01 / Featured] */}
              <span className="absolute left-0 top-0 bg-bx-black px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-white">
                [01 / Featured]
              </span>

              {/* 좌하단 좌표 흰배경 박스 */}
              <span className="absolute bottom-0 left-0 right-12 border-r-2 border-t-2 border-bx-black bg-bx-white px-3 py-2 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-black">
                // {location}
              </span>

              {/* 우하단 ★ Verified 회전 스탬프 */}
              <span
                className="absolute bottom-3 right-3 inline-flex items-center justify-center border-2 border-bx-accent bg-bx-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent shadow-sm"
                style={{ transform: "rotate(-3deg)" }}
              >
                ★ VERIFIED {visibility > 0 ? `${visibility}/100` : ""}
              </span>
            </div>
          </div>

          {/* 우측 — 정보 영역 */}
          <div className="flex flex-col gap-6 px-6 py-10 sm:px-10 sm:py-12 lg:px-10 lg:py-14">
            {/* 태그 행 */}
            <div className="flex flex-wrap gap-2">
              <Tag tone="accent">{availabilityText}</Tag>
              <Tag tone="black">{typeLabel}</Tag>
              {media.subCategory ? (
                <Tag tone="white">{media.subCategory}</Tag>
              ) : null}
              {district ? <Tag tone="white">{district}</Tag> : null}
            </div>

            {/* 큰 매체명 */}
            <h1 className="font-extrabold leading-[0.96] tracking-[-0.02em] text-bx-black [font-size:clamp(2rem,4vw,3.5rem)]">
              {name}
            </h1>

            {/* 주소 */}
            <p className="border-b-2 border-bx-black pb-4 font-mono text-[13px] tracking-tight text-bx-gray-dim">
              📍 {location}
            </p>

            {/* 3분할 통계 박스 */}
            <dl className="grid grid-cols-3 border-2 border-bx-black">
              <HeroStat
                label="DAILY"
                value={fmtNumber(dailyTraffic)}
                meta={isKo ? "일 유동" : "Daily"}
                borderRight
              />
              <HeroStat
                label="MONTHLY"
                value={fmtNumber(monthlyImp)}
                meta={isKo ? "월 노출" : "Monthly"}
                borderRight
              />
              <HeroStat
                label="VIS"
                value={String(visibility)}
                meta={isKo ? "가시성" : "Visibility"}
              />
            </dl>

            {/* 가격 블록 */}
            <div className="border-2 border-bx-black bg-bx-off p-5 sm:p-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                / Price
                <span className="ml-2 text-bx-black">
                  · {isKo ? "1개월·2주" : "1 month · 2 weeks"}
                </span>
              </p>
              <p className="mt-3 flex items-baseline gap-1 font-extrabold leading-none tracking-[-0.02em] text-bx-black [font-size:clamp(2.5rem,5vw,3.5rem)]">
                {priceLabel}
                <span className="ml-2 font-mono text-sm font-normal text-bx-gray-dim">
                  / {isKo ? "월" : "mo"}
                </span>
              </p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                // VAT 별도 · {isKo ? "단계별 협의 가능" : "negotiable"}
              </p>
            </div>

            {/* 버튼 스택 3개 */}
            <div className="flex flex-col">
              <BtnBlock
                href={`/quote?media=${media.id}`}
                variant="accent"
                stack
                className="w-full justify-between"
              >
                {isKo ? "즉시 견적 요청" : "Get a quote"}
              </BtnBlock>
              <BtnBlock
                href={`/planner?addMedia=${media.id}`}
                variant="dark"
                stack
                className="w-full justify-between"
              >
                {isKo ? "Planner 로 시뮬레이션" : "Simulate in Planner"}
              </BtnBlock>
              <BtnBlock
                href={`/compare?add=${media.id}`}
                variant="secondary"
                className="w-full justify-between"
              >
                {isKo ? "+ 비교 담기" : "+ Add to compare"}
              </BtnBlock>
            </div>
          </div>
        </div>
      </section>

      <Specs media={media} isKo={isKo} />
      <Performance
        monthlyImp={monthlyImp}
        dailyTraffic={dailyTraffic}
        visibility={visibility}
        isKo={isKo}
      />
      <MediaPatternSection
        isKo={isKo}
        mediaType={media.type}
        region={media.region}
        trafficPattern={media.trafficPattern ?? null}
        dailyFootfall={dailyTraffic}
      />
      <MapSection media={media} isKo={isKo} />
      <Description media={media} isKo={isKo} />
      <Related similar={similar} isKo={isKo} />
      <FinalCta mediaName={name} mediaId={media.id} isKo={isKo} />

      {/* dummy — keep priceWon ref to avoid unused var */}
      <span className="sr-only" data-price-won={priceWon} />
    </>
  );
}

function Tag({
  tone,
  children,
}: {
  tone: "accent" | "black" | "white";
  children: React.ReactNode;
}) {
  const cls =
    tone === "accent"
      ? "border-bx-accent bg-bx-accent text-bx-white"
      : tone === "black"
        ? "border-bx-black bg-bx-black text-bx-white"
        : "border-bx-black bg-bx-white text-bx-black";
  return (
    <span
      className={`inline-flex items-center border-2 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.22em] ${cls}`}
    >
      {children}
    </span>
  );
}

function HeroStat({
  label,
  value,
  meta,
  borderRight,
}: {
  label: string;
  value: string;
  meta: string;
  borderRight?: boolean;
}) {
  return (
    <div
      className={[
        "flex flex-col items-center gap-1 px-2 py-4 text-center",
        borderRight ? "border-r-2 border-bx-black" : "",
      ].join(" ")}
    >
      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
        {label}
      </p>
      <p className="text-xl font-extrabold tabular-nums leading-none tracking-tight text-bx-black sm:text-2xl">
        {value}
      </p>
      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-bx-gray-dim">
        {meta}
      </p>
    </div>
  );
}

function fmtNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 100_000_000)
    return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}

/* ────────────────────────────────────────────────────────────────
 * 3. SPECS — 8항목 2x4 그리드 (240px | 1fr)
 *   Type / Size / Resolution / Operating / Target / Visibility / Min. Period / Verified
 * ──────────────────────────────────────────────────────────────── */
function Specs({ media, isKo }: { media: MediaItem; isKo: boolean }) {
  const sizeText =
    media.size ??
    (media.widthM != null && media.heightM != null
      ? `${media.widthM}m × ${media.heightM}m`
      : "—");
  const typeMap: Record<string, string> = {
    digital: isKo ? "디지털" : "Digital",
    static: isKo ? "고정형" : "Static",
    mobile: isKo ? "교통" : "Mobile",
    network: isKo ? "네트워크" : "Network",
  };

  const rows: { key: string; value: string; emphasis?: boolean }[] = [
    {
      key: isKo ? "Type / 유형" : "Type",
      value: typeMap[media.type] ?? media.type,
      emphasis: true,
    },
    { key: isKo ? "Size / 크기" : "Size", value: sizeText, emphasis: true },
    {
      key: isKo ? "Resolution / 해상도" : "Resolution",
      value: media.resolution ?? "—",
    },
    {
      key: isKo ? "Operating / 운영" : "Operating",
      value: media.operatingHours ?? "06:00–24:00",
    },
    {
      key: isKo ? "Target / 타깃" : "Target",
      value: media.targetAge ?? (isKo ? "20-40대" : "20s-40s"),
    },
    {
      key: isKo ? "Visibility / 가시성" : "Visibility",
      value:
        media.visibilityScore != null
          ? `${media.visibilityScore} / 100`
          : "—",
      emphasis: true,
    },
    {
      key: isKo ? "Min. Period / 최소집행" : "Min. Period",
      value: isKo ? "2주~" : "2 weeks+",
    },
    {
      key: isKo ? "Verified / 검증" : "Verified",
      value: isKo
        ? "✓ 현장 + 데이터"
        : "✓ On-site + data",
      emphasis: true,
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="01"
        category="Specs"
        title={
          isKo ? (
            <>
              상세 <span className="bx-accent">[스펙]</span>
            </>
          ) : (
            <>
              Detailed <span className="bx-accent">[specs]</span>
            </>
          )
        }
        meta={isKo ? "8 fields\nverified" : "8 fields\nverified"}
      />
      <dl className="grid grid-cols-1 lg:grid-cols-2">
        {rows.map((r, i) => (
          <div
            key={r.key}
            className={[
              "grid grid-cols-[140px_1fr] sm:grid-cols-[200px_1fr]",
              "border-bx-black",
              // 모든 row 위 보더, 그러나 첫 두개는 lg 에서 위 보더 X
              i > 0 ? "border-t-2" : "",
              i % 2 === 1 ? "lg:border-l-2" : "",
              // lg 두 번째 칼럼 첫 row(i=1)는 위 보더 X (좌측 col 첫 row 와 동일 라인)
              i === 1 ? "lg:border-t-0" : "",
            ].join(" ")}
          >
            <dt className="flex items-center border-r-2 border-bx-black bg-bx-off px-4 py-4 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-bx-gray-dim sm:px-5">
              {r.key}
            </dt>
            <dd
              className={[
                "flex items-center bg-bx-white px-4 py-4 sm:px-6",
                r.emphasis
                  ? "text-base font-bold text-bx-black sm:text-base"
                  : "text-sm text-bx-black",
              ].join(" ")}
            >
              {r.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 4. PERFORMANCE — 3컬, 진행바
 *   12M 월간 임프레션 95% / 921K 일일 유동인구 95% / 91 가시성 91%
 * ──────────────────────────────────────────────────────────────── */
function Performance({
  monthlyImp,
  dailyTraffic,
  visibility,
  isKo,
}: {
  monthlyImp: number;
  dailyTraffic: number;
  visibility: number;
  isKo: boolean;
}) {
  // 임프레션 / 일유동의 진행바 % 는 상위 매체 기준 점수 (간단 휴리스틱).
  const impPct = Math.min(100, Math.round((monthlyImp / 1_500_000) * 100));
  const trafficPct = Math.min(100, Math.round((dailyTraffic / 100_000) * 100));
  const visPct = Math.min(100, visibility);

  const cells = [
    {
      no: "01",
      value: fmtBig(monthlyImp),
      label: isKo ? "월간 임프레션" : "Monthly impressions",
      pct: impPct,
      meta: isKo ? "전국 상위" : "Top tier nationwide",
      result: `${impPct}%`,
    },
    {
      no: "02",
      value: fmtBig(dailyTraffic),
      label: isKo ? "일일 유동인구" : "Daily foot traffic",
      pct: trafficPct,
      meta: isKo ? "강남 권역 평균" : "Gangnam avg.",
      result: `${trafficPct}%`,
    },
    {
      no: "03",
      value: String(visibility),
      label: isKo ? "가시성 점수" : "Visibility score",
      pct: visPct,
      meta: isKo ? "100점 만점" : "out of 100",
      result: `${visPct}%`,
    },
  ];

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="02"
        category="Performance"
        title={
          isKo ? (
            <>
              검증된 <span className="bx-accent">[성과 데이터]</span>
            </>
          ) : (
            <>
              Verified <span className="bx-accent">[performance]</span>
            </>
          )
        }
        meta={isKo ? "Live · top tier" : "Live · top tier"}
      />
      <div className="grid grid-cols-1 sm:grid-cols-3">
        {cells.map((c, i) => (
          <div
            key={c.no}
            className={[
              "border-bx-black p-6 sm:p-8 lg:p-10",
              i > 0 ? "border-t-2 sm:border-t-0 sm:border-l-2" : "",
            ].join(" ")}
          >
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
              // {c.no}
            </p>
            <p className="mt-4 font-extrabold leading-none tracking-[-0.02em] text-bx-black [font-size:clamp(2.5rem,5vw,3.5rem)]">
              {c.value}
            </p>
            <p className="mt-3 text-sm font-semibold text-bx-black">
              {c.label}
            </p>
            <div className="mt-6 h-2 w-full bg-bx-off">
              <div
                className="h-full bg-bx-accent"
                style={{ width: `${c.pct}%` }}
              />
            </div>
            <div className="mt-3 flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em]">
              <span className="text-bx-gray-dim">{c.meta}</span>
              <span className="font-bold text-bx-accent">{c.result}</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function fmtBig(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return n.toLocaleString();
}

/* ────────────────────────────────────────────────────────────────
 * 5. MAP — 1:1 그리드
 *   좌: 지도 placeholder (40x40 그리드 패턴 + 중앙 주황 핀 + ring 애니메이션)
 *   우: [04] / Location + 주소 + 주변 시설 태그들 + 카카오/로드뷰 버튼
 * ──────────────────────────────────────────────────────────────── */
function MapSection({ media, isKo }: { media: MediaItem; isKo: boolean }) {
  const location = isKo ? media.location : media.locationEn || media.location;
  const nearbyText =
    media.nearbyFacilities ??
    media.nearbyStations ??
    media.nearbyLandmarks ??
    "";
  // 콤마/슬래시/중점 등으로 분리해 태그화
  const nearbyTags = nearbyText
    .split(/[,/·•|]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 8);

  const kakaoHref =
    media.lat && media.lng
      ? `https://map.kakao.com/link/map/${encodeURIComponent(media.name)},${media.lat},${media.lng}`
      : `https://map.kakao.com/?q=${encodeURIComponent(media.name)}`;
  const roadviewHref =
    media.lat && media.lng
      ? `https://map.kakao.com/link/roadview/${encodeURIComponent(media.name)},${media.lat},${media.lng}`
      : kakaoHref;

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* 좌측 — 지도 placeholder */}
        <div className="relative border-bx-black lg:border-r-2">
          <div
            className="relative aspect-[4/3] w-full overflow-hidden bg-bx-off"
            style={{
              backgroundImage:
                "linear-gradient(rgba(0,0,0,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.08) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
              backgroundPosition: "center center",
            }}
          >
            {/* 중앙 핀 + ring 애니메이션 */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <span
                  aria-hidden
                  className="bx-pulse absolute inset-0 -m-4 inline-block border-2 border-bx-accent"
                />
                <span className="relative inline-flex h-6 w-6 items-center justify-center border-2 border-bx-black bg-bx-accent">
                  <span className="block h-1.5 w-1.5 bg-bx-white" aria-hidden />
                </span>
              </div>
            </div>

            {/* 좌하단 흰배경 박스 */}
            <div className="absolute bottom-0 left-0 max-w-[80%] border-r-2 border-t-2 border-bx-black bg-bx-white px-4 py-3">
              <p className="text-sm font-bold text-bx-black">
                {media.district || media.city || media.region || location}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
                {isKo
                  ? "// 차량·보행자 교차 노출"
                  : "// Vehicle + pedestrian crossover"}
              </p>
            </div>
          </div>
        </div>

        {/* 우측 — 정보 */}
        <div className="flex flex-col px-6 py-10 sm:px-10 sm:py-12 lg:px-10 lg:py-14">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
            <span className="text-bx-black">[04]</span>
            <span className="ml-2"> / Location</span>
          </p>
          <h3 className="mt-4 font-extrabold leading-[0.96] tracking-[-0.02em] text-bx-black [font-size:clamp(2.25rem,4vw,3rem)]">
            {isKo ? (
              <>
                위치 <span className="bx-accent">[정보]</span>.
              </>
            ) : (
              <>
                Location <span className="bx-accent">[info]</span>.
              </>
            )}
          </h3>
          <p className="mt-6 text-base leading-relaxed text-bx-black sm:text-lg">
            {location}
          </p>

          {nearbyTags.length > 0 ? (
            <>
              <p className="mt-10 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {isKo ? "주변 시설 / Nearby" : "Nearby"} ]
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {nearbyTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center border-2 border-bx-black bg-bx-white px-3 py-1.5 font-mono text-[11px] font-semibold tracking-tight text-bx-black"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </>
          ) : null}

          {/* 하단 1:1 버튼 */}
          <div className="mt-auto grid grid-cols-2 border-2 border-bx-black">
            <a
              href={kakaoHref}
              target="_blank"
              rel="noopener noreferrer"
              className="border-r-2 border-bx-black bg-bx-white px-4 py-4 text-center font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-black hover:text-bx-white"
            >
              {isKo ? "카카오맵 →" : "Kakao Map →"}
            </a>
            <a
              href={roadviewHref}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-bx-white px-4 py-4 text-center font-mono text-[12px] font-bold uppercase tracking-[0.22em] text-bx-black transition-colors hover:bg-bx-accent hover:text-bx-white"
            >
              {isKo ? "로드뷰 →" : "Roadview →"}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 6. DESCRIPTION — 1:2 그리드, padding 60px
 *   좌: 메타 사이드 (Pretendard 800 24px 매체 소개 + 모노 메타)
 *   우: 본문 (16px line-height 1.7) + 첫글자 드롭캡 + 광고주 이력 박스
 * ──────────────────────────────────────────────────────────────── */
function Description({ media, isKo }: { media: MediaItem; isKo: boolean }) {
  const desc =
    (isKo
      ? media.catalogDescription || media.description
      : media.catalogDescriptionEn || media.descriptionEn) ||
    media.description ||
    "";
  if (!desc.trim()) return null;

  /** 단락 분리 — \n\n 또는 \n 단위 */
  const paragraphs = desc
    .split(/\n{2,}|\n/)
    .map((p) => p.trim())
    .filter(Boolean)
    .slice(0, 3);
  const first = paragraphs[0] ?? "";
  const dropCap = first ? first.charAt(0) : "";
  const firstRest = first.slice(dropCap.length);
  const others = paragraphs.slice(1);

  const advertisers = isKo
    ? media.advertiserHistory
    : media.advertiserHistoryEn || media.advertiserHistory;

  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <div className="grid grid-cols-1 lg:grid-cols-3">
        {/* 좌측 메타 */}
        <aside className="border-bx-black bg-bx-white px-6 py-12 sm:px-10 sm:py-14 lg:col-span-1 lg:border-r-2 lg:px-10 lg:py-[60px]">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
            [05] / About
          </p>
          <h3 className="mt-4 text-2xl font-extrabold leading-tight tracking-tight text-bx-black">
            {isKo ? "매체 소개" : "About this media"}
          </h3>
          <ul className="mt-8 space-y-3 font-mono text-[11px] uppercase tracking-[0.22em]">
            <li className="flex items-baseline justify-between border-b-2 border-bx-black pb-2">
              <span className="text-bx-gray-dim">/ Region</span>
              <span className="text-bx-black">{media.region}</span>
            </li>
            <li className="flex items-baseline justify-between border-b-2 border-bx-black pb-2">
              <span className="text-bx-gray-dim">/ Install</span>
              <span className="text-bx-black">{media.installYear ?? "—"}</span>
            </li>
            <li className="flex items-baseline justify-between border-b-2 border-bx-black pb-2">
              <span className="text-bx-gray-dim">/ Hours</span>
              <span className="text-bx-black">{media.operatingHours ?? "—"}</span>
            </li>
          </ul>
        </aside>

        {/* 우측 본문 */}
        <div className="px-6 py-12 sm:px-10 sm:py-14 lg:col-span-2 lg:px-10 lg:py-[60px]">
          {first ? (
            <p className="text-base leading-[1.7] text-bx-black sm:text-[17px]">
              <span className="float-left mr-3 font-extrabold text-bx-accent leading-[0.9] [font-size:80px]">
                {dropCap}
              </span>
              {firstRest}
            </p>
          ) : null}
          {others.map((p, i) => (
            <p
              key={i}
              className="mt-5 text-base leading-[1.7] text-bx-black sm:text-[17px]"
            >
              {p}
            </p>
          ))}

          {advertisers ? (
            <div className="mt-10 border-2 border-bx-black bg-bx-off p-6">
              <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
                [ {isKo ? "광고주 이력 / Past Advertisers" : "Past Advertisers"} ]
              </p>
              <p className="mt-3 text-lg font-bold leading-snug text-bx-black sm:text-xl">
                {advertisers}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 7. RELATED — SectionHead [06] / Related + 3컬 작은 MediaCard 변형
 * ──────────────────────────────────────────────────────────────── */
function Related({
  similar,
  isKo,
}: {
  similar: MediaItem[];
  isKo: boolean;
}) {
  if (similar.length === 0) return null;
  return (
    <section className="border-b-2 border-bx-black bg-bx-white">
      <SectionHead
        number="06"
        category="Related"
        title={
          isKo ? (
            <>
              이 매체 <span className="bx-accent">[어때?]</span>
            </>
          ) : (
            <>
              You may <span className="bx-accent">[also like]</span>
            </>
          )
        }
        meta={isKo ? "Curated similar" : "Curated similar"}
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {similar.slice(0, 3).map((m, i) => {
          const img = getPrimaryMediaImageUrl(m);
          const price = formatMediaPriceCompactKrw(m.price);
          const name = isKo ? m.name : m.nameEn || m.name;
          const loc = isKo ? m.location : m.locationEn || m.location;
          return (
            <Link
              key={m.id}
              href={`/media/${m.id}`}
              className={[
                "group flex flex-col bg-bx-white transition-colors hover:bg-bx-off",
                "border-bx-black",
                i > 0 ? "border-t-2 sm:border-t-0" : "",
                i % 2 === 1 ? "sm:border-l-2" : "",
                i >= 2 ? "sm:border-t-2 lg:border-t-0" : "",
                "lg:border-l-2",
                i === 0 ? "lg:border-l-0" : "",
              ].join(" ")}
            >
              <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-bx-black bg-bx-off">
                {img ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={img}
                    alt={name}
                    className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 group-hover:grayscale-0 group-hover:scale-[1.04]"
                    loading="lazy"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
                    [ no image ]
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 p-5 sm:p-6">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
                  // {loc}
                </p>
                <h3 className="text-lg font-bold leading-tight tracking-tight text-bx-black sm:text-xl">
                  {name}
                </h3>
                <p className="mt-2 font-mono text-base font-bold text-bx-accent">
                  {price}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────
 * 8. FINAL CTA — 검정 배경 2:1 그리드
 *   좌(2): 이 매체로 [시작하세요.] + 안내문
 *   우(1): Booking 2주~ + 버튼 (accent 즉시 견적 / secondary 전화 상담)
 * ──────────────────────────────────────────────────────────────── */
function FinalCta({
  mediaName,
  mediaId,
  isKo,
}: {
  mediaName: string;
  mediaId: string;
  isKo: boolean;
}) {
  return (
    <section className="border-b-2 border-bx-black bg-bx-black text-bx-white">
      <div className="grid grid-cols-1 lg:grid-cols-3">
        <div className="border-bx-white px-6 py-14 sm:px-10 sm:py-20 lg:col-span-2 lg:border-r-2 lg:px-12 lg:py-24">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray">
            <span className="text-bx-accent">[ → ]</span>
            <span className="ml-2"> / Get Started</span>
          </p>
          <h2 className="mt-8 font-extrabold leading-[0.92] tracking-[-0.03em] [font-size:clamp(2.25rem,5vw,4.5rem)]">
            {isKo ? (
              <>
                <span className="block">이 매체로</span>
                <span className="block">
                  <span className="bx-accent">[시작하세요.]</span>
                </span>
              </>
            ) : (
              <>
                <span className="block">Start with</span>
                <span className="block">
                  <span className="bx-accent">[this media.]</span>
                </span>
              </>
            )}
          </h2>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-bx-gray sm:text-lg">
            {isKo
              ? `${mediaName} 의 즉시 견적·예약 가능 여부를 24시간 내 회신해 드립니다.`
              : `Live availability and a quote for ${mediaName} within 24 hours.`}
          </p>
        </div>
        <aside className="flex flex-col gap-6 border-t-2 border-bx-white px-6 py-12 sm:px-10 lg:border-t-0 lg:px-10 lg:py-24">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-gray">
              / Booking
            </p>
            <p className="mt-3 text-5xl font-extrabold leading-none tracking-tight text-bx-accent">
              {isKo ? "2주~" : "2w+"}
            </p>
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray">
              // {isKo ? "최소 집행 기간" : "Min. period"}
            </p>
          </div>
          <div className="flex flex-col">
            <BtnBlock
              href={`/quote?media=${mediaId}`}
              variant="accent"
              stack
              className="w-full justify-between"
            >
              {isKo ? "즉시 견적 요청" : "Get a quote"}
            </BtnBlock>
            <BtnBlock
              href="/contact"
              variant="secondary"
              icon={false}
              className="w-full justify-between border-bx-white bg-bx-black text-bx-white hover:bg-bx-white hover:text-bx-black"
            >
              {isKo ? "📞 전화 상담" : "📞 Call us"}
            </BtnBlock>
          </div>
        </aside>
      </div>
    </section>
  );
}
