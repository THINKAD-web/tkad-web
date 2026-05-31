"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MapPin,
  Monitor,
  Flame,
  Calculator,
} from "lucide-react";
import ShareButtons from "@/components/share-buttons";
import MediaSearchAutocomplete from "@/components/media-search-autocomplete";
import {
  MediaFilterButtons,
  type SimpleFilterKey,
} from "@/components/media-filter-buttons";
import { MediaPinPopup } from "@/components/media-pin-popup";
import {
  typeLabels,
  type MediaItem,
  getPrimaryMediaImageUrl,
} from "@/lib/media-data";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import {
  formatCatalogPriceFieldWon,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { resolveMediaIdFromMapPinId } from "@/lib/media-detail-map-markers";

const MediaBrowseMap = dynamic(() => import("@/components/media-browse-map"), {
  ssr: false,
});

type Props = {
  catalog: MediaItem[];
  filtered: MediaItem[];
  mapSelectedId: string | null;
  onSelectId: (id: string | null) => void;
  pinMetaById: Record<
    string,
    { tone?: "blue" | "green"; nowBadge?: boolean; popular?: boolean }
  >;
  geoCenter: { lat: number; lng: number } | null;
  simpleTypeFilters: ReadonlySet<SimpleFilterKey>;
  onToggleSimpleType: (k: SimpleFilterKey) => void;
  onResetFilters: () => void;
  onMediaSelectFromSearch: (media: MediaItem) => void;
  onSearchSubmit: (q: string) => void;
  onQueryChange: (q: string) => void;
  popularIds: ReadonlySet<string>;
  compareItemCount: number;
  toggleCompare: (m: MediaItem) => void;
  isInCompare: (id: string) => boolean;
};

export function MediaMapView({
  catalog,
  filtered,
  mapSelectedId,
  onSelectId,
  pinMetaById,
  geoCenter,
  simpleTypeFilters,
  onToggleSimpleType,
  onResetFilters,
  onMediaSelectFromSearch,
  onSearchSubmit,
  onQueryChange,
  popularIds,
  compareItemCount,
  toggleCompare,
  isInCompare,
}: Props) {
  const getInitialMapHeight = () => {
    if (typeof window === "undefined") return 520;
    return Math.min(Math.round(window.innerHeight * 0.72), 640);
  };
  const t = useTranslations();
  const tMedia = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";
  const [listOpen, setListOpen] = useState(false);
  const [mapHeightPx, setMapHeightPx] = useState(getInitialMapHeight);

  const updateMapHeight = useCallback(() => {
    if (typeof window === "undefined") return;
    setMapHeightPx(
      Math.min(Math.round(window.innerHeight * 0.72), 640),
    );
  }, []);

  useEffect(() => {
    window.addEventListener("resize", updateMapHeight);
    return () => window.removeEventListener("resize", updateMapHeight);
  }, [updateMapHeight]);

  const mapSelectedMedia = useMemo(() => {
    if (mapSelectedId == null) return null;
    return (
      filtered.find((m) => m.id === resolveMediaIdFromMapPinId(mapSelectedId)) ??
      null
    );
  }, [filtered, mapSelectedId]);

  const searchPlaceholder = isKo
    ? "어디서 광고하고 싶나요?"
    : "Where do you want to advertise?";

  return (
    <div className="space-y-4 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
      <div className="hidden md:block">
        <div className="rounded-2xl border border-navy/10 bg-white p-3 shadow-sm">
          <div className="flex flex-col gap-3">
            <MediaSearchAutocomplete
              locale={locale}
              catalog={catalog}
              onSelect={onMediaSelectFromSearch}
              onSearchSubmit={onSearchSubmit}
              onQueryChange={onQueryChange}
              searchButtonLabel={isKo ? "검색" : "Search"}
              placeholder={searchPlaceholder}
            />
            <MediaFilterButtons
              variant="inline"
              selected={simpleTypeFilters}
              onToggle={onToggleSimpleType}
              onReset={onResetFilters}
              isKo={isKo}
              resetLabel={t("common.reset")}
            />
          </div>
        </div>
      </div>

      <div className="md:hidden">
        <div className="rounded-2xl border border-navy/10 bg-white p-3 shadow-sm">
          <MediaSearchAutocomplete
            locale={locale}
            catalog={catalog}
            onSelect={onMediaSelectFromSearch}
            onSearchSubmit={onSearchSubmit}
            onQueryChange={onQueryChange}
            searchButtonLabel={isKo ? "검색" : "Search"}
            placeholder={searchPlaceholder}
          />
        </div>
      </div>

      <div className="relative -mx-4 overflow-hidden border-y border-navy/10 bg-white shadow-lg sm:-mx-6 lg:-mx-8 md:mx-0 md:rounded-2xl md:border">
        <div className="relative w-full">
          <MediaBrowseMap
            items={filtered}
            locale={locale}
            selectedId={mapSelectedId}
            onSelectId={onSelectId}
            fixedMapHeightPx={mapHeightPx}
            showFooterCaption={false}
            centerOverride={geoCenter}
            zoomOverride={geoCenter ? 13 : null}
            pinMetaById={pinMetaById}
            className="touch-pan-y"
          />
          <MediaPinPopup
            media={mapSelectedMedia}
            isKo={isKo}
            isSelected={mapSelectedMedia ? isInCompare(mapSelectedMedia.id) : false}
            onToggleSelect={(id) => {
              const m = filtered.find((x) => x.id === id);
              if (m) toggleCompare(m);
            }}
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-30 flex justify-center md:bottom-4 md:pb-0">
            <div className="pointer-events-auto px-4">
              <Button
                type="button"
                size="sm"
                className="rounded-full bg-navy px-5 text-xs font-bold dark:text-white text-gray-900 shadow-lg hover:bg-navy/90"
                onClick={() => setListOpen(true)}
              >
                {t("media.listSheetCta")}
              </Button>
            </div>
          </div>
        </div>

        <div className="border-t border-navy/10 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs text-muted-foreground">
            <span>
              {t("media.results")}:{" "}
              <span className="font-semibold text-navy">{filtered.length}</span>
            </span>
            <span className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-500" />
                {isKo ? "기본" : "Default"}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-500" />
                {isKo ? "예약 가능" : "Available"}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full ring-2 ring-gold/80" />
                {isKo ? "인기" : "Popular"}
              </span>
            </span>
          </div>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-navy/10 bg-white/95 shadow-[0_-4px_24px_-8px_rgba(26,42,108,0.12)] backdrop-blur-md md:hidden">
        <MediaFilterButtons
          variant="bar"
          selected={simpleTypeFilters}
          onToggle={onToggleSimpleType}
          onReset={onResetFilters}
          isKo={isKo}
          resetLabel={t("common.reset")}
        />
      </div>

      <Sheet open={listOpen} onOpenChange={setListOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0"
        >
          <SheetHeader className="shrink-0 border-b border-navy/10 px-4 py-3 text-left">
            <SheetTitle className="text-base">
              {t("media.results")} ({filtered.length})
            </SheetTitle>
            <SheetDescription>{t("media.listSheetDescription")}</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 py-4">
            {filtered.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                {t("media.noResults")}
              </p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {filtered.map((media) => {
                  const u = getPrimaryMediaImageUrl(media);
                  const inCompare = isInCompare(media.id);
                  return (
                    <Card
                      key={media.id}
                      className="relative overflow-hidden border-navy/10 shadow-sm"
                    >
                      <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                        {u ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-navy/25">
                            <Monitor className="h-10 w-10" />
                          </div>
                        )}
                        <label
                          className="absolute left-2.5 top-2.5 z-20 flex size-8 cursor-pointer select-none items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => e.stopPropagation()}
                          title={t("media.compareToggleAria")}
                        >
                          <input
                            type="checkbox"
                            checked={inCompare}
                            onChange={() => toggleCompare(media)}
                            disabled={
                              media.catalogSource === "network" ||
                              (!inCompare &&
                                compareItemCount >= COMPARE_MAX_ITEMS)
                            }
                            aria-label={t("media.compareToggleAria")}
                            className="h-3.5 w-3.5 rounded border-navy/30 text-gold accent-gold"
                          />
                        </label>
                        {popularIds.has(media.id) && (
                          <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy shadow-sm">
                            <Flame className="h-3 w-3" />
                            {isKo ? "인기" : "Popular"}
                          </div>
                        )}
                      </div>
                      <CardHeader className="space-y-1.5 px-3 pb-1.5 pt-3">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="bg-navy/5 text-[11px] text-navy"
                          >
                            {isKo
                              ? (typeLabels[media.type]?.ko ?? media.type)
                              : (typeLabels[media.type]?.en ?? media.type)}
                          </Badge>
                        </div>
                        <CardTitle className="text-sm font-bold leading-snug text-navy">
                          {isKo ? media.name : (media.nameEn || media.name)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0 px-3 pb-3">
                        <div className="flex items-start gap-1 text-xs leading-snug text-muted-foreground">
                          <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                          {formatMediaLocationShort(media, isKo)}
                        </div>
                        <div className="mt-1.5">
                          <div className="text-base font-bold leading-tight text-navy">
                            {formatCatalogPriceFieldWon(media.price)}
                            <span className="ml-1 text-[11px] font-semibold text-muted-foreground">
                              ·{" "}
                              {tMedia(
                                mediaPricePeriodTranslationKey(
                                  media.pricePeriod,
                                ),
                              )}
                            </span>
                          </div>
                        </div>
                        <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
                        <div className="mt-2.5 border-t border-navy/10 pt-2.5">
                          <ShareButtons
                            compact
                            url={`/${locale}${mediaItemDetailPath(media)}`}
                            title={isKo ? media.name : (media.nameEn || media.name)}
                            description={`${formatMediaLocationShort(media, isKo)} - ${formatCatalogPriceFieldWon(media.price)} · ${tMedia(mediaPricePeriodTranslationKey(media.pricePeriod))}`}
                            locale={locale}
                          />
                        </div>
                        <div className="mt-3 flex flex-col gap-2">
                          <Link
                            href={mediaItemDetailPath(media)}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-navy/15 bg-white px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-slate-50"
                          >
                            {t("media.cardDetail")}
                          </Link>
                          <Link
                            href={`/quote?media=${media.id}`}
                            className="flex w-full items-center justify-center gap-1.5 rounded-md bg-gold px-3 py-2 text-sm font-semibold text-navy transition-colors hover:bg-gold-dark"
                          >
                            <Calculator className="h-3.5 w-3.5" />
                            {isKo ? "견적 받기" : "Get Quote"}
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
