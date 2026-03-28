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
  Monitor,
  BadgeCheck,
  ShieldCheck,
  Flame,
  Calculator,
} from "lucide-react";
import SolutionCtaButton from "@/components/solution-cta-button";
import ShareButtons from "@/components/share-buttons";
import MediaSearchAutocomplete from "@/components/media-search-autocomplete";
import { useState, useMemo, useCallback } from "react";

const RecentlyViewedMedia = dynamic(
  () => import("@/components/recently-viewed-media"),
  { loading: () => null },
);
const CompareBar = dynamic(() => import("@/components/compare-bar"), {
  ssr: false,
});
import { mediaData, typeLabels, type MediaItem } from "@/lib/media-data";
import { addRecentlyViewed } from "@/lib/recently-viewed";
import MediaAiRecommendPanel from "@/components/media-ai-recommend-panel";

export default function MediaPage() {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";

  const [mainTab, setMainTab] = useState<"search" | "ai">("search");
  const [region, setRegion] = useState("all");
  const [type, setType] = useState("all");
  const [budget, setBudget] = useState("all");
  const [searchTarget, setSearchTarget] = useState<number | null>(null);
  const [compareItems, setCompareItems] = useState<MediaItem[]>([]);
  const popularIds = new Set([1, 2, 3, 8, 9]);

  const filtered = useMemo(() => {
    let data = mediaData;

    if (searchTarget) {
      data = data.filter((m) => m.id === searchTarget);
    }

    return data.filter((m) => {
      if (region !== "all" && m.region !== region) return false;
      if (type !== "all" && m.type !== type) return false;
      if (budget === "under1000" && m.price > 1000) return false;
      if (budget === "1000to3000" && (m.price < 1000 || m.price > 3000)) return false;
      if (budget === "3000to5000" && (m.price < 3000 || m.price > 5000)) return false;
      if (budget === "over5000" && m.price < 5000) return false;
      return true;
    });
  }, [region, type, budget, searchTarget]);

  const regions = [
    { value: "all", label: t("media.allRegions") },
    { value: "seoul", label: t("media.regions.seoul") },
    { value: "busan", label: t("media.regions.busan") },
    { value: "jeju", label: t("media.regions.jeju") },
    { value: "national", label: t("media.regions.national") },
  ];

  const types = [
    { value: "all", label: t("media.allTypes") },
    { value: "billboard", label: t("media.types.billboard") },
    { value: "digital", label: t("media.types.digital") },
    { value: "subway", label: t("media.types.subway") },
    { value: "bus", label: t("media.types.bus") },
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
  };

  const handleMediaView = useCallback((media: MediaItem) => {
    addRecentlyViewed(media);
    setSearchTarget(media.id);
  }, []);

  const toggleCompare = useCallback((media: MediaItem) => {
    setCompareItems((prev) => {
      const exists = prev.find((m) => m.id === media.id);
      if (exists) return prev.filter((m) => m.id !== media.id);
      if (prev.length >= 3) return prev;
      return [...prev, media];
    });
  }, []);

  const addManyToCompare = useCallback((items: MediaItem[]) => {
    setCompareItems((prev) => {
      const next = [...prev];
      for (const m of items) {
        if (next.length >= 3) break;
        if (!next.some((x) => x.id === m.id)) next.push(m);
      }
      return next;
    });
  }, []);

  const isInCompare = (id: number) => compareItems.some((m) => m.id === id);

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
              label={isKo ? "맞춤형 OOH 캠페인 제안 받기" : "Get Custom OOH Campaign Proposal"}
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

          {/* Recently Viewed */}
          <RecentlyViewedMedia locale={locale} onSelect={handleMediaView} />

          {mainTab === "ai" ? (
            <MediaAiRecommendPanel
              locale={locale}
              regionOptions={regions}
              compareItems={compareItems}
              toggleCompare={toggleCompare}
              isInCompare={isInCompare}
              addManyToCompare={addManyToCompare}
            />
          ) : (
          <div className="flex flex-col gap-8 lg:flex-row">
            {/* Sidebar */}
            <aside className="w-full shrink-0 lg:w-64">
              <div className="sticky top-24 space-y-6 rounded-xl border bg-white p-6 shadow-sm">
                {/* Search autocomplete */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-navy">
                    {t("common.search")}
                  </label>
                  <MediaSearchAutocomplete
                    locale={locale}
                    onSelect={handleMediaView}
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
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetFilters}
                >
                  {t("common.reset")}
                </Button>
              </div>
            </aside>

            {/* Grid */}
            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  {t("media.results")}: {filtered.length}
                </div>
                <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                  <ShieldCheck className="h-4 w-4" />
                  Verified Media
                </div>
              </div>
              {filtered.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border text-muted-foreground">
                  {t("media.noResults")}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((media) => (
                    <Card
                      key={media.id}
                      className="overflow-hidden transition-shadow hover:shadow-lg"
                    >
                      <div className="relative flex h-40 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10">
                        <Monitor className="h-10 w-10 text-navy/20" />
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 rounded-full bg-emerald-500 px-2 py-0.5 text-[10px] font-bold text-white shadow-sm">
                          <BadgeCheck className="h-3 w-3" />
                          Verified
                        </div>
                        {/* Compare checkbox */}
                        <label className="absolute top-2.5 left-2.5 flex items-center gap-1.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-medium text-navy shadow-sm backdrop-blur-sm cursor-pointer select-none">
                          <input
                            type="checkbox"
                            checked={isInCompare(media.id)}
                            onChange={() => toggleCompare(media)}
                            disabled={!isInCompare(media.id) && compareItems.length >= 3}
                            className="h-3.5 w-3.5 rounded border-navy/30 text-gold accent-gold"
                          />
                          {isKo ? "비교" : "Compare"}
                        </label>
                        {popularIds.has(media.id) && (
                          <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold text-navy shadow-sm">
                            <Flame className="h-3 w-3" />
                            {isKo ? "인기" : "Popular"}
                          </div>
                        )}
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <Badge
                            variant="secondary"
                            className="bg-navy/5 text-navy text-xs"
                          >
                            {isKo
                              ? typeLabels[media.type].ko
                              : typeLabels[media.type].en}
                          </Badge>
                        </div>
                        <CardTitle className="text-base">
                          {isKo ? media.name : media.nameEn}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {isKo ? media.location : media.locationEn}
                        </div>
                        <div className="mt-2">
                          <div className="text-lg font-bold text-navy">
                            ₩{media.price.toLocaleString()}
                            <span className="text-xs font-normal text-muted-foreground">
                              만원 {t("media.perMonth")}
                            </span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {isKo
                              ? `월 ${media.price.toLocaleString()}만원~`
                              : `From ₩${media.price.toLocaleString()}M/mo`}
                          </div>
                        </div>
                        <div className="mt-3 border-t pt-3">
                          <ShareButtons
                            url={`/${locale}/media?id=${media.id}`}
                            title={isKo ? media.name : media.nameEn}
                            description={`${isKo ? media.location : media.locationEn} - ₩${media.price.toLocaleString()}만원/${t("media.perMonth")}`}
                            locale={locale}
                          />
                        </div>
                        <div className="mt-3">
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
                  ))}
                </div>
              )}
            </div>
          </div>
          )}
        </div>
      </section>

      {/* Floating compare bar */}
      <CompareBar
        items={compareItems}
        locale={locale}
        onRemove={(id) => setCompareItems((prev) => prev.filter((m) => m.id !== id))}
        onClear={() => setCompareItems([])}
      />

      {/* Add bottom padding when compare bar is visible */}
      {compareItems.length > 0 && <div className="h-20" />}
    </>
  );
}
