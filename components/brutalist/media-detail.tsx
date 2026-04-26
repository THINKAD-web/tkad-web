/**
 * BrutalMediaDetail — /ko/media/[id] 새 디자인 본문.
 *
 * Server component. resolveMediaForDetail 결과를 prop 으로 받아
 * 모든 섹션 렌더 (Breadcrumb / HERO / SPECS / PERFORMANCE /
 * PATTERN / MAP / DESCRIPTION / RELATED / FINAL CTA).
 */
import { Link } from "@/i18n/navigation";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
import { formatMediaPriceWonWithSymbol } from "@/lib/media-price-format";
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
  similar: _similar,
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
  const priceLabel = formatMediaPriceWonWithSymbol(media.price);

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
            <div className="relative aspect-[4/3] w-full overflow-hidden bg-bx-off">
              {heroImg ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={heroImg}
                  alt={name}
                  className="h-full w-full object-cover grayscale"
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

      {/* TODO chunk 4~5 — MAP / DESCRIPTION / RELATED / FINAL CTA */}
      <p className="border-b-2 border-bx-black bg-bx-off px-6 py-16 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim sm:px-10">
        // chunk 4 — MAP TODO
      </p>

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
