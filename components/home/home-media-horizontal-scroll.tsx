import { MediaCard } from "@/components/brutalist/media-card";
import {
  getPrimaryMediaImageUrl,
  type MediaItem,
  typeLabels,
} from "@/lib/media-data";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { buildMediaCardHoverOverlay } from "@/lib/media-card-hover";
import { MediaTrustScoreBadge } from "@/components/media/media-trust-score";
import { pickTrustBadgesForThumbnail, trustBadgeLabel } from "@/lib/media-trust";
import { cn } from "@/lib/utils";

type Props = {
  items: MediaItem[];
  locale: string;
  /** 1 = 한 줄 가로 스크롤, 2 = 두 줄 가로 스크롤 */
  rows?: 1 | 2;
  showRankBadge?: boolean;
  density?: "default" | "compact";
  className?: string;
};

const COL_WIDTH =
  "w-[min(280px,calc(100vw-2.5rem))] sm:w-[min(300px,42vw)] lg:w-[min(320px,28vw)]";

/** 홈 추천·인기 — 가로 스크롤 캐러셀 (텍스트 overflow 방지) */
export function HomeMediaHorizontalScroll({
  items,
  locale,
  rows = 1,
  showRankBadge = false,
  density = "compact",
  className,
}: Props) {
  const isKo = locale === "ko";

  if (items.length === 0) return null;

  const card = (m: MediaItem, index: number) => {
    const name = isKo ? m.name : m.nameEn || m.name;
    const location = isKo ? m.location : m.locationEn || m.location;
    const typeLabel = typeLabels[m.type]?.[isKo ? "ko" : "en"] ?? m.type;
    const price =
      m.price > 0 ? formatCatalogPriceFieldWon(m.price, locale) : undefined;

    return (
      <li
        key={m.id}
        className={cn(
          "shrink-0 list-none",
          COL_WIDTH,
          "[&_h3]:line-clamp-2 [&_h3]:break-words [&_p.text-xs]:line-clamp-1",
        )}
      >
        <MediaCard
          href={mediaItemDetailPath(m.id)}
          imageSrc={getPrimaryMediaImageUrl(m)}
          imagePriority={index < 4}
          imageAlt={name}
          index={showRankBadge ? String(index + 1).padStart(2, "0") : undefined}
          type={typeLabel}
          name={name}
          location={location}
          price={price}
          premium
          glowTheme="purple"
          density={density}
          hoverOverlay={buildMediaCardHoverOverlay(m, locale)}
          className="h-full"
          footer={
            <>
              {m.trustScore != null ? (
                <MediaTrustScoreBadge
                  score={m.trustScore}
                  isKo={isKo}
                  compact
                  className="mt-1"
                />
              ) : null}
              {m.recommendReason ? (
                <p className="mt-1 line-clamp-1 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground">
                  {m.recommendReason}
                </p>
              ) : null}
            </>
          }
          topLeft={
            pickTrustBadgesForThumbnail(m.trustBadges, 1)[0] ? (
              <span className="font-mono text-[10px] font-bold uppercase tracking-wide">
                {trustBadgeLabel(
                  pickTrustBadgesForThumbnail(m.trustBadges, 1)[0]!,
                  isKo,
                )}
              </span>
            ) : undefined
          }
          topRight={
            m.isVerified ? (
              <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:text-white text-gray-900">
                VERIFIED
              </span>
            ) : undefined
          }
        />
      </li>
    );
  };

  if (rows === 2) {
    const half = Math.ceil(items.length / 2);
    const row1 = items.slice(0, half);
    const row2 = items.slice(half);

    return (
      <div
        className={cn(
          "mt-5 overflow-x-auto overscroll-x-contain pb-3 sm:mt-8 lg:mt-10",
          "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]",
          className,
        )}
      >
        <div className="flex w-max min-w-full flex-col gap-4 pr-4">
          <ul className="flex gap-4">{row1.map((m, i) => card(m, i))}</ul>
          {row2.length > 0 ? (
            <ul className="flex gap-4">{row2.map((m, i) => card(m, half + i))}</ul>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mt-5 overflow-x-auto overscroll-x-contain pb-3 sm:mt-8 lg:mt-10",
        "[scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.2)_transparent]",
        className,
      )}
    >
      <ul className="flex w-max min-w-full gap-4 pr-4">
        {items.map((m, i) => card(m, i))}
      </ul>
    </div>
  );
}
