"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  ShieldCheck,
  Flame,
  Calculator,
  LayoutList,
  LayoutGrid,
  Rows3,
  Map as MapIcon,
  ExternalLink,
  X,
  Users,
  SlidersHorizontal,
} from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import SolutionCtaButton from "@/components/solution-cta-button";
import ShareButtons from "@/components/share-buttons";
import MediaSearchAutocomplete from "@/components/media-search-autocomplete";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  getCompareCartEntries,
  setCompareCartEntries,
  subscribeCompareCart,
  entriesToCompareMediaItems,
} from "@/lib/compare-cart-client";

const RecentlyViewedMedia = dynamic(
  () => import("@/components/recently-viewed-media"),
  { loading: () => null },
);
const CompareBar = dynamic(() => import("@/components/compare-bar"), {
  ssr: false,
});
const MediaBrowseMap = dynamic(() => import("@/components/media-browse-map"), {
  ssr: false,
});
import {
  matchesMediaTextQuery,
  typeLabels,
  type MediaItem,
} from "@/lib/media-data";
import {
  computeCatalogBounds,
  defaultAdvancedFilterState,
  passesMediaAdvancedFilters,
  type MediaAdvancedFilterState,
} from "@/lib/media-filter-advanced";
import MediaAdvancedFiltersPanel from "@/components/media-advanced-filters-panel";
import MediaRegionReference from "@/components/media-region-reference";
import Modal from "@/components/ui/modal";
import { addRecentlyViewedId } from "@/lib/recently-viewed";
import MediaAiRecommendPanel from "@/components/media-ai-recommend-panel";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";

export default function MediaBrowseClient({
  catalog,
}: {
  catalog: MediaItem[];
}) {
  const t = useTranslations();
  const tMedia = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";

  const [mainTab, setMainTab] = useState<"search" | "ai">("search");
  const [searchTarget, setSearchTarget] = useState<string | null>(null);
  const [textFilter, setTextFilter] = useState("");
  const [browseMode, setBrowseMode] = useState<"list" | "map">("list");
  const [catalogCardLayout, setCatalogCardLayout] = useState<
    "grid" | "compact"
  >("grid");
  const [catalogPage, setCatalogPage] = useState(1);
  const [catalogPageSize, setCatalogPageSize] = useState(24);
  const [mapSelectedId, setMapSelectedId] = useState<string | null>(null);
  const [compareItems, setCompareItems] = useState<MediaItem[]>([]);
  const skipFirstComparePersist = useRef(true);
  const popularIds = new Set(["1", "2", "3", "8", "9"]);
  const [sortBy, setSortBy] = useState<
    "default" | "priceAsc" | "priceDesc" | "trafficDesc"
  >("default");
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const bounds = useMemo(() => computeCatalogBounds(catalog), [catalog]);
  const defaultAdvanced = useMemo(
    () => defaultAdvancedFilterState(bounds),
    [bounds],
  );
  /** `null` = use `defaultAdvanced` until the user edits advanced filters */
  const [advanced, setAdvanced] = useState<MediaAdvancedFilterState | null>(
    null,
  );
  const effectiveAdvanced = advanced ?? defaultAdvanced;

  useLayoutEffect(() => {
    setCompareItems(entriesToCompareMediaItems(getCompareCartEntries(), catalog));
  }, [catalog]);

  useEffect(() => {
    return subscribeCompareCart(() => {
      setCompareItems(
        entriesToCompareMediaItems(getCompareCartEntries(), catalog),
      );
    });
  }, [catalog]);

  useEffect(() => {
    if (skipFirstComparePersist.current) {
      skipFirstComparePersist.current = false;
      return;
    }
    setCompareCartEntries(
      compareItems.map((m) => ({
        id: m.id,
        name: m.name,
        nameEn: m.nameEn,
      })),
    );
  }, [compareItems]);

  /** 검색어·선택 매체 + 고급 필터(슬라이더·태그 등) 적용 */
  const filtered = useMemo(() => {
    let data = catalog;

    if (searchTarget) {
      data = data.filter((m) => m.id === searchTarget);
    } else if (textFilter.trim()) {
      const lower = textFilter.toLowerCase();
      data = data.filter((m) => matchesMediaTextQuery(m, lower));
    }

    return data.filter((m) =>
      passesMediaAdvancedFilters(m, effectiveAdvanced, bounds),
    );
  }, [catalog, searchTarget, textFilter, effectiveAdvanced, bounds]);

  const sortedFiltered = useMemo(() => {
    const arr = [...filtered];
    switch (sortBy) {
      case "priceAsc":
        return arr.sort((a, b) => a.price - b.price);
      case "priceDesc":
        return arr.sort((a, b) => b.price - a.price);
      case "trafficDesc":
        return arr.sort(
          (a, b) =>
            (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0),
        );
      default:
        return arr;
    }
  }, [filtered, sortBy]);

  useEffect(() => {
    if (mapSelectedId == null) return;
    if (!sortedFiltered.some((m) => m.id === mapSelectedId))
      setMapSelectedId(null);
  }, [sortedFiltered, mapSelectedId]);

  useEffect(() => {
    setCatalogPage(1);
  }, [searchTarget, textFilter, effectiveAdvanced, sortBy]);

  const pagedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return sortedFiltered.slice(start, start + catalogPageSize);
  }, [sortedFiltered, catalogPage, catalogPageSize]);

  const catalogPageCount = Math.max(
    1,
    Math.ceil(sortedFiltered.length / catalogPageSize),
  );

  useEffect(() => {
    if (browseMode !== "map" || mapSelectedId == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMapSelectedId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [browseMode, mapSelectedId]);

  const regions = [
    { value: "all", label: t("media.allRegions") },
    { value: "seoul", label: t("media.regions.seoul") },
    { value: "busan", label: t("media.regions.busan") },
    { value: "jeju", label: t("media.regions.jeju") },
    { value: "national", label: t("media.regions.national") },
  ];

  const resetFilters = () => {
    setSearchTarget(null);
    setTextFilter("");
    setMapSelectedId(null);
    setAdvanced(null);
    setSortBy("default");
  };

  const handleMediaView = useCallback((media: MediaItem) => {
    addRecentlyViewedId(media.id);
    setSearchTarget(media.id);
    setTextFilter("");
    setMapSelectedId(media.id);
  }, []);

  const toggleCompare = useCallback((media: MediaItem) => {
    setCompareItems((prev) => {
      const exists = prev.find((m) => m.id === media.id);
      if (exists) return prev.filter((m) => m.id !== media.id);
      if (prev.length >= COMPARE_MAX_ITEMS) return prev;
      return [...prev, media];
    });
  }, []);

  const addManyToCompare = useCallback((items: MediaItem[]) => {
    setCompareItems((prev) => {
      const next = [...prev];
      for (const m of items) {
        if (next.length >= COMPARE_MAX_ITEMS) break;
        if (!next.some((x) => x.id === m.id)) next.push(m);
      }
      return next;
    });
  }, []);

  const isInCompare = (id: string) => compareItems.some((m) => m.id === id);

  const mapSelectedMedia =
    mapSelectedId != null
      ? sortedFiltered.find((m) => m.id === mapSelectedId) ?? null
      : null;

  const handleMapSelectId = useCallback((id: string | null) => {
    if (id == null) {
      setMapSelectedId(null);
      return;
    }
    setMapSelectedId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <>
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("media.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("media.subtitle")}</p>
          <div className="mt-6">
            <SolutionCtaButton
              href="/contact"
              label={
                isKo
                  ? "맞춤형 OOH 캠페인 제안 받기"
                  : "Get Custom OOH Campaign Proposal"
              }
              size="lg"
              className="h-12"
            />
          </div>
        </div>
      </section>

      <section className="py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8 flex justify-center">
            <div className="inline-flex rounded-full border border-navy/10 bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setMainTab("search")}
                className={`touch-manipulation rounded-full px-5 py-2.5 text-sm font-semibold transition-colors sm:px-8 ${
                  mainTab === "search"
                    ? "bg-navy text-white shadow-sm"
                    : "text-muted-foreground hover:bg-slate-50"
                }`}
              >
                {t("media.ai.tabSearch")}
              </button>
              <button
                type="button"
                onClick={() => setMainTab("ai")}
                className={`touch-manipulation rounded-full px-5 py-2.5 text-sm font-semibold transition-colors sm:px-8 ${
                  mainTab === "ai"
                    ? "bg-gradient-to-r from-navy to-navy/90 text-white shadow-sm"
                    : "text-muted-foreground hover:bg-slate-50"
                }`}
              >
                {t("media.ai.tabAi")}
              </button>
            </div>
          </div>

          {mainTab === "ai" ? (
            <MediaAiRecommendPanel
              locale={locale}
              regionOptions={regions}
              catalog={catalog}
              compareItems={compareItems}
              toggleCompare={toggleCompare}
              isInCompare={isInCompare}
              addManyToCompare={addManyToCompare}
            />
          ) : (
            <div className="flex flex-col gap-8 lg:flex-row">
              <aside className="w-full shrink-0 lg:w-64">
                <div className="sticky top-24 space-y-4 rounded-xl border bg-white p-6 shadow-sm">
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy">
                      {t("common.search")}
                    </label>
                    <MediaSearchAutocomplete
                      locale={locale}
                      catalog={catalog}
                      onSelect={handleMediaView}
                      onSearchSubmit={(q) => {
                        setSearchTarget(null);
                        setTextFilter(q);
                        setBrowseMode("list");
                      }}
                      onQueryChange={(q) => {
                        if (!q.trim()) setTextFilter("");
                      }}
                      searchButtonLabel={t("media.searchButton")}
                    />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full border-navy/20 font-semibold text-navy"
                    onClick={() => setAdvancedOpen(true)}
                  >
                    <SlidersHorizontal className="mr-2 h-4 w-4" />
                    {t("media.advanced.openButton")}
                  </Button>
                  <Button
                    variant="ghost"
                    className="w-full text-muted-foreground"
                    onClick={resetFilters}
                  >
                    {t("common.reset")}
                  </Button>
                </div>
              </aside>

              <Modal
                open={advancedOpen}
                onClose={() => setAdvancedOpen(false)}
                ariaLabelledBy="media-advanced-filters-heading"
                className="max-w-lg sm:max-w-xl"
              >
                <div className="max-h-[min(85vh,720px)] overflow-y-auto p-6">
                  <h2
                    id="media-advanced-filters-heading"
                    className="mb-4 pr-8 text-lg font-bold text-navy"
                  >
                    {t("media.advanced.title")}
                  </h2>
                  <p className="mb-4 text-xs text-muted-foreground">
                    {t("media.advanced.modalHint")}
                  </p>
                  <MediaAdvancedFiltersPanel
                    catalog={catalog}
                    bounds={bounds}
                    value={effectiveAdvanced}
                    onChange={setAdvanced}
                  />
                  <div className="mt-6 border-t border-navy/10 pt-4">
                    <MediaRegionReference />
                  </div>
                  <Button
                    type="button"
                    className="btn-gold mt-6 h-11 w-full font-bold"
                    onClick={() => setAdvancedOpen(false)}
                  >
                    {t("media.advanced.modalClose")}
                  </Button>
                </div>
              </Modal>

              <div className="flex-1">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t("media.results")}: {sortedFiltered.length}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-xs font-medium text-navy">
                      <span className="text-muted-foreground">
                        {t("media.sortLabel")}
                      </span>
                      <select
                        className="max-w-[10rem] rounded-md border border-navy/15 bg-slate-50 px-2 py-0.5 text-xs font-semibold"
                        value={sortBy}
                        onChange={(e) =>
                          setSortBy(
                            e.target.value as typeof sortBy,
                          )
                        }
                      >
                        <option value="default">
                          {t("media.sortDefault")}
                        </option>
                        <option value="priceAsc">
                          {t("media.sortPriceAsc")}
                        </option>
                        <option value="priceDesc">
                          {t("media.sortPriceDesc")}
                        </option>
                        <option value="trafficDesc">
                          {t("media.sortTrafficDesc")}
                        </option>
                      </select>
                    </label>
                    <div className="inline-flex rounded-full border border-navy/15 bg-slate-50 p-0.5">
                      <button
                        type="button"
                        onClick={() => setBrowseMode("list")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          browseMode === "list"
                            ? "bg-white text-navy shadow-sm"
                            : "text-muted-foreground hover:text-navy"
                        }`}
                      >
                        <LayoutList className="h-3.5 w-3.5" />
                        {t("media.browseViewList")}
                      </button>
                      <button
                        type="button"
                        onClick={() => setBrowseMode("map")}
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                          browseMode === "map"
                            ? "bg-white text-navy shadow-sm"
                            : "text-muted-foreground hover:text-navy"
                        }`}
                      >
                        <MapIcon className="h-3.5 w-3.5" />
                        {t("media.browseViewMap")}
                      </button>
                    </div>
                    {browseMode === "list" ? (
                      <div className="inline-flex rounded-full border border-navy/15 bg-slate-50 p-0.5">
                        <button
                          type="button"
                          onClick={() => setCatalogCardLayout("grid")}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            catalogCardLayout === "grid"
                              ? "bg-white text-navy shadow-sm"
                              : "text-muted-foreground hover:text-navy"
                          }`}
                        >
                          <LayoutGrid className="h-3.5 w-3.5" />
                          {t("media.browseCardLayoutGrid")}
                        </button>
                        <button
                          type="button"
                          onClick={() => setCatalogCardLayout("compact")}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                            catalogCardLayout === "compact"
                              ? "bg-white text-navy shadow-sm"
                              : "text-muted-foreground hover:text-navy"
                          }`}
                        >
                          <Rows3 className="h-3.5 w-3.5" />
                          {t("media.browseCardLayoutCompact")}
                        </button>
                      </div>
                    ) : null}
                    {browseMode === "list" ? (
                      <label className="inline-flex items-center gap-2 rounded-full border border-navy/10 bg-white px-3 py-1.5 text-xs font-medium text-navy">
                        <span className="text-muted-foreground">
                          {t("media.perPage")}
                        </span>
                        <select
                          className="rounded-md border border-navy/15 bg-slate-50 px-2 py-0.5 text-xs font-semibold"
                          value={catalogPageSize}
                          onChange={(e) => {
                            setCatalogPageSize(Number(e.target.value));
                            setCatalogPage(1);
                          }}
                        >
                          <option value={12}>12</option>
                          <option value={24}>24</option>
                          <option value={48}>48</option>
                        </select>
                      </label>
                    ) : null}
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                      <ShieldCheck className="h-4 w-4" />
                      Verified Media
                    </div>
                  </div>
                </div>

                {sortedFiltered.length === 0 ? (
                  <div className="flex h-64 items-center justify-center rounded-xl border text-muted-foreground">
                    {t("media.noResults")}
                  </div>
                ) : browseMode === "map" ? (
                  <div className="relative">
                    <MediaBrowseMap
                      items={sortedFiltered}
                      locale={locale}
                      selectedId={mapSelectedId}
                      onSelectId={handleMapSelectId}
                    />
                    {mapSelectedMedia ? (
                      <div className="pointer-events-none absolute inset-0 z-20 flex items-end justify-center p-3 sm:p-4 md:items-start md:justify-end">
                        <div
                          className="pointer-events-auto w-full max-w-md animate-in fade-in slide-in-from-bottom-3 duration-200 md:slide-in-from-bottom-0 md:slide-in-from-right-3"
                          role="dialog"
                          aria-label={
                            isKo
                              ? mapSelectedMedia.name
                              : mapSelectedMedia.nameEn
                          }
                        >
                          <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-2xl shadow-navy/20 ring-1 ring-black/5">
                            <div className="flex items-start gap-3 border-b border-navy/8 p-3 sm:p-4">
                              <div className="h-20 w-28 shrink-0 overflow-hidden rounded-lg sm:h-24 sm:w-32">
                                <MediaCatalogThumbnail
                                  media={mapSelectedMedia}
                                  placeholderLabel={t("media.imagePreparing")}
                                  className="h-full w-full rounded-lg"
                                  bottomGradientClassName={null}
                                  placeholderSize="xs"
                                />
                              </div>
                              <div className="min-w-0 flex-1 pt-0.5">
                                <h3 className="line-clamp-2 text-base font-bold leading-snug text-navy sm:text-lg">
                                  {isKo
                                    ? mapSelectedMedia.name
                                    : mapSelectedMedia.nameEn}
                                </h3>
                                <p className="mt-1.5 text-sm font-bold tabular-nums text-navy">
                                  {formatMediaPriceWonWithSymbol(mapSelectedMedia.price)}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {" "}
                                    ·{" "}
                                    {tMedia(
                                      mediaPricePeriodTranslationKey(
                                        mapSelectedMedia.pricePeriod,
                                      ),
                                    )}
                                  </span>
                                </p>
                                <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                                  <Users
                                    className="h-3.5 w-3.5 shrink-0 text-gold-dark"
                                    aria-hidden
                                  />
                                  <span>
                                    {t("media.mapPopupFootTraffic")}:{" "}
                                    <span className="font-semibold text-navy/85">
                                      {mapSelectedMedia.dailyFootTraffic.toLocaleString()}
                                    </span>
                                  </span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setMapSelectedId(null)}
                                className="-m-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-slate-100 hover:text-navy"
                                aria-label={t("media.mapPopupClose")}
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            <div className="flex flex-wrap gap-2 p-3 sm:p-4 sm:pt-3">
                              <Link
                                href={mediaItemDetailPath(
                                  mapSelectedMedia.id,
                                )}
                                className="flex-1 min-w-[8rem]"
                              >
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-10 w-full font-semibold"
                                >
                                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                                  {t("media.mapCardDetail")}
                                </Button>
                              </Link>
                              <Link
                                href={`/quote?media=${mapSelectedMedia.id}`}
                                className="flex-1 min-w-[8rem]"
                              >
                                <Button
                                  size="sm"
                                  className="h-10 w-full bg-gold font-semibold text-navy hover:bg-gold-dark"
                                >
                                  <Calculator className="mr-1.5 h-3.5 w-3.5" />
                                  {t("media.mapCardQuote")}
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <>
                    {catalogCardLayout === "grid" ? (
                  <div className="grid grid-cols-2 gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {pagedCatalog.map((media) => (
                      <MediaCatalogGridCard
                        key={media.id}
                        variant="link"
                        media={media}
                        isKo={isKo}
                        imagePreparingLabel={t("media.imagePreparing")}
                        popularIds={popularIds}
                        topLeftSlot={
                          <label
                            className="absolute left-2.5 top-2.5 z-20 flex size-8 cursor-pointer select-none items-center justify-center rounded-full bg-white/90 shadow-sm backdrop-blur-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            title={t("media.compareToggleAria")}
                          >
                            <input
                              type="checkbox"
                              checked={isInCompare(media.id)}
                              onChange={() => toggleCompare(media)}
                              disabled={
                                media.catalogSource === "network" ||
                                (!isInCompare(media.id) &&
                                  compareItems.length >= COMPARE_MAX_ITEMS)
                              }
                              aria-label={t("media.compareToggleAria")}
                              className="h-3.5 w-3.5 rounded border-navy/30 text-gold accent-gold"
                            />
                          </label>
                        }
                      />
                    ))}
                  </div>
                    ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 xl:grid-cols-3">
                    {pagedCatalog.map((media) => {
                      const detailHref = mediaItemDetailPath(media.id);
                      return (
                      <Link
                        key={media.id}
                        href={detailHref}
                        aria-label={isKo ? media.name : media.nameEn}
                        className="relative flex min-w-0 rounded-lg border border-navy/10 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 sm:gap-4 sm:rounded-xl sm:p-3.5"
                      >
                        <MediaCatalogThumbnail
                          media={media}
                          placeholderLabel={t("media.imagePreparing")}
                          className="relative z-10 h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-md sm:h-24 sm:w-28 sm:rounded-lg"
                          bottomGradientClassName={null}
                          placeholderSize="xs"
                        >
                          <label
                            className="absolute left-1 top-1 z-20 flex size-7 cursor-pointer select-none items-center justify-center rounded-full bg-white/95 shadow-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
                            title={t("media.compareToggleAria")}
                          >
                            <input
                              type="checkbox"
                              checked={isInCompare(media.id)}
                              onChange={() => toggleCompare(media)}
                              disabled={
                                media.catalogSource === "network" ||
                                (!isInCompare(media.id) &&
                                  compareItems.length >= COMPARE_MAX_ITEMS)
                              }
                              aria-label={t("media.compareToggleAria")}
                              className="h-3 w-3 rounded border-navy/30 text-gold accent-gold"
                            />
                          </label>
                        </MediaCatalogThumbnail>
                        <div className="relative z-0 flex min-w-0 flex-1 flex-col justify-center gap-1 sm:gap-1.5">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
                            <Badge
                              variant="secondary"
                              className="bg-navy/5 px-1.5 py-0 text-[9px] text-navy sm:text-[10px]"
                            >
                              {isKo
                                ? (typeLabels[media.type]?.ko ?? media.type)
                                : (typeLabels[media.type]?.en ?? media.type)}
                            </Badge>
                            {popularIds.has(media.id) && (
                              <span className="inline-flex items-center gap-0.5 rounded-full bg-gold/90 px-1.5 py-0 text-[8px] font-bold text-navy sm:text-[9px]">
                                <Flame className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                {isKo ? "인기" : "Hot"}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-[13px] font-bold leading-snug text-navy sm:text-sm sm:leading-relaxed">
                            {isKo ? media.name : media.nameEn}
                          </p>
                          <p className="flex min-w-0 items-center gap-0.5 text-[10px] leading-snug text-muted-foreground sm:text-[11px] sm:leading-relaxed">
                            <MapPin className="h-2.5 w-2.5 shrink-0 align-text-bottom sm:h-3 sm:w-3" />
                            <span className="min-w-0 truncate">
                              {formatMediaLocationShort(media, isKo)}
                            </span>
                          </p>
                          <p className="text-[13px] font-bold tabular-nums leading-none text-navy sm:text-sm">
                            {formatMediaPriceWonWithSymbol(media.price)}
                            <span className="text-[9px] font-normal text-muted-foreground sm:text-[10px]">
                              {" "}
                              ·{" "}
                              {tMedia(
                                mediaPricePeriodTranslationKey(
                                  media.pricePeriod,
                                ),
                              )}
                            </span>
                          </p>
                        </div>
                      </Link>
                      );
                    })}
                  </div>
                    )}
                    {catalogPageCount > 1 ? (
                      <div className="mt-6 flex flex-wrap items-center justify-center gap-3 border-t border-slate-200 pt-4">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={catalogPage <= 1}
                          onClick={() =>
                            setCatalogPage((p) => Math.max(1, p - 1))
                          }
                        >
                          {t("media.pagePrev")}
                        </Button>
                        <span className="text-sm text-muted-foreground">
                          {t("media.pageSummary", {
                            from:
                              sortedFiltered.length === 0
                                ? 0
                                : (catalogPage - 1) * catalogPageSize + 1,
                            to: Math.min(
                              catalogPage * catalogPageSize,
                              sortedFiltered.length,
                            ),
                            total: sortedFiltered.length,
                          })}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={catalogPage >= catalogPageCount}
                          onClick={() =>
                            setCatalogPage((p) =>
                              Math.min(catalogPageCount, p + 1),
                            )
                          }
                        >
                          {t("media.pageNext")}
                        </Button>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          )}

          <RecentlyViewedMedia locale={locale} />
        </div>
      </section>

      <CompareBar
        items={compareItems}
        locale={locale}
        onRemove={(id) =>
          setCompareItems((prev) => prev.filter((m) => m.id !== id))
        }
        onClear={() => setCompareItems([])}
      />

      {compareItems.length > 0 && <div className="h-24 md:h-28" />}
    </>
  );
}
