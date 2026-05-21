import { MediaCard } from "@/components/brutalist/media-card";
import {
  getPrimaryMediaImageUrl,
  type MediaItem,
  typeLabels,
} from "@/lib/media-data";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { buildMediaCardHoverOverlay } from "@/lib/media-card-hover";

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
              href={mediaItemDetailPath(m.id)}
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
                m.recommendReason ? (
                  <p className="mt-1 line-clamp-1 font-mono text-[10px] font-semibold tracking-wide text-muted-foreground">
                    {m.recommendReason}
                  </p>
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
      })}
    </ul>
  );
}
