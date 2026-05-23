import { MediaCard } from "@/components/brutalist/media-card";
import {
  getPrimaryMediaImageUrl,
  type MediaItem,
  typeLabels,
} from "@/lib/media-data";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";

type Props = {
  items: MediaItem[];
  locale: string;
};

/**
 * 지역·유형·로컬 SEO 랜딩용 정적 매체 그리드 (SSG-safe, useSearchParams 없음).
 * 전체 필터·지도 탐색은 `/media` 로 안내.
 */
export function MediaKeywordLandingCatalog({ items, locale }: Props) {
  const isKo = locale === "ko" || locale.startsWith("ko");

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((m, index) => {
        const name = isKo ? m.name : m.nameEn || m.name;
        const location = isKo ? m.location : m.locationEn || m.location;
        const typeLabel = typeLabels[m.type]?.[isKo ? "ko" : "en"] ?? m.type;
        const price =
          m.price > 0 ? formatCatalogPriceFieldWon(m.price, locale) : undefined;

        return (
          <li key={m.id} className="list-none">
            <MediaCard
              href={mediaItemDetailPath(m)}
              imageSrc={getPrimaryMediaImageUrl(m)}
              imageAlt={name}
              imagePriority={index < 6}
              type={typeLabel}
              name={name}
              location={location}
              price={price}
              premium
              glowTheme="purple"
              className="h-full"
            />
          </li>
        );
      })}
    </ul>
  );
}
