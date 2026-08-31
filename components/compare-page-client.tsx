"use client";

import { useLocale, useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { ArrowLeft, FileDown, Camera, ShieldCheck, Loader2 } from "lucide-react";
import { useMemo, useState, useCallback, useRef } from "react";
import { useToast } from "@/components/toast-provider";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import {
  CategoryExploreHero,
  CategoryHeroCtaRow,
  categoryHeroCtaPrimaryClass,
} from "@/components/category-explore-hero";
import { cn } from "@/lib/utils";
import {
  downloadPdfFromHtmlElement,
  downloadBlobFile,
  HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
  captureElementAsPng,
} from "@/lib/html-to-pdf";
import type { MediaItem } from "@/lib/media-data";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { CompareSpecTable } from "@/components/compare-spec-table";
import { CompareWinnerCard } from "@/components/compare/compare-winner-card";
import { CompareRadarChart } from "@/components/compare/compare-radar-chart";
import { CompareQuoteCalculator } from "@/components/compare/compare-quote-calculator";
import { buildPlannerHrefWithMediaIds } from "@/lib/planner-media-href";
import { CompareQuotePdf } from "@/components/compare-pdf-quote";
import {
  MEDIA_CATALOG_GRID_CLASS,
  MEDIA_CATALOG_COMPACT_GRID_CLASS,
  MediaCatalogGridCompactToggle,
} from "@/components/media-catalog-shared";
import { MediaCatalogCompactLinkRow } from "@/components/media-catalog-compact-link";
import { mediaItemDetailPath } from "@/lib/media-network-types";
import { useFeatureAccess } from "@/hooks/use-feature-access";
import { PlannerProGate } from "@/components/planner/planner-neon-ui";

export default function ComparePageClient({ items }: { items: MediaItem[] }) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const { allowed: comparePro, loading: compareProLoading, access: compareAccess } =
    useFeatureAccess("detail_data");
  const tMedia = useTranslations("media");
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const comparePdfRef = useRef<HTMLDivElement>(null);
  const quotePdfRef = useRef<HTMLDivElement>(null);
  const [comparePdfLoading, setComparePdfLoading] = useState(false);
  const [quotePdfLoading, setQuotePdfLoading] = useState(false);

  const [layout, setLayout] = useState<"grid" | "compact">("grid");

  /** 캡처/파일명 stamp — 헤더와 파일명에서 동일 값 사용해 일치 보장 */
  const issuedStamp = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return { ymd: `${y}${m}${day}`, ymdDot: `${y}.${m}.${day}` };
  }, []);
  const quoteRef = useMemo(
    () => `CMP-${issuedStamp.ymd}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    [issuedStamp.ymd],
  );

  const visibleItems = items;

  const popularIds = useMemo(
    () =>
      new Set(
        visibleItems
          .filter((m) =>
            m.trustBadges?.some(
              (b) => b.id === "popular" || b.id === "hot_week",
            ),
          )
          .map((m) => m.id),
      ),
    [visibleItems],
  );

  // 표만 캡처하는 기존 PDF (이미지 저장 시 동일 영역 사용)
  const handleComparePdfDownload = useCallback(async () => {
    const el = comparePdfRef.current;
    if (!el) {
      toast("error", tCommon("pdfGenerationFailed"));
      return;
    }
    setComparePdfLoading(true);
    const stamp = new Date().toISOString().slice(0, 10);
    const filename = `thinkad-media-compare-${stamp}.pdf`;
    const ids = visibleItems.map((m) => m.id).join(",");
    try {
      const res = await fetch(
        `/api/compare/pdf?ids=${encodeURIComponent(ids)}`,
      );
      if (res.ok) {
        const blob = await res.blob();
        downloadBlobFile(blob, filename);
        return;
      }
    } catch (e) {
      console.warn("[compare-pdf] server route failed, falling back to client", e);
    }
    try {
      await downloadPdfFromHtmlElement(el, filename, {
        timeoutMs: HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
      });
    } catch (e) {
      console.error("[compare-pdf]", e);
      toast("error", tCommon("pdfGenerationFailed"));
    } finally {
      setComparePdfLoading(false);
    }
  }, [toast, tCommon, visibleItems]);

  // [PATCH-P2-03] 견적서 PDF — 로고/발행일/스펙표/총 예상 비용 포함, 파일명 THINKAD_견적비교_YYYYMMDD.pdf
  const handleQuotePdfDownload = useCallback(async () => {
    const el = quotePdfRef.current;
    if (!el) {
      toast("error", tCommon("pdfGenerationFailed"));
      return;
    }
    setQuotePdfLoading(true);
    try {
      const filename = isKo
        ? `THINKAD_견적비교_${issuedStamp.ymd}.pdf`
        : `THINKAD_quote_compare_${issuedStamp.ymd}.pdf`;
      await downloadPdfFromHtmlElement(el, filename, {
        timeoutMs: HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
      });
      toast("success", isKo ? "견적서 PDF를 다운로드했습니다." : "Quote PDF downloaded.");
    } catch (e) {
      console.error("[compare-quote-pdf]", e);
      toast("error", tCommon("pdfGenerationFailed"));
    } finally {
      setQuotePdfLoading(false);
    }
  }, [isKo, issuedStamp.ymd, toast, tCommon]);

  const [captureLoading, setCaptureLoading] = useState(false);
  const handleCaptureImage = useCallback(async () => {
    const el = comparePdfRef.current;
    if (!el) return;
    setCaptureLoading(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await captureElementAsPng(el, `싱커드_매체비교_${stamp}.png`, {
        timeoutMs: HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
      });
    } catch (e) {
      console.error("[compare-capture]", e);
      toast("error", tCommon("pdfGenerationFailed"));
    } finally {
      setCaptureLoading(false);
    }
  }, [toast, tCommon]);

  if (items.length < 2) {
    const emptyTitle =
      items.length === 1
        ? isKo
          ? "매체를 1개 더"
          : "One more"
        : isKo
          ? "비교할 매체"
          : "Select media";
    const emptySubtitle =
      items.length === 1
        ? isKo
          ? `"${items[0].name}" 선택됨 · 1개 더 선택하면 비교가 시작됩니다.`
          : `"${items[0].nameEn || items[0].name}" selected · Add one more to compare.`
        : isKo
          ? "매체 검색에서 2개 이상의 매체를 선택하세요."
          : "Pick at least two media from the catalog.";

    return (
      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)]">
          <CategoryExploreHero
            code="// COMPARE"
            headlineBefore={isKo ? "" : ""}
            headlineGradient={emptyTitle}
            subtitle={emptySubtitle}
          >
            <CategoryHeroCtaRow>
              <BtnBlock
                href="/media"
                className={cn(categoryHeroCtaPrimaryClass, "min-w-[14rem]")}
              >
                <ArrowLeft className="h-4 w-4" />
                {isKo ? "매체 검색으로" : "Go to Media Search"}
              </BtnBlock>
            </CategoryHeroCtaRow>
          </CategoryExploreHero>
        </div>
      </HomeLandingDayNight>
    );
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)]">
        <CategoryExploreHero
          code={isKo ? "// 스펙 비교" : "// SPEC COMPARE"}
          showBeta
          headlineBefore={isKo ? "매체 " : "Media "}
          headlineGradient={isKo ? "비교" : "compare"}
          subtitle={
            isKo
              ? "선택한 매체를 같은 카드 톤으로 보고, 표에서 수치를 나란히 비교한 뒤 견적·PDF·이미지 저장으로 이어갈 수 있습니다."
              : "Same cards as Media Search, a spec table for side-by-side metrics, then quote, PDF, or image export."
          }
        />

        <section className="tkad-media-browse-main border-t border-border/60 bg-card py-12 sm:py-16">
          <div className="ui-container">
            <div className="flex flex-col gap-8">
            <div className="min-w-0">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="tkad-type-label text-foreground">
                  {t("media.results")}:{" "}
                  <span className="tabular-nums text-accent">
                    {visibleItems.length}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <MediaCatalogGridCompactToggle
                    layout={layout}
                    onLayoutChange={setLayout}
                    gridLabel={t("media.browseCardLayoutGrid")}
                    compactLabel={t("media.browseCardLayoutCompact")}
                  />
                  <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 tkad-type-label text-accent shadow-sm backdrop-blur dark:border-white/12 border-gray-200 dark:bg-black bg-white/20 dark:text-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span>{tMedia("browseCatalogVerifiedBadge")}</span>
                  </div>
                </div>
              </div>

              {visibleItems.length === 0 ? null : layout === "grid" ? (
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
                      href={mediaItemDetailPath(media)}
                      imagePreparingLabel={tMedia("imagePreparing")}
                      popularIds={popularIds}
                    />
                  ))}
                </div>
              )}

              <CompareWinnerCard items={visibleItems} isKo={isKo} className="mb-6" />

              <CompareRadarChart items={visibleItems} isKo={isKo} className="mb-6" />

              <PlannerProGate
                isPro={comparePro}
                loading={compareProLoading}
                isKo={isKo}
                access={compareAccess}
                feature="detail_data"
                minHeightClass="min-h-[20rem]"
                className="space-y-6"
              >
                <div
                  ref={comparePdfRef}
                  data-quote-pdf-background="#ffffff"
                  className={cn(
                    "tkad-glass-surface tkad-pdf-capture-root p-1 sm:p-2",
                    "bg-card/80 text-foreground",
                  )}
                >
                  <CompareSpecTable items={visibleItems} isKo={isKo} />
                </div>

                {/* [PATCH-P2-03] 화면에 보이지 않는 견적서 PDF 캡처 영역 */}
                <CompareQuotePdf
                  ref={quotePdfRef}
                  items={visibleItems}
                  isKo={isKo}
                  issuedAt={issuedStamp.ymdDot}
                  quoteRef={quoteRef}
                />

                <CompareQuoteCalculator items={visibleItems} isKo={isKo} />

                <div className="mt-10 flex flex-col items-stretch gap-4 sm:mt-12 sm:items-center md:gap-5">
                  <div className="tkad-compare-action-bar flex w-full max-w-4xl flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                    <BtnBlock
                      href={buildPlannerHrefWithMediaIds(items.map((m) => m.id))}
                      variant="accent"
                      size="md"
                      className="tkad-neon-cta-clean w-full min-h-12 justify-center rounded-[22px] normal-case tracking-normal sm:w-auto sm:min-w-[12rem]"
                    >
                      {isKo ? "이 조합으로 플래너 시작" : "Start planner with selection"}
                    </BtnBlock>
                    <BtnBlock
                      href={`/quote?media=${items.map((m) => m.id).join(",")}`}
                      variant="accent"
                      size="md"
                      className="tkad-compare-cta-solid w-full min-h-12 justify-center rounded-[22px] normal-case tracking-normal sm:w-auto sm:min-w-[10rem]"
                    >
                      {isKo ? "견적 요청" : "Request a quote"}
                    </BtnBlock>
                    <BtnBlock
                      type="button"
                      variant="accent"
                      size="md"
                      disabled={quotePdfLoading}
                      onClick={() => void handleQuotePdfDownload()}
                      className="tkad-compare-cta-solid w-full min-h-12 justify-center rounded-[22px] normal-case tracking-normal sm:w-auto sm:min-w-[16rem] disabled:opacity-50"
                    >
                      {quotePdfLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      {isKo
                        ? "선택 매체 견적서 다운로드 (PDF)"
                        : "Download Quote PDF"}
                    </BtnBlock>
                    <BtnBlock
                      type="button"
                      variant="secondary"
                      size="md"
                      disabled={comparePdfLoading}
                      onClick={() => void handleComparePdfDownload()}
                      className="tkad-compare-cta-secondary w-full min-h-12 justify-center rounded-[22px] normal-case tracking-normal sm:w-auto sm:min-w-[10rem] disabled:opacity-50"
                    >
                      {comparePdfLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileDown className="h-4 w-4" />
                      )}
                      {isKo ? "비교표 PDF" : "Spec table PDF"}
                    </BtnBlock>
                    <BtnBlock
                      type="button"
                      variant="secondary"
                      size="md"
                      disabled={captureLoading}
                      onClick={() => void handleCaptureImage()}
                      className="tkad-compare-cta-secondary w-full min-h-12 justify-center rounded-[22px] normal-case tracking-normal sm:w-auto sm:min-w-[10rem] disabled:opacity-50"
                    >
                      {captureLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                      {isKo ? "이미지 저장" : "Save Image"}
                    </BtnBlock>
                  </div>
                  <p className="text-center tkad-type-label text-muted-foreground">
                    {isKo
                      ? "견적·상세: 위 매체 ID가 그대로 전달됩니다."
                      : "Quote and detail links pass the same media IDs."}
                  </p>
                </div>
              </PlannerProGate>
            </div>
            </div>
          </div>
        </section>
      </div>
    </HomeLandingDayNight>
  );
}
