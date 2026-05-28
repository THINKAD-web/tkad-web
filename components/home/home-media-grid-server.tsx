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

type Props = {
  items: MediaItem[];
  locale: string;
  /** featured 섹션에서 1–3 순번 라벨 */
  showRankBadge?: boolean;
  density?: "default" | "compact";
};

/** 홈 추천·인기 매체 — 크롤러가 읽을 수 있는 서버 렌더 그리드 */
export function HomeMediaGridServer({
  items,
  locale,
  showRankBadge = false,
  density = "default",
}: Props) {
  const isKo = locale === "ko";

  if (items.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((m, index) => {
        const name = isKo ? m.name : m.nameEn || m.name;
        const location = isKo ? m.location : m.locationEn || m.location;
        const typeLabel = typeLabels[m.type]?.[isKo ? "ko" : "en"] ?? m.type;
        const price =
          m.price > 0 ? formatCatalogPriceFieldWon(m.price, locale) : undefined;

        return (
          <li key={m.id} className="min-w-0 list-none">
            <MediaCard
              href={mediaItemDetailPath(m)}
              imageSrc={getPrimaryMediaImageUrl(m)}
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
                    <p className="mt-1 line-clamp-1 text-[10px] font-semibold tracking-wide text-muted-foreground">
                      {m.recommendReason}
                    </p>
                  ) : null}
                </>
              }
              topLeft={
                pickTrustBadgesForThumbnail(m.trustBadges, 1)[0] ? (
                  <span className="font-display text-xs font-medium uppercase tracking-wide">
                    {trustBadgeLabel(
                      pickTrustBadgesForThumbnail(m.trustBadges, 1)[0]!,
                      isKo,
                    )}
                  </span>
                ) : undefined
              }
              topRight={
                m.isVerified ? (
                  <span className="inline-flex items-center gap-0.5 normal-case tracking-wide">
                    {isKo ? "검증" : "Verified"}
                  </span>
                ) : undefined
              }
            />
          </li>
        );
      })}
    </ul>
  );
}
