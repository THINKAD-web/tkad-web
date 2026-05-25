import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { Star } from "lucide-react";
import { getTranslations } from "next-intl/server";
import {
  fetchHomeMediaForScroll,
  type HomeMediaFetchType,
} from "@/lib/home-media-fetch";
import {
  getPrimaryMediaImageUrl,
  type MediaItem,
  typeLabels,
} from "@/lib/media-data";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { resolveCatalogImageSrc } from "@/lib/optimized-image-url";
import { cn } from "@/lib/utils";

type Props = {
  locale: string;
  title: string;
  subtitle?: string;
  viewAllHref: string;
  fetchType: HomeMediaFetchType;
  limit?: number;
};

function badgeForType(
  fetchType: HomeMediaFetchType,
): "BEST" | "NEW" | null {
  if (fetchType === "recommended") return "BEST";
  if (fetchType === "newest") return "NEW";
  return null;
}

function MediaCard({
  media,
  locale,
  imagePreparingLabel,
  badge,
  priority,
}: {
  media: MediaItem;
  locale: string;
  imagePreparingLabel: string;
  badge: "BEST" | "NEW" | null;
  priority?: boolean;
}) {
  const isKo = locale.startsWith("ko");
  const name = isKo ? media.name : media.nameEn || media.name;
  const location = isKo ? media.location : media.locationEn || media.location;
  const typeLabel =
    typeLabels[media.type]?.[isKo ? "ko" : "en"] ?? media.type;
  const price =
    media.price > 0 ? formatCatalogPriceFieldWon(media.price, locale) : null;
  const rawUrl = getPrimaryMediaImageUrl(media);
  const resolved = rawUrl ? resolveCatalogImageSrc(rawUrl) : null;
  const rating = media.averageRating;

  return (
    <Link
      href={mediaItemDetailPath(media)}
      className={cn(
        "group relative w-40 shrink-0 snap-start overflow-hidden rounded-2xl border shadow-sm",
        "border-gray-100 bg-white dark:border-white/10 dark:bg-white/5",
        "md:w-48",
      )}
    >
      {badge ? (
        <span
          className={cn(
            "absolute left-2 top-2 z-10 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white",
            badge === "NEW" ? "bg-emerald-500" : "bg-violet-500",
          )}
        >
          {badge}
        </span>
      ) : null}
      <div className="relative h-28 w-full overflow-hidden bg-gray-100 dark:bg-white/5">
        {resolved?.src ? (
          <Image
            src={resolved.src}
            alt={name}
            fill
            className="object-cover transition-transform group-hover:scale-105"
            sizes="(max-width: 768px) 160px, 192px"
            priority={priority}
            unoptimized={resolved.unoptimized}
          />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-[11px] text-gray-400">
            {imagePreparingLabel}
          </span>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">
          {name}
        </p>
        <p className="mt-0.5 truncate text-xs text-gray-400 dark:text-white/50">
          {location} · {typeLabel}
        </p>
        {rating != null && rating > 0 ? (
          <p className="mt-1 flex items-center gap-0.5 text-xs text-amber-500">
            <Star className="h-3 w-3 fill-current" aria-hidden />
            {rating.toFixed(1)}
          </p>
        ) : null}
        {price ? (
          <p className="mt-1 text-sm font-bold text-violet-500 dark:text-violet-400">
            {price}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export async function HomeMediaScroll({
  locale,
  title,
  subtitle,
  viewAllHref,
  fetchType,
  limit = 10,
}: Props) {
  const t = await getTranslations({ locale, namespace: "media" });
  const isKo = locale.startsWith("ko");
  const items = await fetchHomeMediaForScroll(fetchType, limit);

  if (items.length === 0) return null;

  const badge = badgeForType(fetchType);
  const viewAllLabel = isKo ? "전체보기" : "View all";

  return (
    <section
      className="border-b border-gray-100 py-6 dark:border-white/5"
      data-screenshot={`home-scroll-${fetchType}`}
    >
      <div className="mb-3 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-white/50">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Link
          href={viewAllHref}
          className="shrink-0 text-xs font-medium text-violet-400 hover:text-violet-300"
        >
          {viewAllLabel} →
        </Link>
      </div>
      <div
        className={cn(
          "flex gap-3 overflow-x-auto pb-2",
          "snap-x snap-mandatory [-ms-overflow-style:none] [scrollbar-width:none]",
          "[&::-webkit-scrollbar]:hidden",
        )}
      >
        {items.map((media, i) => (
          <MediaCard
            key={media.id}
            media={media}
            locale={locale}
            imagePreparingLabel={t("imagePreparing")}
            badge={badge}
            priority={i < 4}
          />
        ))}
      </div>
    </section>
  );
}
