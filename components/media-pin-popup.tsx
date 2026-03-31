"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Monitor } from "lucide-react";
import type { MediaItem } from "@/lib/media-data";
import { getPrimaryMediaImageUrl } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";

export function MediaPinPopup({
  media,
  isKo,
  isSelected,
  onToggleSelect,
}: {
  media: MediaItem | null;
  isKo: boolean;
  isSelected?: boolean;
  onToggleSelect?: (mediaId: string) => void;
}) {
  const tMedia = useTranslations("media");
  if (!media) return null;

  const u = getPrimaryMediaImageUrl(media);

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-4">
      <div className="pointer-events-auto mx-auto max-w-xl overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl">
        <div className="flex gap-3 p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-100">
            {u ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={u} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-navy/30">
                <Monitor className="h-7 w-7" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-extrabold text-navy">
              {isKo ? media.name : media.nameEn}
            </p>
            <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
              {formatMediaLocationShort(media, isKo)}
            </p>
            <p className="mt-1 text-sm font-bold text-gold-dark">
              {formatMediaPriceWonWithSymbol(media.price)}
              <span className="ml-1 text-[11px] font-semibold text-navy/55">
                · {tMedia(mediaPricePeriodTranslationKey(media.pricePeriod))}
              </span>
            </p>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5">
            {onToggleSelect && (
              <Button
                size="sm"
                variant={isSelected ? "default" : "outline"}
                className={`rounded-full text-xs font-bold ${
                  isSelected
                    ? "bg-navy text-white hover:bg-navy/90"
                    : "border-navy/20 text-navy hover:bg-navy/5"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleSelect(media.id);
                }}
              >
                {isSelected ? (isKo ? "✓ 선택됨" : "✓ Selected") : (isKo ? "선택" : "Select")}
              </Button>
            )}
            <Link href={mediaItemDetailPath(media.id)}>
              <Button
                size="sm"
                variant="outline"
                className="w-full rounded-full text-xs font-bold"
              >
                {isKo ? "상세" : "Details"}
              </Button>
            </Link>
            <Link href={`/quote?media=${media.id}`}>
              <Button
                size="sm"
                className="w-full rounded-full bg-gold text-xs font-bold text-navy hover:bg-gold-dark"
              >
                {isKo ? "견적" : "Quote"}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
