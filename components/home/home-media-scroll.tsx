import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Star, CheckCircle } from "lucide-react";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog";

interface Props {
  title: string;
  subtitle?: string;
  viewAllHref: string;
  media: HomeCatalogMediaItem[];
}

function formatPrice(price?: number) {
  if (!price) return null;
  const man = Math.round(price / 10000);
  if (man >= 10000) return `₩${(man / 10000).toFixed(1)}억`;
  return `₩${man.toLocaleString()}만`;
}

export function HomeMediaScroll({
  title,
  subtitle,
  viewAllHref,
  media,
}: Props) {
  if (!media || media.length === 0) return null;

  return (
    <div className="py-4">
      <div className="mb-3 flex items-center justify-between px-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            {title}
          </h3>
          {subtitle ? (
            <p className="mt-0.5 text-xs text-gray-400 dark:text-white/50">
              {subtitle}
            </p>
          ) : null}
        </div>
        <Link
          href={viewAllHref}
          className="flex items-center gap-0.5 text-xs font-medium tkad-home-accent-text"
        >
          전체보기 <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      <div className="scrollbar-hide flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2">
        {media.map((item, idx) => {
          const href = item.slug
            ? `/ko/media/${item.slug}`
            : `/ko/media/${item.id}`;
          return (
            <Link
              key={item.id}
              href={href}
              className="w-44 shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md active:scale-95 dark:border-white/10 dark:bg-white/5 md:w-56"
            >
              <div className="relative h-36 bg-gray-100 dark:bg-gray-800 md:h-40">
                {item.thumbnailUrl ? (
                  <Image
                    src={item.thumbnailUrl}
                    alt={item.name}
                    fill
                    className="object-cover"
                    sizes="192px"
                    priority={idx < 4}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
                    이미지 없음
                  </div>
                )}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {item.isInstantBooking ? (
                    <span className="rounded-md bg-emerald-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      즉시예약
                    </span>
                  ) : null}
                </div>
              </div>

              <div className="p-3.5">
                <div className="mb-1 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3 shrink-0 text-blue-400" />
                  <p className="truncate text-sm leading-tight font-semibold text-gray-900 dark:text-white">
                    {item.name}
                  </p>
                </div>
                <p className="mb-1.5 text-xs text-gray-400 dark:text-white/40">
                  {[item.region, item.type].filter(Boolean).join(" · ")}
                </p>
                {item.reviewAvg && item.reviewAvg > 0 ? (
                  <div className="mb-1 flex items-center gap-1">
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                    <span className="text-xs text-gray-500 dark:text-white/60">
                      {item.reviewAvg.toFixed(1)}
                      {item.reviewCount ? ` (${item.reviewCount})` : ""}
                    </span>
                  </div>
                ) : null}
                {formatPrice(item.price) ? (
                  <p className="text-sm font-bold tkad-home-accent-text">
                    {formatPrice(item.price)}/월
                  </p>
                ) : null}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
