"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import {
  clearRecentlyViewed,
  fetchRecentlyViewedItems,
  readRecentlyViewedIds,
  RECENTLY_VIEWED_MAX,
  subscribeRecentlyViewedChanged,
} from "@/lib/recently-viewed";
import { type MediaItem } from "@/lib/media-data";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";
import { Clock, MapPin, RotateCcw } from "lucide-react";

const DISPLAY_MAX = RECENTLY_VIEWED_MAX;

interface Props {
  locale: string;
}

export default function RecentlyViewedMedia({ locale }: Props) {
  const isKo = locale === "ko";
  const tMedia = useTranslations("media");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const ids = readRecentlyViewedIds();
    if (ids.length === 0) {
      setReady(true);
      return;
    }
    let cancelled = false;
    void fetchRecentlyViewedItems()
      .then((data) => {
        if (cancelled) return;
        setItems(data);
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) {
          setItems([]);
          setReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    return subscribeRecentlyViewedChanged(() => {
      void fetchRecentlyViewedItems()
        .then(setItems)
        .catch(() => setItems([]));
    });
  }, []);

  if (!ready) return null;
  if (items.length === 0) return null;

  const hoverLabel = isKo ? "상세 페이지로 이동" : "Open detail page";

  return (
    <section
      className="relative mt-12 md:mt-16"
      aria-label={isKo ? "최근 본 매체" : "Recently viewed media"}
    >
      <div className="overflow-hidden rounded-2xl border border-navy/8 bg-gradient-to-br from-slate-50 via-white to-gold/5 p-5 shadow-sm md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex size-8 items-center justify-center rounded-full bg-navy text-gold shadow-sm">
              <Clock className="size-4" aria-hidden />
            </span>
            <div>
              <h3 className="text-sm font-bold leading-tight text-navy sm:text-base">
                {isKo ? "최근 본 매체" : "Recently viewed"}
              </h3>
              <p className="text-[11px] leading-tight text-muted-foreground">
                {isKo
                  ? `최근 ${items.length}개의 매체를 다시 확인해 보세요`
                  : `${items.length} media you recently checked`}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearRecentlyViewed();
              setItems([]);
            }}
            className="inline-flex items-center gap-1.5 rounded-full border border-navy/15 bg-white/80 px-3 py-1.5 text-[11px] font-semibold text-navy/80 shadow-sm transition-colors hover:border-navy/30 hover:bg-white hover:text-navy"
            aria-label={isKo ? "최근 본 매체 초기화" : "Reset recently viewed"}
          >
            <RotateCcw className="size-3" />
            {isKo ? "초기화" : "Reset"}
          </button>
        </div>

        <div
          role="list"
          className={cn(
            "grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5",
          )}
        >
          {items.slice(0, DISPLAY_MAX).map((media) => {
            const locationShort =
              media.district || media.city || media.region || media.location;
            return (
              <Link
                key={media.id}
                role="listitem"
                href={`/media/${media.id}`}
                title={hoverLabel}
                className={cn(
                  "group relative flex flex-col overflow-hidden rounded-xl border border-navy/10 bg-white shadow-sm",
                  "transition-all duration-200 motion-safe:hover:-translate-y-0.5",
                  "hover:border-gold/40 hover:shadow-lg hover:ring-1 hover:ring-gold/15",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40",
                )}
              >
                <div className="relative aspect-[4/3] w-full">
                  <MediaCatalogThumbnail
                    media={media}
                    placeholderLabel={tMedia("imagePreparing")}
                    className="absolute inset-0 size-full"
                    imgClassName="transition-transform duration-300 group-hover:scale-[1.04]"
                    bottomGradientClassName="absolute inset-0 bg-gradient-to-t from-navy/65 via-navy/10 to-transparent"
                    placeholderSize="sm"
                  />
                  <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-navy shadow-sm backdrop-blur-sm">
                    <Clock className="size-2.5" aria-hidden />
                    {isKo ? "최근" : "Recent"}
                  </span>
                </div>
                <div className="flex flex-1 flex-col gap-1 px-3 py-2.5">
                  <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug text-navy group-hover:text-navy">
                    {isKo ? media.name : (media.nameEn || media.name)}
                  </span>
                  <span className="flex items-center gap-1 text-[10.5px] text-muted-foreground">
                    <MapPin className="size-2.5 shrink-0" aria-hidden />
                    <span className="truncate">{locationShort}</span>
                  </span>
                  <span className="mt-auto text-[12px] font-bold tabular-nums leading-tight text-gold-dark">
                    {formatMediaPriceWonWithSymbol(media.price)}
                    <span className="ml-0.5 text-[10px] font-medium text-muted-foreground">
                      · {tMedia(mediaPricePeriodTranslationKey(media.pricePeriod))}
                    </span>
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
