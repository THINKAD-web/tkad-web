"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { MediaCard } from "@/components/brutalist/media-card";
import {
  clearRecentlyViewed,
  fetchRecentlyViewedItems,
  readRecentlyViewedIds,
  RECENTLY_VIEWED_MAX,
  subscribeRecentlyViewedChanged,
} from "@/lib/recently-viewed";
import { type MediaItem, getPrimaryMediaImageUrl } from "@/lib/media-data";
import {
  catalogPriceFieldToPriceMan,
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { Clock, RotateCcw } from "lucide-react";

const DISPLAY_MAX = RECENTLY_VIEWED_MAX;

interface Props {
  locale: string;
}

const TYPE_LABEL: Record<string, { ko: string; en: string }> = {
  digital: { ko: "디지털", en: "Digital" },
  static: { ko: "고정형", en: "Static" },
  mobile: { ko: "이동형", en: "Mobile" },
  network: { ko: "네트워크", en: "Network" },
};

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

  const localeForPrice = isKo ? "ko" : "en";

  return (
    <section
      className="relative mt-12 md:mt-16"
      aria-label={isKo ? "최근 본 매체" : "Recently viewed media"}
    >
      <div className="border-2 border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b-2 border-border px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center border-2 border-border bg-accent text-accent-foreground">
              <Clock className="size-4" aria-hidden />
            </span>
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                [ RECENTLY VIEWED / {items.length} ]
              </p>
              <h3 className="mt-1 text-sm font-bold tracking-tight text-foreground sm:text-base">
                {isKo ? "최근 본 매체" : "Recently viewed"}
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              clearRecentlyViewed();
              setItems([]);
            }}
            className="inline-flex items-center gap-1.5 border-2 border-border bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            aria-label={isKo ? "최근 본 매체 초기화" : "Reset recently viewed"}
          >
            <RotateCcw className="size-3" />
            {isKo ? "초기화" : "Reset"}
          </button>
        </div>

        <div
          role="list"
          className="grid grid-cols-2 gap-0 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
        >
          {items.slice(0, DISPLAY_MAX).map((media) => {
            const name = isKo ? media.name : media.nameEn || media.name;
            const locationShort =
              media.district || media.city || media.region || media.location;
            const typeLabel = isKo
              ? TYPE_LABEL[media.type]?.ko ?? media.type
              : TYPE_LABEL[media.type]?.en ?? media.type;
            const priceMan = catalogPriceFieldToPriceMan(media.price);
            const priceText = `${formatMediaPriceWonWithSymbol(
              priceMan * 10_000,
              localeForPrice,
            )} · ${tMedia(mediaPricePeriodTranslationKey(media.pricePeriod))}`;
            return (
              <div key={media.id} role="listitem" className="-mt-[2px] -ml-[2px]">
                <MediaCard
                  href={mediaItemDetailPath(media.id)}
                  imageSrc={getPrimaryMediaImageUrl(media)}
                  imageAlt={name}
                  type={typeLabel}
                  name={name}
                  location={locationShort}
                  price={priceText}
                  topRight={isKo ? "최근" : "RECENT"}
                  className="h-full"
                />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
