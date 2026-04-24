"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Clock, MapPin, ArrowRight, RotateCcw } from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
import {
  clearRecentlyViewed,
  fetchRecentlyViewedItems,
  readRecentlyViewedIds,
  subscribeRecentlyViewedChanged,
} from "@/lib/recently-viewed";
import { typeLabels, type MediaItem } from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import ScrollAnimate from "@/components/scroll-animate";

interface Props {
  locale: string;
}

export default function HomeRecentlyViewed({ locale }: Props) {
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
        if (!cancelled) {
          setItems(data);
          setReady(true);
        }
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

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <ScrollAnimate>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-1.5 text-sm font-semibold text-navy/70">
                <Clock className="h-4 w-4" />
                {isKo ? "최근 본 매체" : "Recently Viewed"}
              </div>
              <h2 className="mt-1 text-2xl font-bold text-navy">
                {isKo ? "최근 확인한 매체" : "Recently Viewed Media"}
              </h2>
            </div>
            <div className="flex items-center gap-3 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  clearRecentlyViewed();
                  setItems([]);
                }}
                className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-border/80 transition-colors sm:min-h-0"
                aria-label={isKo ? "최근 본 매체 초기화" : "Reset recently viewed"}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {isKo ? "초기화" : "Reset"}
              </button>
              <Link
                href="/media"
                className="link-underline-grow inline-flex min-h-11 items-center gap-1 text-sm font-semibold text-gold transition-colors hover:text-gold-dark sm:min-h-0"
              >
                {isKo ? "전체 보기" : "View All"} <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </ScrollAnimate>
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {items.slice(0, 3).map((media, i) => (
            <ScrollAnimate key={media.id} delay={i * 100}>
              <Link href={`/media/${media.id}`} className="block touch-manipulation">
                <Card className="group min-w-0 cursor-pointer overflow-hidden border-0 shadow-md transition-all hover:shadow-lg hover:-translate-y-1">
                  <MediaCatalogThumbnail
                    media={media}
                    placeholderLabel={tMedia("imagePreparing")}
                    className="flex h-48 items-center justify-center"
                    imgClassName="transition duration-300 group-hover:scale-105"
                    bottomGradientClassName={null}
                    placeholderSize="xs"
                  />
                  <CardHeader className="min-w-0 p-3 pb-1.5">
                    <Badge variant="secondary" className="w-fit bg-navy/5 text-navy text-[10px]">
                      {isKo ? typeLabels[media.type]?.ko : typeLabels[media.type]?.en}
                    </Badge>
                    <CardTitle className="truncate text-sm font-bold leading-snug">
                      {isKo ? media.name : (media.nameEn || media.name)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-w-0 px-3 pb-3">
                    <div className="flex min-w-0 items-start gap-1 text-xs leading-snug text-muted-foreground">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                      <span className="min-w-0 truncate">
                        {formatMediaLocationShort(media, isKo)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-bold text-navy">
                      {formatMediaPriceWonWithSymbol(media.price)}
                      <span className="ml-1 text-[10px] font-normal text-muted-foreground">
                        · {tMedia(mediaPricePeriodTranslationKey(media.pricePeriod))}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </ScrollAnimate>
          ))}
        </div>
      </div>
    </section>
  );
}
