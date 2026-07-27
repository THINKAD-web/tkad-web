"use client";

import { Link } from "@/i18n/navigation";
import { BunnyFallbackImage } from "@/components/bunny-fallback-image";
import { MediaCartAddButton } from "@/components/media/media-cart-add-button";
import { MediaCompareSelectButton } from "@/components/media/media-compare-select-button";
import { MediaThumbnailTrustOverlay } from "@/components/media/media-thumbnail-trust-overlay";
import type { PlanCartItem } from "@/lib/plan-cart";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";

type Props = {
  href: string;
  name: string;
  metaLine: string;
  priceLabel: string | null;
  imageUrl: string | null;
  isKo: boolean;
  planItem: Omit<PlanCartItem, "addedAt">;
  inCompare: boolean;
  onToggleCompare: () => void;
  isVerified?: boolean;
  isInstantBooking?: boolean;
  imagePriority?: boolean;
};

/** `/media` 카드 뷰와 동일 — 썸네일·검증/즉시·비교+/담기+ */
export function MediaDiscoveryGridCard({
  href,
  name,
  metaLine,
  priceLabel,
  imageUrl,
  isKo,
  planItem,
  inCompare,
  onToggleCompare,
  isVerified,
  isInstantBooking,
  imagePriority = false,
}: Props) {
  return (
    <Link
      href={href}
      className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm transition-shadow hover:shadow-md active:scale-[0.99] dark:border-white/10 dark:bg-white/5"
    >
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
        {imageUrl ? (
          <BunnyFallbackImage
            rawSrc={imageUrl}
            alt={name}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 50vw, 33vw"
            priority={imagePriority}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-gray-300 dark:text-white/20">
            {isKo ? "준비중" : "No image"}
          </div>
        )}
        <MediaThumbnailTrustOverlay
          item={{ isVerified, isInstantBooking }}
          isKo={isKo}
          variant="card"
        />
      </div>
      <div className="p-3">
        <p className="line-clamp-2 text-sm font-semibold text-gray-900 dark:text-white">
          {name}
        </p>
        <p className="mt-1 text-xs text-gray-400 dark:text-white/40">{metaLine}</p>
        <div className="mt-2 space-y-2">
          {priceLabel ? (
            <div>
              <p className="tkad-home-accent-text text-sm font-bold tabular-nums">
                {priceLabel}
              </p>
              <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
            </div>
          ) : null}
          <div className="flex items-stretch gap-1">
            <MediaCompareSelectButton
              mediaId={planItem.mediaId}
              compareEntry={{
                id: planItem.mediaId,
                name: planItem.mediaName,
                nameEn: planItem.mediaName,
              }}
              gridInline
              className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
            />
            <MediaCartAddButton
              item={planItem}
              addedFrom="search"
              gridInline
              className="min-w-0 flex-1 !h-8 !rounded-lg !px-1 !text-[10px]"
            />
          </div>
        </div>
      </div>
    </Link>
  );
}
