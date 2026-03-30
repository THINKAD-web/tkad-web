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
  Sparkles,
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
  typeLabels,
  getPrimaryMediaImageUrl,
} from "@/lib/media-data";
import {
  recommendMedia,
  mediaToMapPosition,
  type ScoredMedia,
  type AiRecommendInput,
} from "@/lib/ai-media-recommend";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { cn } from "@/lib/utils";
import MediaAiQuiz from "@/components/media-ai-quiz";
import MediaAiSwipeDeck, { SWIPE_DECK_SIZE } from "@/components/media-ai-swipe-deck";
import MediaAiTop3Results from "@/components/media-ai-top3-results";
import { top3FromSwipeVotes, type SwipeVote } from "@/lib/ai-media-swipe-top3";

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

type Phase = "quiz" | "loading" | "swipe" | "results" | "list";

export default function MediaAiRecommendPanel({
  locale,
  regionOptions: _regionOptions,
  catalog,
  compareItems,
  toggleCompare,
  isInCompare,
  addManyToCompare,
  maxSelectionItems = COMPARE_MAX_ITEMS,
  labelOverrides,
}: Props) {
  const t = useTranslations();
  const isKo = locale === "ko";

  const addCompareLabel =
    labelOverrides?.addCompare ?? t("media.ai.addCompare");
  const addTop3Label = labelOverrides?.addTop3 ?? t("media.ai.addTop3");
  const quotePickedLabel =
    labelOverrides?.quotePicked ?? t("media.ai.quotePicked");
  const quoteTop3Label = labelOverrides?.quoteTop3 ?? t("media.ai.quoteTop3");
  const quoteSingleLabel =
    labelOverrides?.quoteSingle ?? (isKo ? "견적" : "Quote");

  const [phase, setPhase] = useState<Phase>("quiz");
  const [view, setView] = useState<"list" | "map">("list");
  const [results, setResults] = useState<ScoredMedia[] | null>(null);
  const [top3Results, setTop3Results] = useState<ScoredMedia[] | null>(null);
  const [runKey, setRunKey] = useState(0);

  const runRecommend = useCallback(
    (input: AiRecommendInput) => {
      setPhase("loading");
      setResults(null);
      setTop3Results(null);
      window.setTimeout(() => {
        const scored =
          catalog.length === 0
            ? []
            : recommendMedia(input, catalog);
        setResults(scored);
        setRunKey((k) => k + 1);
        setPhase("swipe");
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

  if (catalog.length === 0) {
    return (
      <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50/80 p-8 text-center text-sm text-amber-950">
        {t("media.ai.emptyCatalog")}
      </div>
    );
  }

  if (phase === "quiz") {
    return (
      <MediaAiQuiz
        locale={locale}
        onComplete={(input) => runRecommend(input)}
      />
    );
  }

  if (phase === "loading") {
    return (
      <div className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-[#0f172a]/92 backdrop-blur-md">
        <div className="h-14 w-14 animate-spin rounded-full border-4 border-white/20 border-t-gold" />
        <p className="mt-5 text-sm font-semibold text-white">{t("media.ai.running")}</p>
        <p className="mt-2 max-w-xs text-center text-xs text-white/60">
          {t("media.ai.swipe.loadingTagline")}
        </p>
      </div>
    );
  }

  const handleSwipeSessionComplete = useCallback(
    (votes: SwipeVote[]) => {
      if (!results?.length) return;
      const pool = results.slice(0, SWIPE_DECK_SIZE);
      const top3 = top3FromSwipeVotes(votes, pool);
      setTop3Results(top3);
      setPhase("results");
    },
    [results],
  );

  if (phase === "results" && top3Results !== null) {
    return (
      <MediaAiTop3Results
        locale={locale}
        items={top3Results}
        onRestartQuiz={() => {
          setTop3Results(null);
          setPhase("quiz");
        }}
        onViewFullList={() => setPhase("list")}
        quoteLabel={quoteSingleLabel}
      />
    );
  }

  if (phase === "swipe" && results !== null) {
    if (results.length === 0) {
      return (
        <div className="space-y-6">
          <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 p-8 text-center">
            <Sparkles className="h-10 w-10 text-amber-700" />
            <p className="text-sm font-medium text-amber-950">
              {t("media.ai.emptyResult")}
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button
                type="button"
                className="btn-gold rounded-full"
                onClick={() => setPhase("quiz")}
              >
                {t("media.ai.swipe.restartQuiz")}
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="rounded-2xl border border-navy/10 bg-gradient-to-br from-navy/[0.04] to-gold/[0.06] p-4 sm:p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-2 text-lg font-bold text-navy">
                <Sparkles className="h-5 w-5 text-gold" />
                {t("media.ai.swipe.heroTitle")}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t("media.ai.swipe.heroSubtitle")}
              </p>
            </div>
          </div>
        </div>

        <MediaAiSwipeDeck
          key={runKey}
          locale={locale}
          items={results}
          compareItems={compareItems}
          toggleCompare={toggleCompare}
          isInCompare={isInCompare}
          maxSelectionItems={maxSelectionItems}
          addCompareLabel={addCompareLabel}
          quoteLabel={quoteSingleLabel}
          quoteQueryPicked={quoteQueryPicked}
          onRestartQuiz={() => setPhase("quiz")}
          onShowList={() => setPhase("list")}
          onSessionComplete={handleSwipeSessionComplete}
        />
      </div>
    );
  }

  /* list + optional map (after swipe or direct) */
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
              onClick={() => setPhase("quiz")}
            >
              {t("media.ai.swipe.restartQuiz")}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="rounded-full text-xs"
              onClick={() => setPhase("swipe")}
            >
              {t("media.ai.swipe.backToSwipe")}
            </Button>
            <div className="inline-flex rounded-full border border-navy/10 bg-white p-1">
              <button
                type="button"
                onClick={() => setView("list")}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors touch-manipulation",
                  view === "list"
                    ? "bg-navy text-white"
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
                    ? "bg-navy text-white"
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
          <div className="grid gap-4 sm:grid-cols-2">
            {results.map((s) => (
              <AiResultCard
                key={`${s.item.id}-${getPrimaryMediaImageUrl(s.item) ?? "none"}`}
                scored={s}
                isKo={isKo}
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
        ) : (
          <div className="overflow-hidden rounded-2xl border border-navy/10 bg-gradient-to-b from-slate-100 to-slate-200 shadow-inner">
            <p className="border-b border-navy/10 bg-white/80 px-4 py-2 text-center text-[11px] text-muted-foreground">
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
                      title={isKo ? s.item.name : s.item.nameEn}
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
                    {isKo ? s.item.name : s.item.nameEn}
                  </span>
                  <span className="shrink-0 font-mono text-gold-dark">
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
  inCompare,
  onToggleCompare,
  disableCompare,
  addCompareLabel,
  quoteLabel,
}: {
  scored: ScoredMedia;
  isKo: boolean;
  inCompare: boolean;
  onToggleCompare: () => void;
  disableCompare: boolean;
  addCompareLabel: string;
  quoteLabel: string;
}) {
  const tMedia = useTranslations("media");
  const m = scored.item;
  const tl = typeLabels[m.type];
  const primaryUrl = getPrimaryMediaImageUrl(m);
  const [imgFailed, setImgFailed] = useState(false);
  const showPlaceholder = !primaryUrl || imgFailed;
  const exposure =
    typeof m.dailyFootTraffic === "number" && Number.isFinite(m.dailyFootTraffic) && m.dailyFootTraffic > 0
      ? (isKo ? `일 ${Math.round(m.dailyFootTraffic).toLocaleString()}명 노출` : `${Math.round(m.dailyFootTraffic).toLocaleString()}/day est.`)
      : null;
  const availability =
    m.availability === "available"
      ? { text: isKo ? "즉시 예약 가능" : "Available now", className: "bg-emerald-500 text-white" }
      : m.availability === "reserved" || m.availability === "maintenance"
        ? { text: isKo ? "협의 필요" : "Check availability", className: "bg-slate-700 text-white" }
        : null;

  return (
    <Card className="overflow-hidden border-navy/10 shadow-md transition-shadow hover:shadow-lg">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-navy/8 to-gold/10">
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
        <Badge className="absolute top-2 right-2 border-0 bg-navy text-white">
          {scored.score}
        </Badge>
        <div className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white">
          <BadgeCheck className="h-3 w-3" />
          AI
        </div>
      </div>
      <CardHeader className="pb-2">
        <Badge variant="secondary" className="w-fit bg-navy/5 text-xs text-navy">
          {isKo ? tl.ko : tl.en}
        </Badge>
        <CardTitle className="text-base leading-snug">
          {isKo ? m.name : m.nameEn}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        {(exposure || availability) && (
          <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex items-start gap-1 text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">
            {formatMediaLocationShort(m, isKo)}
          </span>
        </div>
        <ul className="space-y-1 text-[11px] leading-relaxed text-navy/80">
          {scored.reasons.map((r, i) => (
            <li key={i} className="flex gap-1.5">
              <span className="text-gold">·</span>
              <span>{isKo ? r.ko : r.en}</span>
            </li>
          ))}
        </ul>
        <div className="text-lg font-bold text-navy">
          {formatMediaPriceWonWithSymbol(m.price)}
          <span className="text-xs font-normal text-muted-foreground">
            {" "}
            · {tMedia(mediaPricePeriodTranslationKey(m.pricePeriod))}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3">
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
