"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useMemo, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MediaImagePlaceholder } from "@/components/media-image-placeholder";
import {
  Sparkles,
  MapPin,
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
  type CampaignGoal,
  type TargetAudience,
  type Industry,
  type ScoredMedia,
} from "@/lib/ai-media-recommend";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { cn } from "@/lib/utils";
import { getCampaignMonitoringMapProvider } from "@/components/campaign-monitoring-map";

const MediaBrowseMap = dynamic(() => import("@/components/media-browse-map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center border-t border-navy/10 bg-slate-50">
      <div
        className="h-9 w-9 animate-spin rounded-full border-2 border-navy/15 border-t-gold"
        aria-hidden
      />
    </div>
  ),
});

type Props = {
  locale: string;
  regionOptions: { value: string; label: string }[];
  /** 서버 `fetchPublicMediaCatalog()` 등 — 부모가 DB(또는 폴백) 카탈로그를 넘깁니다. */
  catalog: MediaItem[];
  compareItems: MediaItem[];
  toggleCompare: (m: MediaItem) => void;
  isInCompare: (id: string) => boolean;
  addManyToCompare: (items: MediaItem[]) => void;
  /** Max items in selection (compare/cart). Default `COMPARE_MAX_ITEMS`. */
  maxSelectionItems?: number;
  /** Override button/copy for cart-style flows on /recommend. */
  labelOverrides?: {
    addCompare?: string;
    addTop3?: string;
    quotePicked?: string;
    quoteTop3?: string;
    quoteSingle?: string;
  };
};

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

  const [goal, setGoal] = useState<CampaignGoal>("awareness");
  const [target, setTarget] = useState<TargetAudience>("millennial");
  const [budgetMax, setBudgetMax] = useState("3000");
  const [region, setRegion] = useState("all");
  const [industry, setIndustry] = useState<Industry>("fmcg");
  const [type, setType] = useState("all");
  const [minVisibility, setMinVisibility] = useState("0");
  const [minFootTraffic, setMinFootTraffic] = useState("0");
  const [view, setView] = useState<"list" | "map">("list");
  const [results, setResults] = useState<ScoredMedia[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiMapSelectedId, setAiMapSelectedId] = useState<string | null>(null);

  const aiMapItems = useMemo(
    () => (results ?? []).map((s) => s.item),
    [results],
  );

  useEffect(() => {
    setAiMapSelectedId(null);
  }, [results]);

  const runRecommend = useCallback(() => {
    const cap = Math.max(0, parseInt(budgetMax.replace(/\D/g, ""), 10) || 0);
    const minVis = Math.max(0, parseInt(minVisibility.replace(/\D/g, ""), 10) || 0);
    const minFt = Math.max(0, parseInt(minFootTraffic.replace(/\D/g, ""), 10) || 0);
    setLoading(true);
    setResults(null);
    window.setTimeout(() => {
      const scored =
        catalog.length === 0
          ? []
          : recommendMedia(
              {
                goal,
                target,
                budgetMaxMan: cap,
                region,
                industry,
                type,
                minVisibility: minVis,
                minDailyFootTraffic: minFt,
              },
              catalog,
            );
      setResults(scored);
      setLoading(false);
    }, 850);
  }, [goal, target, budgetMax, region, industry, type, minVisibility, minFootTraffic, catalog]);

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

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Card className="border-navy/10 shadow-md lg:sticky lg:top-24">
            <CardHeader className="border-b border-slate-100 bg-gradient-to-br from-navy/5 to-gold/5">
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-gold" />
                <CardTitle className="text-lg text-navy">
                  {t("media.ai.panelTitle")}
                </CardTitle>
              </div>
              <p className="text-sm text-muted-foreground">
                {t("media.ai.panelSubtitle")}
              </p>
            </CardHeader>
            <CardContent className="space-y-5 pt-6">
              <div>
                <label className="mb-2 block text-xs font-semibold text-navy">
                  {t("media.ai.goal")}
                </label>
                <select
                  value={goal}
                  onChange={(e) => setGoal(e.target.value as CampaignGoal)}
                  className="w-full rounded-md border border-navy/15 px-3 py-2 text-sm"
                >
                  <option value="awareness">{t("media.ai.goalAwareness")}</option>
                  <option value="consideration">
                    {t("media.ai.goalConsideration")}
                  </option>
                  <option value="launch">{t("media.ai.goalLaunch")}</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-navy">
                  {t("media.ai.target")}
                </label>
                <select
                  value={target}
                  onChange={(e) =>
                    setTarget(e.target.value as TargetAudience)
                  }
                  className="w-full rounded-md border border-navy/15 px-3 py-2 text-sm"
                >
                  <option value="genz">{t("media.ai.targetGenz")}</option>
                  <option value="millennial">
                    {t("media.ai.targetMillennial")}
                  </option>
                  <option value="family">{t("media.ai.targetFamily")}</option>
                  <option value="biz">{t("media.ai.targetBiz")}</option>
                  <option value="mass">{t("media.ai.targetMass")}</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-navy">
                  {isKo ? "매체 유형" : "Media type"}
                </label>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                  className="w-full rounded-md border border-navy/15 px-3 py-2 text-sm"
                >
                  <option value="all">{isKo ? "전체" : "All"}</option>
                  <option value="digital">{isKo ? "디지털" : "Digital"}</option>
                  <option value="static">{isKo ? "옥외(고정)" : "Static"}</option>
                  <option value="mobile">{isKo ? "교통(이동)" : "Mobile"}</option>
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-navy">
                  {t("media.ai.budgetMax")}
                </label>
                <Input
                  inputMode="numeric"
                  value={budgetMax}
                  onChange={(e) =>
                    setBudgetMax(e.target.value.replace(/[^\d]/g, ""))
                  }
                  className="border-navy/15"
                  placeholder={isKo ? "0 = 제한 없음" : "0 = no cap"}
                />
                <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                  {t("media.ai.budgetHint")}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-semibold text-navy">
                    {isKo ? "가시성 최소 점수" : "Min visibility score"}
                  </label>
                  <Input
                    inputMode="numeric"
                    value={minVisibility}
                    onChange={(e) =>
                      setMinVisibility(e.target.value.replace(/[^\d]/g, ""))
                    }
                    className="border-navy/15"
                    placeholder={isKo ? "0 = 제한 없음" : "0 = no limit"}
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    {isKo ? "0–100 범위 (예: 65)" : "0–100 (e.g. 65)"}
                  </p>
                </div>
                <div>
                  <label className="mb-2 block text-xs font-semibold text-navy">
                    {isKo ? "일 유동인구 최소" : "Min daily foot traffic"}
                  </label>
                  <Input
                    inputMode="numeric"
                    value={minFootTraffic}
                    onChange={(e) =>
                      setMinFootTraffic(e.target.value.replace(/[^\d]/g, ""))
                    }
                    className="border-navy/15"
                    placeholder={isKo ? "0 = 제한 없음" : "0 = no limit"}
                  />
                  <p className="mt-1.5 text-[11px] leading-relaxed text-muted-foreground">
                    {isKo ? "예: 150000" : "e.g. 150000"}
                  </p>
                </div>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-navy">
                  {t("media.ai.region")}
                </label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  className="w-full rounded-md border border-navy/15 px-3 py-2 text-sm"
                >
                  {regionOptions.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-2 block text-xs font-semibold text-navy">
                  {t("media.ai.industry")}
                </label>
                <select
                  value={industry}
                  onChange={(e) => setIndustry(e.target.value as Industry)}
                  className="w-full rounded-md border border-navy/15 px-3 py-2 text-sm"
                >
                  <option value="retail">{t("media.ai.indRetail")}</option>
                  <option value="fintech">{t("media.ai.indFintech")}</option>
                  <option value="fmcg">{t("media.ai.indFmcg")}</option>
                  <option value="auto">{t("media.ai.indAuto")}</option>
                  <option value="entertainment">
                    {t("media.ai.indEntertainment")}
                  </option>
                  <option value="beauty">{t("media.ai.indBeauty")}</option>
                  <option value="other">{t("media.ai.indOther")}</option>
                </select>
              </div>
              <Button
                type="button"
                className="btn-gold h-11 w-full font-semibold"
                onClick={runRecommend}
                disabled={loading || catalog.length === 0}
              >
                {loading ? (
                  <>
                    <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                    {t("media.ai.running")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("media.ai.runAi")}
                  </>
                )}
              </Button>
              <p className="text-[11px] leading-relaxed text-muted-foreground">
                {t("media.ai.demoNote")}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8">
          {catalog.length === 0 ? (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-amber-200 bg-amber-50/80 p-8 text-center text-sm text-amber-950">
              {t("media.ai.emptyCatalog")}
            </div>
          ) : null}
          {catalog.length > 0 && results === null && !loading && (
            <div className="flex min-h-[280px] items-center justify-center rounded-xl border border-dashed border-navy/15 bg-slate-50/80 p-8 text-center text-sm text-muted-foreground">
              {t("media.ai.emptyRun")}
            </div>
          )}

          {catalog.length > 0 && loading && (
            <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border bg-white p-8">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-200 border-t-gold" />
              <p className="text-sm font-medium text-navy">
                {t("media.ai.running")}
              </p>
            </div>
          )}

          {catalog.length > 0 && results !== null && !loading && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-bold text-navy">
                    {t("media.ai.results")}{" "}
                    <span className="text-muted-foreground">
                      ({results.length})
                    </span>
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2">
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
                      {compareItems.length > 0
                        ? quotePickedLabel
                        : quoteTop3Label}
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
                <div className="overflow-hidden rounded-2xl border border-navy/10 bg-white shadow-inner">
                  <p className="border-b border-navy/10 bg-slate-50/90 px-4 py-2 text-center text-[11px] text-muted-foreground">
                    {t("media.ai.mapHint")}
                  </p>
                  {getCampaignMonitoringMapProvider() === "fallback" ? (
                    <p className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-[11px] text-amber-950">
                      {t("media.ai.mapFallbackTiles")}
                    </p>
                  ) : null}
                  <MediaBrowseMap
                    items={aiMapItems}
                    locale={locale}
                    selectedId={aiMapSelectedId}
                    onSelectId={setAiMapSelectedId}
                    fixedMapHeightPx={400}
                    showFooterCaption
                    className="rounded-none border-0"
                  />
                  <ul className="max-h-36 space-y-1 overflow-y-auto border-t border-navy/10 bg-white px-4 py-2.5 text-xs">
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
            </>
          )}
        </div>
      </div>
    </div>
  );
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

  return (
    <Card className="overflow-hidden border-navy/10 shadow-md transition-shadow hover:shadow-lg">
      <div className="relative h-32 overflow-hidden bg-gradient-to-br from-navy/8 to-gold/10">
        {showPlaceholder ? (
          <MediaImagePlaceholder
            label={tMedia("imagePreparing")}
            size="sm"
            className="h-full w-full"
          />
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
        <div className="flex items-start gap-1 text-muted-foreground">
          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span className="text-xs">
            {isKo ? m.location : m.locationEn}
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
          ₩{m.price.toLocaleString()}
          <span className="text-xs font-normal text-muted-foreground">
            만원 / {isKo ? "월" : "mo"}
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
