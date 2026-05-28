"use client";

import Image from "next/image";
import Link from "next/link";
import { Star } from "lucide-react";
import type { HomeCatalogMediaItem } from "@/lib/media-catalog";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import { PlanCartAddButton } from "@/components/plan/plan-cart-add-button";
import { planCartItemFromCatalog } from "@/lib/plan-cart-item-builders";

type Props = {
  item: HomeCatalogMediaItem;
  href: string;
  isKo: boolean;
  priority?: boolean;
};

function formatPrice(price?: number) {
  if (!price) return null;
  const man = Math.round(price / 10000);
  if (man >= 10000) return `₩${(man / 10000).toFixed(1)}억`;
  return `₩${man.toLocaleString()}만`;
}

export function HomeMediaScrollCard({
  item,
  href,
  isKo,
  priority,
}: Props) {
  return (
    <article className="relative w-48 shrink-0 snap-start overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md dark:border-white/10 dark:bg-white/5 sm:w-52 md:w-60">
      <Link href={href} className="block active:scale-[0.98]">
        <div className="relative h-40 bg-gray-100 dark:bg-gray-800 md:h-44">
          {item.thumbnailUrl ? (
            <Image
              src={item.thumbnailUrl}
              alt={item.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 192px, 240px"
              priority={priority}
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
              이미지 없음
            </div>
          )}
          <MediaThumbnailTrustOverlay item={item} isKo={isKo} variant="card" />
        </div>

        <div className="p-4 pb-12">
          <p className="truncate text-sm font-semibold leading-tight text-gray-900 dark:text-white">
            {item.name}
          </p>
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
      <div className="absolute bottom-3 left-3 right-3">
        <PlanCartAddButton
          item={planCartItemFromCatalog(item, "search")}
          addedFrom="search"
          compact
          className="w-full"
        />
      </div>
    </article>
  );
}
