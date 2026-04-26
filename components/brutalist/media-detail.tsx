/**
 * BrutalMediaDetail — /ko/media/[id] 새 디자인 본문.
 *
 * Server component. resolveMediaForDetail 결과를 prop 으로 받아
 * 모든 섹션 렌더 (Breadcrumb / HERO / SPECS / PERFORMANCE /
 * PATTERN / MAP / DESCRIPTION / RELATED / FINAL CTA).
 *
 * 청크별 빌드:
 *   chunk 1 (현재) — Breadcrumb + HERO
 *   chunk 2~5 — 나머지 섹션 점진 추가
 */
import { Link } from "@/i18n/navigation";
import { getPrimaryMediaImageUrl, type MediaItem } from "@/lib/media-data";
import { formatMediaPriceWonWithSymbol } from "@/lib/media-price-format";
import { BtnBlock } from "@/components/brutalist";

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

      {/* TODO chunk 2~5 — SPECS / PERFORMANCE / PATTERN / MAP / DESCRIPTION / RELATED / FINAL CTA */}
      <p className="border-b-2 border-bx-black bg-bx-off px-6 py-16 text-center font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim sm:px-10">
        // chunk 2 — SPECS + PERFORMANCE TODO
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
