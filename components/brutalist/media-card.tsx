/**
 * MediaCard — 브루탈리스트 매체 카드 (v2 스펙)
 *
 * - 2px 검정 보더, 사각, 4:3 이미지 + 정보 영역
 * - 이미지: grayscale(100%) → hover 시 grayscale(0%) + scale(1.04)
 * - 좌상단: 검정 배경 흰 글자 랭크 태그 (rank 있을 때만)
 * - 우상단: 흰 배경 + 검정 보더 타입 태그 (예: 디지털 / 고정형 / 교통)
 * - 우하단: 흰 배경 + 주황 보더 ★ Verified 또는 ★ Hot 스탬프, rotate(-3deg)
 * - 정보 영역:
 *     · 위치 + 가시성 점수 (모노 11px)
 *     · 매체명 (Pretendard sans, 강조)
 *     · 3분할 통계 (일유동 / 월노출 / 가격) — 위 2px 보더, 셀 사이 1px gray
 *       라벨 모노 9px, 값 18px 800
 */
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

export type MediaCardProps = {
  href: string;
  imageSrc?: string | null;
  imageAlt?: string;

  /** 좌상단 검정 박스 랭크 ([01], #1, 등 짧은 텍스트). 없으면 미노출 */
  rank?: string | number;
  /** 우상단 타입 태그 ([디지털], [고정형], [교통] 등) */
  type?: string;

  /** 우하단 회전 스탬프 */
  isVerified?: boolean;
  isHot?: boolean;

  /** 정보 영역 */
  location?: string;
  /** 0-100 가시성 점수 */
  visibility?: number | null;
  name: string;

  /** 3분할 통계 (모두 옵션). 하나도 없으면 통계 영역 자체 미렌더 */
  dailyTraffic?: number | null;
  monthlyImpression?: number | null;
  /** "₩2,400만/월" 같은 표시용 가격 문자열 */
  price?: string | null;

  className?: string;
};

function fmtNumber(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 100_000_000) return `${(n / 100_000_000).toFixed(1).replace(/\.0$/, "")}억`;
  if (n >= 10_000) return `${Math.round(n / 10_000).toLocaleString()}만`;
  return n.toLocaleString();
}

export function MediaCard({
  href,
  imageSrc,
  imageAlt,
  rank,
  type,
  isVerified,
  isHot,
  location,
  visibility,
  name,
  dailyTraffic,
  monthlyImpression,
  price,
  className,
}: MediaCardProps) {
  const hasStats =
    dailyTraffic != null || monthlyImpression != null || (price && price.length > 0);
  const stamp = isVerified ? "★ VERIFIED" : isHot ? "★ HOT" : null;

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex h-full flex-col border-2 border-bx-black bg-bx-white transition-colors duration-200 hover:bg-bx-off",
        className,
      )}
    >
      {/* 4:3 이미지 영역 */}
      <div className="relative aspect-[4/3] overflow-hidden border-b-2 border-bx-black bg-bx-off">
        {imageSrc ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imageSrc}
            alt={imageAlt ?? ""}
            className="h-full w-full object-cover grayscale transition-[filter,transform] duration-500 ease-out group-hover:grayscale-0 group-hover:scale-[1.04]"
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-mono text-[11px] uppercase tracking-[0.22em] text-bx-gray-dim">
            [ no image ]
          </div>
        )}

        {/* 좌상단 랭크 태그 */}
        {rank !== undefined && rank !== null && (
          <span className="absolute left-0 top-0 bg-bx-black px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-bx-white">
            {typeof rank === "number" ? `#${String(rank).padStart(2, "0")}` : rank}
          </span>
        )}

        {/* 우상단 타입 태그 */}
        {type && (
          <span className="absolute right-0 top-0 border-b-2 border-l-2 border-bx-black bg-bx-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-bx-black">
            [ {type} ]
          </span>
        )}

        {/* 우하단 회전 스탬프 */}
        {stamp && (
          <span
            className="absolute right-3 bottom-3 inline-flex items-center justify-center border-2 border-bx-accent bg-bx-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-bx-accent shadow-sm"
            style={{ transform: "rotate(-3deg)" }}
          >
            {stamp}
          </span>
        )}
      </div>

      {/* 정보 영역 */}
      <div className="flex flex-1 flex-col p-5 sm:p-6">
        {/* 위치 + 가시성 */}
        {(location || visibility != null) && (
          <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-[0.18em] text-bx-gray-dim">
            {location ? <span className="truncate">// {location}</span> : <span />}
            {visibility != null ? (
              <span className="shrink-0 pl-2 text-bx-black">
                ◇ {Math.round(visibility)}
              </span>
            ) : null}
          </div>
        )}

        {/* 매체명 */}
        <h3 className="mt-2 text-lg font-bold leading-tight tracking-tight text-bx-black sm:text-xl">
          {name}
        </h3>

        {/* 통계 — 3분할 */}
        {hasStats && (
          <dl className="mt-auto grid grid-cols-3 border-t-2 border-bx-black pt-4">
            <Stat
              label="DAILY"
              value={dailyTraffic != null ? fmtNumber(dailyTraffic) : "—"}
              borderRight
            />
            <Stat
              label="MONTHLY"
              value={
                monthlyImpression != null ? fmtNumber(monthlyImpression) : "—"
              }
              borderRight
            />
            <Stat label="PRICE" value={price && price.length > 0 ? price : "—"} />
          </dl>
        )}
      </div>
    </Link>
  );
}

function Stat({
  label,
  value,
  borderRight,
}: {
  label: string;
  value: string;
  borderRight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1 px-2 text-center",
        borderRight && "border-r border-bx-gray",
      )}
    >
      <dt className="font-mono text-[9px] font-bold uppercase tracking-[0.22em] text-bx-gray-dim">
        {label}
      </dt>
      <dd className="text-lg font-extrabold tabular-nums leading-none tracking-tight text-bx-black sm:text-[18px]">
        {value}
      </dd>
    </div>
  );
}
