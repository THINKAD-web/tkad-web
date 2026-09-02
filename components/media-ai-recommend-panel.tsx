"use client";

import { useCallback, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
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
  Monitor,
  List,
  Map as MapIcon,
  ShoppingBag,
  Calculator,
  BadgeCheck,
} from "lucide-react";
import {
  type MediaItem,
  getPrimaryMediaImageUrl,
  matchesMediaTextQuery,
} from "@/lib/media-data";
import { resolveMediaDisplayPill } from "@/lib/media-display-labels";
import {
  recommendMedia,
  filterCatalogByRegionCodes,
  mediaToMapPosition,
  type ScoredMedia,
} from "@/lib/ai-media-recommend";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import {
  formatMediaDisplayPrice,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";
import MediaAiRecommendForm, {
  type MediaAiRecommendFormSubmit,
} from "@/components/media-ai-recommend-form";
import MediaAiRecommendDashboard from "@/components/media-ai-recommend-dashboard";

type Props = {
  locale: string;
  regionOptions: { value: string; label: string }[];
  catalog: MediaItem[];
  compareItems: MediaItem[];
  toggleCompare: (m: MediaItem) => void;
  isInCompare: (id: string) => boolean;
  addManyToCompare: (items: MediaItem[]) => void;
  maxSelectionItems?: number;
  labelOverrides?: {
    addCompare?: string;
    addTop3?: string;
    quotePicked?: string;
    quoteTop3?: string;
    quoteSingle?: string;
  };
};

type Phase = "form" | "loading" | "dashboard" | "noResults" | "list";

export default function MediaAiRecommendPanel({
  locale,
  regionOptions,
  catalog,
  compareItems,
  toggleCompare,
  isInCompare,
  addManyToCompare,
  maxSelectionItems = COMPARE_MAX_ITEMS,
  labelOverrides,
}: Props) {
  void regionOptions;
  const t = useTranslations();
  const tr = useTranslations("recommend");
  const isKo = locale === "ko";

  const addCompareLabel =
    labelOverrides?.addCompare ?? t("media.ai.addCompare");
  const addTop3Label = labelOverrides?.addTop3 ?? t("media.ai.addTop3");
  const quotePickedLabel =
    labelOverrides?.quotePicked ?? t("media.ai.quotePicked");
  const quoteTop3Label = labelOverrides?.quoteTop3 ?? t("media.ai.quoteTop3");
  const quoteSingleLabel =
    labelOverrides?.quoteSingle ?? (isKo ? "견적" : "Quote");

  const [phase, setPhase] = useState<Phase>("form");
  const [view, setView] = useState<"list" | "map">("list");
  const [rowLayout, setRowLayout] = useState<"card" | "compact">("card");
  const [results, setResults] = useState<ScoredMedia[] | null>(null);
  const [lastPayload, setLastPayload] =
    useState<MediaAiRecommendFormSubmit | null>(null);

  const runRecommend = useCallback(
    (payload: MediaAiRecommendFormSubmit) => {
      setPhase("loading");
      setResults(null);
      setLastPayload(payload);
      window.setTimeout(() => {
        const poolRegion = filterCatalogByRegionCodes(
          catalog,
          payload.regionCodes,
        );
        const q = payload.searchQuery.trim().toLowerCase();
        const poolFiltered =
          q.length > 0
            ? poolRegion.filter((m) => matchesMediaTextQuery(m, q))
            : poolRegion;
        const baseCatalog =
          poolFiltered.length > 0 ? poolFiltered : catalog;
        const paddingSource =
          poolRegion.length > 0 ? poolRegion : catalog;
        const scored =
          catalog.length === 0
            ? []
            : recommendMedia(
                payload.input,
                baseCatalog,
                paddingSource,
              );
        setResults(scored);
        setPhase(scored.length > 0 ? "dashboard" : "noResults");
      }, 900);
    },
    [catalog],
  );

  const top3Ids = useMemo(() => {
    if (!results?.length) return [];
    return results.slice(0, maxSelectionItems).map((s) => s.item.id);
  }, [results, maxSelectionItems]);

  const quoteQueryPicked =
    compareItems.length > 0
      ? compareItems.map((m) => m.id).join(",")
      : top3Ids.join(",");

  const addTop3ToCompare = useCallback(() => {
    if (!results?.length) return;
    addManyToCompare(results.slice(0, maxSelectionItems).map((s) => s.item));
  }, [results, addManyToCompare, maxSelectionItems]);

  const top3Dash = useMemo(
    () => results?.slice(0, 3) ?? [],
    [results],
  );

  const quoteHref = `/quote?media=${encodeURIComponent(quoteQueryPicked)}`;

  if (catalog.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50/80 p-8 text-center text-sm text-amber-950">
        {t("media.ai.emptyCatalog")}
      </div>
    );
  }

  if (phase === "form") {
    return (
      <MediaAiRecommendForm
        locale={locale}
        onSubmit={(payload) => runRecommend(payload)}
      />
    );
  }

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-[#0a1628]/95 backdrop-blur-md">
        <div className="w-full max-w-sm space-y-6 px-6">
          <p className="text-center text-sm font-semibold text-gold">
            {tr("loadingTitle")}
          </p>
          <div className="space-y-3 rounded-2xl border border-gold/20 bg-navy/80 p-6 shadow-xl">
            <div className="h-3 overflow-hidden rounded-full dark:bg-white/10 bg-gray-100">
              <div
                className="loading-slide h-full w-2/5 rounded-full bg-gradient-to-r from-gold/70 to-gold"
              />
            </div>
            <div className="space-y-2">
              <div className="h-3 rounded dark:bg-white/10 bg-gray-100" />
              <div className="h-3 w-4/5 rounded dark:bg-white/10 bg-gray-100" />
              <div className="h-3 w-3/5 rounded dark:bg-white/10 bg-gray-100" />
            </div>
          </div>
          <p className="text-center text-xs text-slate-400">
            {tr("loadingSubtitle")}
          </p>
        </div>
      </div>
    );
  }

  if (phase === "dashboard" && results !== null && results.length > 0 && lastPayload) {
    return (
      <MediaAiRecommendDashboard
        locale={locale}
        scored={results}
        top3={top3Dash}
        catalog={catalog}
        recommendInput={lastPayload.input}
        regionCodes={lastPayload.regionCodes}
        onBackToForm={() => {
          setResults(null);
          setLastPayload(null);
          setPhase("form");
        }}
        onViewFullList={() => setPhase("list")}
        onRemix={() => {
          setResults(null);
          setLastPayload(null);
          setPhase("form");
        }}
      />
    );
  }

  if (phase === "noResults") {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/90 p-8 text-center">
        <p className="text-sm font-medium text-amber-950">
          {t("media.ai.emptyResult")}
        </p>
        <Button
          type="button"
          className="btn-gold mt-4 rounded-full"
          onClick={() => setPhase("form")}
        >
          {tr("backToForm")}
        </Button>
      </div>
    );
  }

  /* list + optional map */
  if (phase === "list" && results !== null) {
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-navy">
              {t("media.ai.results")}{" "}
              <span className="text-muted-foreground">({results.length})</span>
            </h3>
            <p className="text-sm text-muted-foreground">
              {t("media.ai.swipe.listSubtitle")}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setPhase("form")}
            >
              {tr("backToForm")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setPhase("dashboard")}
            >
              {tr("backToDashboard")}
            </Button>
            <div className="inline-flex rounded-full border border-navy/10 bg-white p-1">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors touch-manipulation",
                  view === "list"
                    ? "bg-navy dark:text-white text-gray-900"
                    : "text-muted-foreground hover:bg-slate-50",
                )}
              >
                <List className="h-3.5 w-3.5" />
                {t("media.ai.viewList")}
              </button>
              <button
                type="button"
                onClick={() => setView("map")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors touch-manipulation",
                  view === "map"
                    ? "bg-navy dark:text-white text-gray-900"
                    : "text-muted-foreground hover:bg-slate-50",
                )}
              >
                <MapIcon className="h-3.5 w-3.5" />
                {t("media.ai.viewMap")}
              </button>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full text-xs"
              onClick={addTop3ToCompare}
              disabled={!results.length}
            >
              <ShoppingBag className="mr-1.5 h-3.5 w-3.5" />
              {addTop3Label}
            </Button>
            <Link href={`/quote?media=${quoteQueryPicked}`}>
              <Button
                size="sm"
                className="btn-gold rounded-full text-xs font-bold"
                disabled={!quoteQueryPicked}
              >
                <Calculator className="mr-1.5 h-3.5 w-3.5" />
                {compareItems.length > 0 ? quotePickedLabel : quoteTop3Label}
              </Button>
            </Link>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="rounded-xl border bg-amber-50/80 p-8 text-center text-sm text-amber-900">
            {t("media.ai.emptyResult")}
          </div>
        ) : view === "list" ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("media.browseCardLayoutLabel")}
              </span>
              <div className="inline-flex rounded-full border border-navy/10 bg-white p-1 shadow-sm">
                <button
                  type="button"
                  onClick={() => setRowLayout("card")}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    rowLayout === "card"
                      ? "bg-navy dark:text-white text-gray-900"
                      : "text-muted-foreground hover:bg-slate-50",
                  )}
                >
                  {t("media.browseCardLayoutGrid")}
                </button>
                <button
                  type="button"
                  onClick={() => setRowLayout("compact")}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold transition-colors",
                    rowLayout === "compact"
                      ? "bg-navy dark:text-white text-gray-900"
                      : "text-muted-foreground hover:bg-slate-50",
                  )}
                >
                  {t("media.browseCardLayoutCompact")}
                </button>
              </div>
            </div>
            <div
              className={cn(
                rowLayout === "compact"
                  ? "flex flex-col gap-3"
                  : "grid gap-4 sm:grid-cols-2",
              )}
            >
              {results.map((s) => (
                <AiResultCard
                  key={`${s.item.id}-${getPrimaryMediaImageUrl(s.item) ?? "none"}`}
                  scored={s}
                  isKo={isKo}
                  compact={rowLayout === "compact"}
                  inCompare={isInCompare(s.item.id)}
                  onToggleCompare={() => toggleCompare(s.item)}
                  disableCompare={
                    !isInCompare(s.item.id) &&
                    compareItems.length >= maxSelectionItems
                  }
                  addCompareLabel={addCompareLabel}
                  quoteLabel={quoteSingleLabel}
                />
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-navy/10 bg-gradient-to-b from-slate-100 to-slate-200 shadow-inner">
            <p className="border-b border-navy/10 dark:bg-white/8 bg-gray-100 px-4 py-2 text-center text-[11px] text-muted-foreground">
              {t("media.ai.mapHint")}
            </p>
            <div className="relative mx-auto aspect-[16/11] max-h-[420px] w-full">
              <div className="absolute inset-3 rounded-xl border border-navy/10 bg-[#e8eef5] shadow-sm">
                <span className="absolute left-2 top-2 text-[10px] font-bold text-navy/40">
                  KOR
                </span>
                {results.map((s) => {
                  const { x, y } = mediaToMapPosition(s.item);
                  return (
                    <div
                      key={s.item.id}
                      className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${x}%`, top: `${y}%` }}
                      title={isKo ? s.item.name : (s.item.nameEn || s.item.name)}
                    >
                      <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gold text-[10px] font-extrabold text-navy shadow-md">
                        {s.score}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <ul className="max-h-40 space-y-1 overflow-y-auto border-t border-navy/10 bg-white/90 px-4 py-3 text-xs">
              {results.map((s) => (
                <li
                  key={s.item.id}
                  className="flex justify-between gap-2 text-navy"
                >
                  <span className="truncate">
                    {isKo ? s.item.name : (s.item.nameEn || s.item.name)}
                  </span>
                  <span className="shrink-0 text-gold-dark">
                    {s.score}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    );
  }

  return null;
}

function AiResultCard({
  scored,
  isKo,
  compact,
  inCompare,
  onToggleCompare,
  disableCompare,
  addCompareLabel,
  quoteLabel,
}: {
  scored: ScoredMedia;
  isKo: boolean;
  compact?: boolean;
  inCompare: boolean;
  onToggleCompare: () => void;
  disableCompare: boolean;
  addCompareLabel: string;
  quoteLabel: string;
}) {
  const m = scored.item;
  const typeLabel = resolveMediaDisplayPill(m, isKo ? "ko" : "en");
  const primaryUrl = getPrimaryMediaImageUrl(m);
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !primaryUrl || imgFailed;
  const exposure =
    typeof m.dailyFootTraffic === "number" && Number.isFinite(m.dailyFootTraffic) && m.dailyFootTraffic > 0
      ? (isKo ? `일 ${Math.round(m.dailyFootTraffic).toLocaleString()}명 노출` : `${Math.round(m.dailyFootTraffic).toLocaleString()}/day est.`)
      : null;
  const availability =
    m.availability === "available"
      ? { text: isKo ? "즉시 예약(안내)" : "Instant (info)", className: "bg-emerald-500 dark:text-white text-gray-900" }
      : m.availability === "reserved" || m.availability === "maintenance"
        ? { text: isKo ? "협의 필요" : "Check availability", className: "bg-slate-700 dark:text-white text-gray-900" }
        : null;

  return (
    <Card
      className={cn(
        "overflow-hidden border-navy/10 shadow-md transition-shadow hover:shadow-lg",
        compact && "text-center",
      )}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-gradient-to-br from-navy/8 to-gold/10",
          compact ? "mx-auto h-28 max-w-sm" : "h-32",
        )}
      >
        {showPlaceholder ? (
          <div className="flex h-full w-full items-center justify-center">
            <Monitor className="h-9 w-9 text-navy/25" aria-hidden />
          </div>
        ) : (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={primaryUrl}
              alt=""
              className="h-full w-full object-cover"
              onError={() => setImgFailed(true)}
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-navy/50 via-navy/5 to-transparent" />
          </>
        )}
        <Badge className="absolute top-2 right-2 border-0 bg-navy dark:text-white text-gray-900">
          {scored.score}
        </Badge>
        <div
          className={cn(
            "absolute top-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold dark:text-white text-gray-900",
            compact ? "left-1/2 -translate-x-1/2" : "left-2",
          )}
        >
          <BadgeCheck className="h-3 w-3" />
          AI
        </div>
      </div>
      <CardHeader className={cn("pb-2", compact && "flex flex-col items-center")}>
        <Badge
          variant="secondary"
          className={cn(
            "bg-navy/5 text-xs text-navy",
            compact ? "mx-auto" : "w-fit",
          )}
        >
          {typeLabel}
        </Badge>
        <CardTitle
          className={cn(
            "text-base leading-snug",
            compact && "text-center",
          )}
        >
          {isKo ? m.name : (m.nameEn || m.name)}
        </CardTitle>
      </CardHeader>
      <CardContent
        className={cn("space-y-3 text-sm", compact && "flex flex-col items-center")}
      >
        {(exposure || availability) && (
          <div
            className={cn(
              "flex flex-wrap items-center gap-2",
              compact && "justify-center",
            )}
          >
            {exposure ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-navy/5 px-2.5 py-1 text-[11px] font-semibold text-navy">
                👥 {exposure}
              </span>
            ) : null}
            {availability ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                  availability.className,
                )}
              >
                🟢 {availability.text}
              </span>
            ) : null}
          </div>
        )}
        <div
          className={cn(
            "flex gap-1 text-muted-foreground",
            compact ? "items-center justify-center text-center" : "items-start",
          )}
        >
          <MapPin
            className={cn(
              "h-3.5 w-3.5 shrink-0",
              compact ? "" : "mt-0.5",
            )}
          />
          <span className="text-xs leading-snug">
            {formatMediaLocationShort(m, isKo)}
          </span>
        </div>
        <ul
          className={cn(
            "space-y-1 text-[11px] leading-relaxed text-navy/80",
            compact && "text-center",
          )}
        >
          {scored.reasons.map((r, i) => (
            <li
              key={i}
              className={cn(
                "flex gap-1.5",
                compact && "justify-center",
              )}
            >
              <span className="text-gold">·</span>
              <span className="text-left">{isKo ? r.ko : r.en}</span>
            </li>
          ))}
        </ul>
        <div
          className={cn(
            "text-lg font-bold text-navy",
            compact && "text-center",
          )}
        >
          {formatMediaDisplayPrice(m, isKo ? "ko-KR" : "en-US")}
        </div>
        <MediaPriceExclNote isKo={isKo} className={cn(compact && "text-center")} />
        <div
          className={cn(
            "flex flex-wrap gap-2 border-t border-slate-100 pt-3",
            compact && "justify-center",
          )}
        >
          <Button
            type="button"
            variant={inCompare ? "secondary" : "outline"}
            size="sm"
            className="rounded-full text-xs"
            onClick={onToggleCompare}
            disabled={disableCompare}
          >
            {inCompare ? "✓ " : ""}
            {addCompareLabel}
          </Button>
          <Link href={`/quote?media=${m.id}`}>
            <Button size="sm" className="btn-gold rounded-full text-xs">
              <Calculator className="mr-1 h-3.5 w-3.5" />
              {quoteLabel}
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
