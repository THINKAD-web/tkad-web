"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { GitCompare, ArrowLeft, FileDown, ShieldCheck } from "lucide-react";
import { useMemo, useState, useCallback, useRef } from "react";
import { Loader2 } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  downloadPdfFromHtmlElement,
  HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
} from "@/lib/html-to-pdf";
import { COMPARE_MAX_ITEMS } from "@/lib/compare-constants";
import { matchesMediaTextQuery, type MediaItem } from "@/lib/media-data";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { CompareSpecTable } from "@/components/compare-spec-table";
import MediaSearchAutocomplete from "@/components/media-search-autocomplete";
import {
  MEDIA_CATALOG_GRID_CLASS,
  MEDIA_CATALOG_COMPACT_GRID_CLASS,
  MediaCatalogStickyAside,
  MediaCatalogGridCompactToggle,
} from "@/components/media-catalog-shared";
import { MediaCatalogCompactLinkRow } from "@/components/media-catalog-compact-link";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { mediaPricePeriodTranslationKey } from "@/lib/media-price-format";

export default function ComparePageClient({ items }: { items: MediaItem[] }) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const tMedia = useTranslations("media");
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const comparePdfRef = useRef<HTMLDivElement>(null);
  const [comparePdfLoading, setComparePdfLoading] = useState(false);

  const [textFilter, setTextFilter] = useState("");
  const [compareSearchKey, setCompareSearchKey] = useState(0);
  const [layout, setLayout] = useState<"grid" | "compact">("grid");

  const popularIds = useMemo(
    () => new Set(["1", "2", "3", "8", "9"]),
    [],
  );

  const visibleItems = useMemo(() => {
    const q = textFilter.trim().toLowerCase();
    if (!q) return items;
    return items.filter((m) => matchesMediaTextQuery(m, q));
  }, [items, textFilter]);

  const resetCompareFilters = useCallback(() => {
    setTextFilter("");
    setCompareSearchKey((k) => k + 1);
  }, []);

  const handleComparePdfDownload = useCallback(async () => {
    const el = comparePdfRef.current;
    if (!el) {
      toast("error", tCommon("pdfGenerationFailed"));
      return;
    }
    setComparePdfLoading(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10);
      const filename = `thinkad-media-compare-${stamp}.pdf`;
      await downloadPdfFromHtmlElement(el, filename, {
        timeoutMs: HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
      });
    } catch (e) {
      console.error("[compare-pdf]", e);
      toast("error", tCommon("pdfGenerationFailed"));
    } finally {
      setComparePdfLoading(false);
    }
  }, [toast, tCommon]);

  if (items.length < 2) {
    return (
      <section className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
        <GitCompare className="mb-4 h-16 w-16 text-navy/15" aria-hidden />
        <h1 className="text-2xl font-bold text-navy">
          {isKo ? "비교할 매체를 선택해주세요" : "Select media to compare"}
        </h1>
        <p className="mt-2 text-muted-foreground">
          {isKo
            ? `매체 검색에서 2~${COMPARE_MAX_ITEMS}개의 매체를 선택하세요`
            : `Select 2–${COMPARE_MAX_ITEMS} media from the media search page`}
        </p>
        <Link href="/media" className="mt-6">
          <Button className="btn-gold h-11 rounded-xl px-8 font-bold text-navy">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {isKo ? "매체 검색으로" : "Go to Media Search"}
          </Button>
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {isKo ? "매체 비교" : "Media Comparison"}
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">
            {isKo
              ? `선택한 매체를 매체 검색과 같은 카드로 확인하고, 견적·PDF로 이어갈 수 있습니다. (최대 ${COMPARE_MAX_ITEMS}개)`
              : `Review selected media in the same cards as Media Search, then request a quote or PDF (up to ${COMPARE_MAX_ITEMS}).`}
          </p>
        </div>
      </section>

      <section className="py-28">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-8 lg:flex-row">
            <MediaCatalogStickyAside>
              <Button
                asChild
                variant="outline"
                className="h-11 w-full rounded-xl border-navy/20 font-semibold text-navy"
              >
                <Link href="/media">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {isKo ? "매체 검색으로" : "Back to Media Search"}
                </Link>
              </Button>
              <div>
                <label className="mb-2 block text-sm font-semibold text-navy">
                  {t("common.search")}
                </label>
                <MediaSearchAutocomplete
                  key={compareSearchKey}
                  locale={locale}
                  catalog={items}
                  onSelect={(m) =>
                    setTextFilter((isKo ? m.name : m.nameEn).trim())
                  }
                  onSearchSubmit={(q) => setTextFilter(q.trim())}
                  onQueryChange={(q) => {
                    if (!q.trim()) setTextFilter("");
                  }}
                  searchButtonLabel={t("media.searchButton")}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full rounded-xl border-navy/15 font-semibold text-muted-foreground"
                onClick={resetCompareFilters}
              >
                {t("common.reset")}
              </Button>
            </MediaCatalogStickyAside>

            <div className="min-w-0 flex-1">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {t("media.results")}: {visibleItems.length}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MediaCatalogGridCompactToggle
                    layout={layout}
                    onLayoutChange={setLayout}
                    gridLabel={t("media.browseCardLayoutGrid")}
                    compactLabel={t("media.browseCardLayoutCompact")}
                  />
                  <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                    <ShieldCheck className="h-4 w-4" aria-hidden />
                    <span>{tMedia("browseCatalogVerifiedBadge")}</span>
                  </div>
                </div>
              </div>

              {visibleItems.length === 0 ? (
                <div className="flex h-64 items-center justify-center rounded-xl border text-sm text-muted-foreground">
                  {isKo ? "검색 결과가 없습니다." : "No matches for your search."}
                </div>
              ) : layout === "grid" ? (
                <div className={MEDIA_CATALOG_GRID_CLASS}>
                  {visibleItems.map((media) => (
                    <MediaCatalogGridCard
                      key={media.id}
                      variant="link"
                      media={media}
                      isKo={isKo}
                      imagePreparingLabel={tMedia("imagePreparing")}
                      popularIds={popularIds}
                    />
                  ))}
                </div>
              ) : (
                <div className={MEDIA_CATALOG_COMPACT_GRID_CLASS}>
                  {visibleItems.map((media) => (
                    <MediaCatalogCompactLinkRow
                      key={media.id}
                      media={media}
                      isKo={isKo}
                      href={mediaItemDetailPath(media.id)}
                      imagePreparingLabel={tMedia("imagePreparing")}
                      pricePeriodLabel={tMedia(
                        mediaPricePeriodTranslationKey(media.pricePeriod),
                      )}
                      popularIds={popularIds}
                    />
                  ))}
                </div>
              )}

              <div
                ref={comparePdfRef}
                className="rounded-2xl bg-white p-2 sm:p-0"
              >
                <CompareSpecTable items={items} isKo={isKo} />
              </div>

              <div className="mt-14 flex flex-col items-stretch gap-4 sm:mt-16 sm:items-center md:gap-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
                  <Button
                    asChild
                    className="h-11 rounded-xl bg-navy px-8 font-bold text-white shadow-md hover:bg-navy/90"
                  >
                    <Link
                      href={`/quote?media=${items.map((m) => m.id).join(",")}`}
                    >
                      {isKo ? "견적 요청" : "Request a quote"}
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={comparePdfLoading}
                    onClick={() => void handleComparePdfDownload()}
                    className="h-11 rounded-xl border-2 border-gold/50 px-8 font-bold text-navy hover:bg-gold/10 disabled:opacity-60"
                  >
                    {comparePdfLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="mr-2 h-4 w-4" />
                    )}
                    {isKo ? "PDF 다운로드" : "Download PDF"}
                  </Button>
                </div>
                <p className="text-center text-[11px] text-muted-foreground">
                  {isKo
                    ? "견적 요청 시 위에서 비교 중인 매체가 모두 선택된 상태로 이동합니다."
                    : "Quote opens with all media you are comparing pre-selected."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
