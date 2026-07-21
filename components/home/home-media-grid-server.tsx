import { MediaCard } from "@/components/media/media-card";
import { type MediaItem } from "@/lib/media-data";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatMediaDisplayPrice } from "@/lib/media-price-format";
import { mapMediaItemToHomeCatalog } from "@/lib/media-catalog-map";

type Props = {
  items: MediaItem[];
  locale: string;
  /** featured 섹션에서 1–3 순번 라벨 */
  showRankBadge?: boolean;
  density?: "default" | "compact";
};

/** 홈 추천·인기 매체 — /media 와 동일 MediaCard(card) */
export function HomeMediaGridServer({
  items,
  locale,
  showRankBadge = false,
}: Props) {
  const isKo = locale.startsWith("ko");

  if (items.length === 0) return null;

  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((m, index) => {
        const priceLabel = formatMediaDisplayPrice(m, locale);

        return (
          <li key={m.id} className="min-w-0 list-none">
            <MediaCard
              mode="card"
              item={mapMediaItemToHomeCatalog(m)}
              href={mediaItemDetailPath(m)}
              priceLabel={priceLabel}
              isKo={isKo}
              rank={showRankBadge ? index + 1 : undefined}
              recommendReason={m.recommendReason}
              showPlanButton
            />
          </li>
        );
      })}
    </ul>
  );
}
