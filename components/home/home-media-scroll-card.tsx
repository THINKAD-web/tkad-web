"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { ShieldCheck } from "lucide-react";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog-types";
import type { MediaItem } from "@/lib/media-data";
import { catalogThumbnailImageProps } from "@/lib/media-catalog-map";
import { resolveMediaCpmWon } from "@/lib/compare-quote";
import {
  formatCpmKrw,
  formatMediaPriceWithPeriodSuffix,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

type Props = {
  item: HomeCatalogMediaItem;
  href: string;
  isKo: boolean;
  priority?: boolean;
};

function catalogToMediaItem(item: HomeCatalogMediaItem): MediaItem {
  return {
    id: item.id,
    slug: item.slug,
    name: item.name,
    nameEn: item.name,
    location: item.location ?? item.region ?? "",
    locationEn: item.location ?? item.region ?? "",
    region: "seoul",
    type: "digital",
    price: item.price ?? 0,
    pricePeriod: item.pricePeriod,
    lat: 0,
    lng: 0,
    dailyFootTraffic: item.dailyFootTraffic ?? 0,
    visibilityScore: item.visibilityScore,
    sampleImages:
      item.galleryImages ?? (item.thumbnailUrl ? [item.thumbnailUrl] : []),
  };
}

function VerifiedBadge({ isKo }: { isKo: boolean }) {
  return (
    <span className="tkad-type-note absolute right-1.5 top-1.5 z-10 inline-flex items-center gap-0.5 rounded-md bg-black/55 px-1.5 py-0.5 font-semibold text-white backdrop-blur-sm">
      <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden />
      {isKo ? "검증" : "Verified"}
    </span>
  );
}

/** 홈 인기 캐러셀 — /media discovery 톤의 링크-only 티저 카드 (담기·비교 없음) */
export function HomeMediaScrollCard({
  item,
  href,
  isKo,
  priority,
}: Props) {
  const locale = isKo ? "ko-KR" : "en-US";
  const thumb = catalogThumbnailImageProps(item.thumbnailUrl);
  const regionLine = [item.region, item.type].filter(Boolean).join(" · ");
  const priceLabel =
    item.price && item.price > 0
      ? formatMediaPriceWithPeriodSuffix(item.price, item.pricePeriod, locale)
      : null;
  const cpm = resolveMediaCpmWon(catalogToMediaItem(item));

  return (
    <Link
      href={href}
      className={cn(
        "group w-44 shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5 sm:w-48 md:w-52",
      )}
    >
      <div className="relative aspect-[4/3] w-full bg-gray-100 dark:bg-gray-800">
        {thumb ? (
          <Image
            src={thumb.src}
            alt={item.name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 176px, 208px"
            priority={priority}
            unoptimized={thumb.unoptimized}
          />
        ) : (
          <div className="tkad-type-note flex h-full items-center justify-center text-tkad-muted">
            {isKo ? "준비중" : "No image"}
          </div>
        )}
        {item.isVerified ? <VerifiedBadge isKo={isKo} /> : null}
      </div>

      <div className="flex flex-col gap-1 p-3">
        <p className="tkad-type-title line-clamp-2 leading-snug text-foreground group-hover:text-tkad-accent">
          {item.name}
        </p>
        {regionLine ? (
          <p className="tkad-type-meta line-clamp-1 text-tkad-muted">
            {regionLine}
          </p>
        ) : null}
        {priceLabel ? (
          <p className="tkad-type-price-accent tkad-home-accent-text tabular-nums">
            {priceLabel}
          </p>
        ) : null}
        {cpm != null ? (
          <p className="tkad-type-note tabular-nums text-tkad-muted">
            CPM {formatCpmKrw(cpm, locale)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
