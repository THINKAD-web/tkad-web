"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";
import { useLocale } from "next-intl";
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
  MapPin,
  BadgeCheck,
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
} from "lucide-react";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
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
import { addRecentlyViewedId } from "@/lib/recently-viewed";
import MediaAiRecommendPanel from "@/components/media-ai-recommend-panel";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { mediaItemDetailPath } from "@/lib/media-network-types";

export default function MediaBrowseClient({
  catalog,
}: {
  catalog: MediaItem[];
}) {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";

  const [mainTab, setMainTab] = useState<"search" | "ai">("search");
  const [region, setRegion] = useState("all");
  const [type, setType] = useState("all");
  const [budget, setBudget] = useState("all");
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

  /** DB(또는 폴백) `catalog`의 region·type·price와 동일 필드로 필터링 */
  const filtered = useMemo(() => {
    let data = catalog;

    if (searchTarget) {
      data = data.filter((m) => m.id === searchTarget);
    } else if (textFilter.trim()) {
      const lower = textFilter.toLowerCase();
      data = data.filter((m) => matchesMediaTextQuery(m, lower));
    }

    return data.filter((m) => {
      if (region !== "all" && m.region !== region) return false;
      if (type !== "all" && m.type !== type) return false;
      if (budget === "under1000" && m.price > 1000) return false;
      if (budget === "1000to3000" && (m.price < 1000 || m.price > 3000))
        return false;
      if (budget === "3000to5000" && (m.price < 3000 || m.price > 5000))
        return false;
      if (budget === "over5000" && m.price < 5000) return false;
      if (!passesMediaAdvancedFilters(m, effectiveAdvanced, bounds)) return false;
      return true;
    });
  }, [
    catalog,
    region,
    type,
    budget,
    searchTarget,
    textFilter,
    effectiveAdvanced,
    bounds,
  ]);

  useEffect(() => {
    if (mapSelectedId == null) return;
    if (!filtered.some((m) => m.id === mapSelectedId)) setMapSelectedId(null);
  }, [filtered, mapSelectedId]);

  useEffect(() => {
    setCatalogPage(1);
  }, [
    region,
    type,
    budget,
    searchTarget,
    textFilter,
    effectiveAdvanced,
  ]);

  const pagedCatalog = useMemo(() => {
    const start = (catalogPage - 1) * catalogPageSize;
    return filtered.slice(start, start + catalogPageSize);
  }, [filtered, catalogPage, catalogPageSize]);

  const catalogPageCount = Math.max(
    1,
    Math.ceil(filtered.length / catalogPageSize),
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

  const types = [
    { value: "all", label: t("media.allTypes") },
    { value: "digital", label: t("media.types.digital") },
    { value: "static", label: t("media.types.static") },
    { value: "mobile", label: t("media.types.mobile") },
    { value: "network", label: t("media.types.network") },
  ];

  const budgets = [
    { value: "all", label: t("media.allBudgets") },
    { value: "under1000", label: t("media.budgets.under1000") },
    { value: "1000to3000", label: t("media.budgets.1000to3000") },
    { value: "3000to5000", label: t("media.budgets.3000to5000") },
    { value: "over5000", label: t("media.budgets.over5000") },
  ];

  const resetFilters = () => {
    setRegion("all");
    setType("all");
    setBudget("all");
    setSearchTarget(null);
    setTextFilter("");
    setMapSelectedId(null);
    setAdvanced(null);
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
      ? filtered.find((m) => m.id === mapSelectedId) ?? null
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
                <div className="sticky top-24 space-y-6 rounded-xl border bg-white p-6 shadow-sm">
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
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy">
                      {t("media.region")}
                    </label>
                    <select
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                      {regions.map((r) => (
                        <option key={r.value} value={r.value}>
                          {r.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-3">
                      <MediaRegionReference />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy">
                      {t("media.type")}
                    </label>
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                      {types.map((tp) => (
                        <option key={tp.value} value={tp.value}>
                          {tp.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-navy">
                      {t("media.budget")}
                    </label>
                    <select
                      value={budget}
                      onChange={(e) => setBudget(e.target.value)}
                      className="w-full rounded-md border px-3 py-2 text-sm"
                    >
                      {budgets.map((b) => (
                        <option key={b.value} value={b.value}>
                          {b.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <MediaAdvancedFiltersPanel
                    bounds={bounds}
                    value={effectiveAdvanced}
                    onChange={setAdvanced}
                  />
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={resetFilters}
                  >
                    {t("common.reset")}
                  </Button>
                </div>
              </aside>

              <div className="flex-1">
                <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="text-sm text-muted-foreground">
                    {t("media.results")}: {filtered.length}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
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

                {filtered.length === 0 ? (
                  <div className="flex h-64 items-center justify-center rounded-xl border text-muted-foreground">
                    {t("media.noResults")}
                  </div>
                ) : browseMode === "map" ? (
                  <div className="relative">
                    <MediaBrowseMap
                      items={filtered}
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
                                  ₩{mapSelectedMedia.price.toLocaleString()}
                                  <span className="text-xs font-normal text-muted-foreground">
                                    {isKo
                                      ? `만원 ${t("media.perMonth")}`
                                      : ` ${t("media.perMonth")}`}
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
                    {pagedCatalog.map((media) => {
                      const detailHref = mediaItemDetailPath(media.id);
                      return (
                        <Link
                          key={media.id}
                          href={detailHref}
                          aria-label={isKo ? media.name : media.nameEn}
                          className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
                        >
                          <Card className="relative overflow-hidden gap-0 py-0 transition-shadow hover:shadow-lg sm:gap-6 sm:py-6 motion-safe:hover:translate-y-0 sm:motion-safe:hover:-translate-y-[4px]">
                          <MediaCatalogThumbnail
                            media={media}
                            placeholderLabel={t("media.imagePreparing")}
                            className="flex h-[7.25rem] items-center justify-center sm:h-36"
                            bottomGradientClassName="absolute inset-0 bg-gradient-to-t from-navy/60 via-navy/10 to-transparent"
                          >
                            {media.catalogSource !== "network" ? (
                              <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                <BadgeCheck className="h-3 w-3" />
                                Verified
                              </div>
                            ) : (
                              <div className="absolute top-2.5 right-2.5 z-10 rounded-full bg-navy/90 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                                {t("media.networkSitesBadge", {
                                  count: media.networkTotalLocations ?? 0,
                                })}
                              </div>
                            )}
                            <label
                              className="absolute top-2.5 left-2.5 z-20 flex cursor-pointer select-none items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-navy shadow-sm backdrop-blur-sm"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onKeyDown={(e) => e.stopPropagation()}
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
                                className="h-3.5 w-3.5 rounded border-navy/30 text-gold accent-gold"
                              />
                              {isKo ? "비교" : "Compare"}
                            </label>
                            {popularIds.has(media.id) && (
                              <div className="absolute bottom-2.5 right-2.5 z-10 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy shadow-sm">
                                <Flame className="h-3 w-3" />
                                {isKo ? "인기" : "Popular"}
                              </div>
                            )}
                          </MediaCatalogThumbnail>
                          <CardHeader className="relative z-0 space-y-1.5 px-4 pb-2.5 pt-2 sm:space-y-2 sm:px-6 sm:pb-3 sm:pt-3">
                            <div className="flex items-center justify-between gap-2">
                              <Badge
                                variant="secondary"
                                className="bg-navy/5 text-[11px] text-navy sm:text-xs"
                              >
                                {isKo
                                  ? (typeLabels[media.type]?.ko ?? media.type)
                                  : (typeLabels[media.type]?.en ?? media.type)}
                              </Badge>
                            </div>
                            <CardTitle className="line-clamp-2 text-[13px] leading-snug sm:text-sm">
                              {isKo ? media.name : media.nameEn}
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="relative z-0 space-y-2.5 px-4 pb-4 pt-0 sm:space-y-3 sm:px-6 sm:pb-6">
                            <div className="flex items-start gap-1 text-[11px] leading-snug text-muted-foreground sm:text-xs">
                              <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="line-clamp-2">
                                {isKo ? media.location : media.locationEn}
                              </span>
                            </div>
                            <div className="space-y-0.5">
                              <div className="text-[15px] font-bold tabular-nums text-navy sm:text-base">
                                ₩{media.price.toLocaleString()}
                                <span className="text-[11px] font-normal text-muted-foreground sm:text-xs">
                                  만원 {t("media.perMonth")}
                                </span>
                              </div>
                              <div className="text-[10px] text-muted-foreground sm:text-[11px]">
                                {isKo
                                  ? `월 ${media.price.toLocaleString()}만원~`
                                  : `From ₩${media.price.toLocaleString()}M/mo`}
                              </div>
                            </div>
                          </CardContent>
                          </Card>
                        </Link>
                      );
                    })}
                  </div>
                    ) : (
                  <div className="flex flex-col gap-2 sm:gap-3">
                    {pagedCatalog.map((media) => {
                      const detailHref = mediaItemDetailPath(media.id);
                      return (
                      <Link
                        key={media.id}
                        href={detailHref}
                        aria-label={isKo ? media.name : media.nameEn}
                        className="relative flex rounded-lg border border-navy/10 bg-white p-2.5 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 sm:gap-4 sm:rounded-xl sm:p-3.5"
                      >
                        <MediaCatalogThumbnail
                          media={media}
                          placeholderLabel={t("media.imagePreparing")}
                          className="relative z-10 h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-md sm:h-24 sm:w-28 sm:rounded-lg"
                          bottomGradientClassName={null}
                          placeholderSize="xs"
                        >
                          <label
                            className="absolute left-1 top-1 z-20 flex cursor-pointer select-none items-center gap-0.5 rounded-full bg-white/95 px-1.5 py-0.5 text-[9px] font-medium text-navy shadow-sm"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                            onKeyDown={(e) => e.stopPropagation()}
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
                              className="h-3 w-3 rounded border-navy/30 text-gold accent-gold"
                            />
                            {isKo ? "비교" : "Cmp"}
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
                          <p className="line-clamp-2 text-[13px] font-bold leading-snug text-navy sm:text-sm sm:leading-relaxed">
                            {isKo ? media.name : media.nameEn}
                          </p>
                          <p className="line-clamp-2 text-[10px] leading-snug text-muted-foreground sm:text-[11px] sm:leading-relaxed">
                            <MapPin className="mr-0.5 inline h-2.5 w-2.5 align-text-bottom sm:h-3 sm:w-3" />
                            {isKo ? media.location : media.locationEn}
                          </p>
                          <p className="text-[13px] font-bold tabular-nums leading-none text-navy sm:text-sm">
                            ₩{media.price.toLocaleString()}
                            <span className="text-[9px] font-normal text-muted-foreground sm:text-[10px]">
                              {" "}
                              만원 {t("media.perMonth")}
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
                              filtered.length === 0
                                ? 0
                                : (catalogPage - 1) * catalogPageSize + 1,
                            to: Math.min(
                              catalogPage * catalogPageSize,
                              filtered.length,
                            ),
                            total: filtered.length,
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
