"use client";

import { useLocale, useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { GitCompare, ArrowLeft, FileDown, Camera, ShieldCheck, Loader2 } from "lucide-react";
import { useMemo, useState, useCallback, useRef } from "react";
import { useToast } from "@/components/toast-provider";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { cn } from "@/lib/utils";
import {
  downloadPdfFromHtmlElement,
  HTML_TO_PDF_DEFAULT_TIMEOUT_MS,
  captureElementAsPng,
} from "@/lib/html-to-pdf";
import type { MediaItem } from "@/lib/media-data";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { CompareSpecTable } from "@/components/compare-spec-table";
import {
  MEDIA_CATALOG_GRID_CLASS,
  MEDIA_CATALOG_COMPACT_GRID_CLASS,
  MediaCatalogGridCompactToggle,
} from "@/components/media-catalog-shared";
import { MediaCatalogCompactLinkRow } from "@/components/media-catalog-compact-link";
import { mediaItemDetailPath } from "@/lib/media-network-types";

export default function ComparePageClient({ items }: { items: MediaItem[] }) {
  const locale = useLocale();
  const isKo = locale === "ko";
  const tMedia = useTranslations("media");
  const t = useTranslations();
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const comparePdfRef = useRef<HTMLDivElement>(null);
  const [comparePdfLoading, setComparePdfLoading] = useState(false);

  const [layout, setLayout] = useState<"grid" | "compact">("grid");

  const popularIds = useMemo(
    () => new Set(["1", "2", "3", "8", "9"]),
    [],
  );

  const visibleItems = items;

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

  const [captureLoading, setCaptureLoading] = useState(false);
  const handleCaptureImage = useCallback(async () => {
    const el = comparePdfRef.current;
    if (!el) return;
    setCaptureLoading(true);
    try {
      const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await captureElementAsPng(el, `싱커드_매체비교_${stamp}.png`);
    } catch (e) {
      console.error("[compare-capture]", e);
      toast("error", tCommon("pdfGenerationFailed"));
    } finally {
      setCaptureLoading(false);
    }
  }, [toast, tCommon]);

  if (items.length < 2) {
    return (
      <HomeLandingDayNight>
        <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-h-[calc(100vh-72px)] px-4 py-16">
          <section className="mx-auto flex max-w-2xl flex-col items-center justify-center text-center">
            <div className="tkad-glass-surface relative w-full overflow-hidden px-8 py-10">
              <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.10] tkad-neon-grid" />
              <div
                aria-hidden
                className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_left,rgba(236,72,153,0.14),transparent_62%)]"
              />
              <div className="relative">
                <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-[20px] border border-white/14 bg-white/8 text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] backdrop-blur">
                  <GitCompare className="h-7 w-7" aria-hidden />
                </div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/65">
                  {`[ ${isKo ? "COMPARE" : "COMPARE"} ]`}
                </p>
                <h1 className="mt-3 text-balance text-2xl font-black tracking-tight text-white sm:text-3xl">
                  {items.length === 1
                    ? (isKo ? "매체를 1개 더 선택해주세요" : "Select one more media")
                    : (isKo ? "비교할 매체를 선택해주세요" : "Select media to compare")}
                </h1>
                <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-white/60">
                  {items.length === 1
                    ? (isKo
                        ? `"${items[0].name}" 선택됨 · 1개 더 선택하면 비교가 시작돼요`
                        : `"${items[0].nameEn || items[0].name}" selected · Select 1 more to compare`)
                    : (isKo
                        ? "매체 검색에서 2개 이상의 매체를 선택하세요"
                        : "Select at least 2 media from the media search page")}
                </p>
                <BtnBlock
                  href="/media"
                  variant="accent"
                  size="md"
                  className="mt-8 min-w-[14rem] rounded-[22px] border border-white/14 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 hover:opacity-95"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {isKo ? "매체 검색으로" : "Go to Media Search"}
                </BtnBlock>
              </div>
            </div>
          </section>
        </div>
      </HomeLandingDayNight>
    );
  }

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-h-[calc(100vh-72px)]">
        <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] text-white">
          <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
          <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
          <div aria-hidden className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay" />
          <div
            aria-hidden
            className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.12),rgba(0,0,0,0.55),rgba(0,0,0,0.92))]"
          />
          <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-16 text-center sm:px-6 sm:pb-20 sm:pt-20 lg:px-8 lg:pb-24 lg:pt-24">
            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.28em] text-white/65">
              {`[ ${isKo ? "스펙 비교" : "SPEC COMPARE"} ]`}
            </p>
            <div className="mb-2 mt-3 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
              <h1 className="text-balance text-4xl font-black tracking-[-0.06em] text-white sm:text-5xl">
                {isKo ? "매체 비교" : "Media Comparison"}
              </h1>
              <span className="rounded-2xl border border-white/14 bg-white/6 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                <span className="tkad-home-accent-text">BETA</span>
              </span>
            </div>
            <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base">
              {isKo
                ? "선택한 매체를 같은 카드 톤으로 보고, 표에서 수치를 나란히 비교한 뒤 견적·PDF·이미지 저장으로 이어갈 수 있습니다."
                : "Same cards as Media Search, a spec table for side-by-side metrics, then quote, PDF, or image export."}
            </p>
          </div>
        </section>

        <section className="tkad-media-browse-main border-t border-border/60 bg-card py-12 sm:py-16">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-8">
            <div className="min-w-0">
              <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-foreground">
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
                  <div className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent shadow-sm backdrop-blur dark:border-white/12 dark:bg-black/20 dark:text-foreground">
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
                      href={mediaItemDetailPath(media.id)}
                      imagePreparingLabel={tMedia("imagePreparing")}
                      popularIds={popularIds}
                    />
                  ))}
                </div>
              )}

              <div
                ref={comparePdfRef}
                className={cn("tkad-glass-surface p-1 sm:p-2", "bg-card/80 text-foreground")}
              >
                <CompareSpecTable items={visibleItems} isKo={isKo} />
              </div>

              <div className="mt-10 flex flex-col items-stretch gap-4 sm:mt-12 sm:items-center md:gap-5">
                <div className="flex w-full max-w-4xl flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-3">
                  <BtnBlock
                    href={`/quote?media=${items.map((m) => m.id).join(",")}`}
                    variant="accent"
                    size="md"
                    className="w-full min-h-12 justify-center rounded-[22px] border border-white/14 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.95))] text-white shadow-[0_18px_60px_rgba(0,0,0,0.55)] transition-transform hover:-translate-y-0.5 hover:opacity-95 sm:w-auto sm:min-w-[10rem]"
                  >
                    {isKo ? "견적 요청" : "Request a quote"}
                  </BtnBlock>
                  <BtnBlock
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={comparePdfLoading}
                    onClick={() => void handleComparePdfDownload()}
                    className="w-full min-h-12 justify-center rounded-[22px] border border-border bg-card text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-muted sm:w-auto sm:min-w-[10rem] disabled:opacity-50 dark:border-white/12 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
                  >
                    {comparePdfLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileDown className="h-4 w-4" />
                    )}
                    {isKo ? "PDF 다운로드" : "Download PDF"}
                  </BtnBlock>
                  <BtnBlock
                    type="button"
                    variant="secondary"
                    size="md"
                    disabled={captureLoading}
                    onClick={() => void handleCaptureImage()}
                    className="w-full min-h-12 justify-center rounded-[22px] border border-border bg-card text-foreground backdrop-blur transition-all hover:-translate-y-0.5 hover:bg-muted sm:w-auto sm:min-w-[10rem] disabled:opacity-50 dark:border-white/12 dark:bg-white/8 dark:text-white dark:hover:bg-white/12"
                  >
                    {captureLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Camera className="h-4 w-4" />
                    )}
                    {isKo ? "이미지 저장" : "Save Image"}
                  </BtnBlock>
                </div>
                <p className="text-center font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                  {isKo
                    ? "견적·상세: 위 매체 ID가 그대로 전달됩니다."
                    : "Quote and detail links pass the same media IDs."}
                </p>
              </div>
            </div>
            </div>
          </div>
        </section>
      </div>
    </HomeLandingDayNight>
  );
}
