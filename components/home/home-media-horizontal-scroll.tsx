import { Link } from "@/i18n/navigation";
import { ArrowRight, Star } from "lucide-react";
import {
  getPrimaryMediaImageUrl,
  type MediaItem,
  typeLabels,
} from "@/lib/media-data";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatCatalogPriceFieldWon } from "@/lib/media-price-format";
import { cn } from "@/lib/utils";

type SectionProps = {
  title: string;
  viewAllLabel: string;
  viewAllHref?: string;
  items: MediaItem[];
  locale: string;
  imagePreparingLabel: string;
  badge?: "new";
  className?: string;
};

function MediaScrollCard({
  media,
  locale,
  imagePreparingLabel,
  badge,
}: {
  media: MediaItem;
  locale: string;
  imagePreparingLabel: string;
  badge?: "new";
}) {
  const isKo = locale.startsWith("ko");
  const name = isKo ? media.name : media.nameEn || media.name;
  const location = isKo ? media.location : media.locationEn || media.location;
  const typeLabel =
    typeLabels[media.type]?.[isKo ? "ko" : "en"] ?? media.type;
  const price =
    media.price > 0 ? formatCatalogPriceFieldWon(media.price, locale) : null;
  const imageSrc = getPrimaryMediaImageUrl(media);
  const rating = media.averageRating;

  return (
    <Link
      href={mediaItemDetailPath(media)}
      className="group relative flex w-48 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-transform active:scale-[0.98] dark:border-white/10 dark:bg-white/5 md:w-56"
    >
      {badge === "new" ? (
        <span className="absolute left-2 top-2 z-10 rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
          NEW
        </span>
      ) : null}
      <div className="relative h-32 w-full overflow-hidden bg-gray-100 dark:bg-white/5">
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageSrc}
            alt={name}
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <span className="flex h-full items-center justify-center px-2 text-center text-[11px] text-gray-400">
            {imagePreparingLabel}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-3">
        <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
          {name}
        </p>
        <p className="mt-0.5 line-clamp-1 text-xs text-gray-400 dark:text-white/50">
          {location} · {typeLabel}
        </p>
        {price ? (
          <p className="mt-1.5 text-sm font-bold text-violet-500 dark:text-violet-400">
            {price}
          </p>
        ) : null}
        {rating != null && rating > 0 ? (
          <p className="mt-1 flex items-center gap-0.5 text-xs text-amber-500">
            <Star className="h-3 w-3 fill-current" />
            {rating.toFixed(1)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}

export function HomeMediaHorizontalSection({
  title,
  viewAllLabel,
  viewAllHref = "/media",
  items,
  locale,
  imagePreparingLabel,
  badge,
  className,
}: SectionProps) {
  if (items.length === 0) return null;

  return (
    <section className={cn("py-4", className)} data-screenshot={`home-scroll-${badge ?? "popular"}`}>
      <div className="mx-auto flex w-full max-w-6xl items-end justify-between gap-4 px-4 sm:px-6">
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
          {title}
        </h2>
        <Link
          href={viewAllHref}
          className="inline-flex shrink-0 items-center gap-1 text-sm font-semibold text-violet-600 dark:text-violet-300"
        >
          {viewAllLabel}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div
        className="mx-auto mt-3 flex w-full max-w-6xl gap-3 overflow-x-auto px-4 pb-4 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory sm:px-6 [&::-webkit-scrollbar]:hidden"
      >
        {items.map((media) => (
          <MediaScrollCard
            key={media.id}
            media={media}
            locale={locale}
            imagePreparingLabel={imagePreparingLabel}
            badge={badge}
          />
        ))}
      </div>
    </section>
  );
}
