"use client";

import { useLocale, useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { CategoryExploreHero } from "@/components/category-explore-hero";
import {
  CheckCircle,
  Images,
  Calculator,
  MapPin,
  Send,
  FileDown,
  Camera,
  Loader2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  LayoutTemplate,
  ImagePlus,
  Trash2,
  Mail,
  ShieldCheck,
  Flame,
  Lock,
} from "lucide-react";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
} from "react";
import {
  dedupeImageUrls,
  getPrimaryMediaImageUrl,
  matchesMediaTextQuery,
  typeLabels,
  type MediaItem,
} from "@/lib/media-data";
import { mediaToDocumentDetail } from "@/lib/document-media-detail";
import { computeNetworkMonthlyFromMediaItem } from "@/lib/media-network-types";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import { QuoteMediaSelectCard } from "@/components/quote/quote-media-select-card";
import {
  MediaManualBrowseFilters,
  type MediaManualBrowseViewMode,
} from "@/components/media/media-manual-browse-filters";
import { filterMediaByDiscoveryChips } from "@/lib/media-discovery-client-filter";
import {
  FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS,
  FloatingSelectionBar,
} from "@/components/floating-selection-bar";
import {
  MEDIA_CATALOG_GRID_CLASS,
  MEDIA_CATALOG_COMPACT_GRID_CLASS,
  MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS,
} from "@/components/media-catalog-shared";
import { PerPageSelect } from "@/components/per-page-select";
import { useMediaCatalogFilters } from "@/lib/use-media-catalog-filters";
import { cn } from "@/lib/utils";
import {
  computeCatalogBounds,
  defaultAdvancedFilterState,
  passesMediaAdvancedFilters,
} from "@/lib/media-filter-advanced";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import { MediaPriceExclNote } from "@/components/media/media-price-excl-note";
import {
  compareMediaByMonthlyEquivalentPrice,
  formatMediaPriceWithPeriodSuffix,
} from "@/lib/media-price-format";
import { packagePeriodToggleMeta } from "@/lib/quote-package-period-toggle";
import type { QuoteMediaSelectionSnapshot } from "@/lib/quote-media-selections";
import { buildQuoteMediaSelectionSnapshot } from "@/lib/quote-snapshot-build";
import {
  buildQuoteWizardLineContext,
  formatQuoteCampaignPeriodWithDays,
  inferQuoteCampaignPeriodFromMedia,
  isQuoteCampaignPeriodKey,
  quoteCampaignDaysFromPeriodKey,
  quoteCatalogDisplayPriceMan,
  resolveQuoteMediaPricePeriod,
  type QuoteCampaignPeriodKey,
} from "@/lib/quote-wizard-pricing";
import { QuoteMediaQuantityFields } from "@/components/quote/quote-media-quantity-fields";
import {
  buildQuoteDeeplinkPath,
  parseQuotePoMap,
  parseQuoteUnitsMap,
} from "@/lib/quote-deeplink";
import { isPerUnitGradePriceOptions, resolveMediaQuantity } from "@/lib/media-quantity";
import { shouldShowPlannerQuantityControl } from "@/lib/planner/planner-media-quantity";
import { useToast } from "@/components/toast-provider";
import { useRouter } from "@/i18n/navigation";
import { QUOTE_VALIDITY_DAYS } from "@/lib/quote-calculator";
import { DocumentPreviewFrame } from "@/components/document/document-layout";
import { QuotePdfPreview } from "@/components/quote/quote-preview";
import { QuotePremium } from "@/components/quote/quote-premium";
import { captureElementAsPng } from "@/lib/html-to-pdf";
import type { QuoteExportFormat } from "@/lib/quote-export/types";
import { PlannerPdfDownloadGate } from "@/components/planner/planner-pdf-download-gate";

const PHONE_RE = /^[\d\-+() ]{8,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_MAX_BYTES = 600 * 1024;

async function runWithQuotePdfExport(
  el: HTMLElement | null,
  work: () => Promise<void>,
) {
  if (!el) throw new Error("no preview");
  const wrap = el.closest("[data-quote-pdf-scale-wrap]");
  wrap?.setAttribute("data-quote-pdf-exporting", "true");
  await new Promise<void>((r) =>
    requestAnimationFrame(() => requestAnimationFrame(() => r())),
  );
  await new Promise<void>((r) => setTimeout(r, 80));
  try {
    await work();
  } finally {
    wrap?.removeAttribute("data-quote-pdf-exporting");
  }
}

type PeriodKey = QuoteCampaignPeriodKey;

const QUOTE_WIZARD_PERIOD_KEYS: PeriodKey[] = [
  "1day",
  "3days",
  "5days",
  "7days",
  "15days",
  "30days",
];

type FormState = {
  company: string;
  name: string;
  phone: string;
  email: string;
  message: string;
  website: string;
  budgetMin: string;
  budgetMax: string;
};

type FormErrors = Partial<Record<"name" | "phone" | "media", string>>;

type WizardStep = 1 | 2 | 3 | 4;

export default function QuotePageClient({ catalog }: { catalog: MediaItem[] }) {
  const t = useTranslations();
  const tPlanner = useTranslations("planner");
  const tMedia = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";

  const [step, setStep] = useState<WizardStep>(1);
  const [period, setPeriod] = useState<PeriodKey>("30days");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [browseViewMode, setBrowseViewMode] =
    useState<MediaManualBrowseViewMode>("card");
  const [browseMainCategory, setBrowseMainCategory] = useState("");
  const [browseSubCategory, setBrowseSubCategory] = useState("");
  const [browseTarget, setBrowseTarget] = useState("");
  const [browseRegionMain, setBrowseRegionMain] = useState("");
  const [browseRegionSub, setBrowseRegionSub] = useState("");
  const [browsePriceMin, setBrowsePriceMin] = useState("");
  const [browsePriceMax, setBrowsePriceMax] = useState("");
  const [browseFeatures, setBrowseFeatures] = useState("");
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaPageSize, setMediaPageSize] = useState(12);
  const [mediaTextFilter, setMediaTextFilter] = useState("");
  const [networkQuoteOptions, setNetworkQuoteOptions] = useState<
    Record<string, { units: number; regionScope: string }>
  >({});
  /** 매체별 `priceOptions` 선택 인덱스 (견적 월 단가 반영) */
  const [mediaPriceOptionIndex, setMediaPriceOptionIndex] = useState<
    Record<string, number>
  >({});
  /** 이동형 단일 등 unit 모드 수량 */
  const [mediaQuantities, setMediaQuantities] = useState<Record<string, number>>(
    {},
  );
  /** 매체별 패키지 기간만 집행 토글 (bundleDays 있는 옵션만) */
  const [usePackagePeriodByMediaId, setUsePackagePeriodByMediaId] = useState<
    Record<string, boolean>
  >({});
  const mediaQueryApplied = useRef(false);
  /** Step 2·URL에서 사용자가 명시한 캠페인 기간 — true면 옵션 변경 시 자동 추종 안 함 */
  const periodDirtyRef = useRef(false);
  const [template, setTemplate] = useState<QuoteTemplateId>("default");
  const [discoverySort, setDiscoverySort] = useState("popular");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [emailHoneypot, setEmailHoneypot] = useState("");

  // URL `?media=` + `po` 는 layout effect 에서 먼저 반영 — 이후 `selectedIds` 동기화
  // useEffect가 빈 `selectedIds`로 `mediaPriceOptionIndex`를 지우는 레이스를 방지합니다.
  useLayoutEffect(() => {
    if (mediaQueryApplied.current) return;
    if (typeof window === "undefined") return;
    // catalog 가 아직 비어 있으면 다음 렌더에 다시 시도 (사용자 견적이 매체 일부만 받는 회귀 방지).
    if (catalog.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("media");
    if (!raw) return;
    const requestedIds = raw
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    const matchedIds = requestedIds.filter((id) =>
      catalog.some((m) => m.id === id),
    );
    const missingIds = requestedIds.filter(
      (id) => !catalog.some((m) => m.id === id),
    );
    if (missingIds.length > 0) {
      console.warn(
        "[quote] requested media IDs not found in catalog",
        missingIds,
      );
    }
    if (matchedIds.length === 0) return;
    mediaQueryApplied.current = true;
    setSelectedIds(new Set(matchedIds));
    const unitsRaw = params.get("units");
    const unitsMapRaw = params.get("unitsMap");
    const unitsFromMap = parseQuoteUnitsMap(unitsMapRaw);
    const poMapRaw = params.get("poMap");
    const poFromMap = parseQuotePoMap(poMapRaw);

    const mobileQtyInit: Record<string, number> = {};
    const networkQtyInit: Record<string, { units: number; regionScope: string }> =
      {};

    if (matchedIds.length === 1 && unitsRaw) {
      const u = parseInt(unitsRaw, 10);
      if (Number.isFinite(u) && u > 0) {
        const soleId = matchedIds[0]!;
        const m = catalog.find((x) => x.id === soleId);
        if (m?.catalogSource === "network") {
          networkQtyInit[soleId] = { units: u, regionScope: "all" };
        } else {
          mobileQtyInit[soleId] = u;
        }
      }
    } else if (Object.keys(unitsFromMap).length > 0) {
      for (const id of matchedIds) {
        const u = unitsFromMap[id];
        if (u == null) continue;
        const m = catalog.find((x) => x.id === id);
        if (m?.catalogSource === "network") {
          networkQtyInit[id] = { units: u, regionScope: "all" };
        } else {
          mobileQtyInit[id] = u;
        }
      }
    }
    if (Object.keys(mobileQtyInit).length > 0) {
      setMediaQuantities(mobileQtyInit);
    }
    if (Object.keys(networkQtyInit).length > 0) {
      setNetworkQuoteOptions((prev) => ({ ...prev, ...networkQtyInit }));
    }

    const poRaw = params.get("po");
    const po = poRaw != null ? parseInt(poRaw, 10) : NaN;
    let poIdx = 0;
    if (matchedIds.length === 1 && Number.isFinite(po) && po >= 0) {
      const m = catalog.find((x) => x.id === matchedIds[0]);
      const n = m?.priceOptions?.length ?? 0;
      if (n > 0) {
        poIdx = Math.min(po, n - 1);
        setMediaPriceOptionIndex({ [matchedIds[0]!]: poIdx });
      }
    } else if (Object.keys(poFromMap).length > 0) {
      const nextPo: Record<string, number> = {};
      for (const id of matchedIds) {
        const p = poFromMap[id];
        if (p == null) continue;
        const m = catalog.find((x) => x.id === id);
        const n = m?.priceOptions?.length ?? 0;
        if (n > 0) nextPo[id] = Math.min(Math.max(0, p), n - 1);
      }
      if (Object.keys(nextPo).length > 0) setMediaPriceOptionIndex(nextPo);
    }
    const periodParam = params.get("period");
    if (periodParam && isQuoteCampaignPeriodKey(periodParam)) {
      setPeriod(periodParam);
      periodDirtyRef.current = true;
    } else if (matchedIds.length === 1) {
      const m = catalog.find((x) => x.id === matchedIds[0]);
      if (m) {
        setPeriod(inferQuoteCampaignPeriodFromMedia(m, poIdx));
      }
    }
  }, [catalog]);

  useEffect(() => {
    setNetworkQuoteOptions((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        const m = catalog.find((x) => x.id === id);
        if (m?.catalogSource === "network" && !next[id]) {
          next[id] = {
            units: Math.max(m.networkMinUnits ?? 1, 1),
            regionScope: "all",
          };
        }
      }
      for (const k of Object.keys(next)) {
        if (!selectedIds.has(k)) delete next[k];
      }
      return next;
    });
  }, [selectedIds, catalog]);

  useEffect(() => {
    setMediaPriceOptionIndex((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        const m = catalog.find((x) => x.id === id);
        const len = m?.priceOptions?.length ?? 0;
        if (len === 0) {
          delete next[id];
          continue;
        }
        const cur = next[id] ?? 0;
        next[id] = Math.min(Math.max(0, cur), len - 1);
      }
      for (const k of Object.keys(next)) {
        if (!selectedIds.has(k)) delete next[k];
      }
      return next;
    });
  }, [selectedIds, catalog]);

  useEffect(() => {
    setMediaQuantities((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const id of selectedIds) {
        const m = catalog.find((x) => x.id === id);
        if (!m || m.catalogSource === "network") continue;
        if (!shouldShowPlannerQuantityControl(m)) continue;
        if (next[id] == null) {
          next[id] = resolveMediaQuantity(m);
          changed = true;
        }
      }
      for (const k of Object.keys(next)) {
        if (!selectedIds.has(k)) {
          delete next[k];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [selectedIds, catalog]);

  useEffect(() => {
    setUsePackagePeriodByMediaId((prev) => {
      const next = { ...prev };
      for (const id of selectedIds) {
        if (!next[id]) continue;
        const m = catalog.find((x) => x.id === id);
        const poIdx = mediaPriceOptionIndex[id] ?? 0;
        if (!m || !packagePeriodToggleMeta(m, poIdx)) {
          delete next[id];
        }
      }
      for (const k of Object.keys(next)) {
        if (!selectedIds.has(k)) delete next[k];
      }
      return next;
    });
  }, [selectedIds, catalog, mediaPriceOptionIndex]);

  const [form, setForm] = useState<FormState>({
    company: "",
    name: "",
    phone: "",
    email: "",
    message: "",
    website: "",
    budgetMin: "",
    budgetMax: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormState | "media", boolean>>
  >({});
  const { toast } = useToast();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<QuoteExportFormat | null>(null);
  const [emailPdfLoading, setEmailPdfLoading] = useState(false);
  const [quoteIssuedAt] = useState(() => new Date());
  const quoteValidUntil = useMemo(() => {
    const d = new Date(quoteIssuedAt);
    d.setDate(d.getDate() + QUOTE_VALIDITY_DAYS);
    return d;
  }, [quoteIssuedAt]);

  const selectedMedia = useMemo(
    () => catalog.filter((m) => selectedIds.has(m.id)),
    [catalog, selectedIds],
  );

  const handleMediaPriceOptionChange = useCallback(
    (media: MediaItem, rawIdx: number) => {
      const idx = Number.isFinite(rawIdx) && rawIdx >= 0 ? rawIdx : 0;
      setMediaPriceOptionIndex((p) => ({
        ...p,
        [media.id]: idx,
      }));
      setUsePackagePeriodByMediaId((p) => {
        if (!p[media.id]) return p;
        const next = { ...p };
        delete next[media.id];
        return next;
      });
      const opt = media.priceOptions?.[idx];
      if (
        isPerUnitGradePriceOptions(media) &&
        opt?.units != null &&
        opt.units > 0
      ) {
        setMediaQuantities((p) => ({ ...p, [media.id]: opt.units! }));
      }
      if (
        selectedMedia.length === 1 &&
        selectedMedia[0]?.id === media.id &&
        !periodDirtyRef.current
      ) {
        setPeriod(inferQuoteCampaignPeriodFromMedia(media, idx));
      }
    },
    [selectedMedia],
  );

  const handleMediaQuantityChange = useCallback((mediaId: string, units: number) => {
    setMediaQuantities((p) => ({ ...p, [mediaId]: units }));
  }, []);

  const handleNetworkQuoteOptionsChange = useCallback(
    (mediaId: string, patch: Partial<{ units: number; regionScope: string }>) => {
      setNetworkQuoteOptions((p) => {
        const m = catalog.find((x) => x.id === mediaId);
        const prev = p[mediaId];
        return {
          ...p,
          [mediaId]: {
            units:
              patch.units ??
              prev?.units ??
              Math.max(m?.networkMinUnits ?? 1, 1),
            regionScope: patch.regionScope ?? prev?.regionScope ?? "all",
          },
        };
      });
    },
    [catalog],
  );

  const handlePackagePeriodToggle = useCallback(
    (mediaId: string, checked: boolean) => {
      setUsePackagePeriodByMediaId((p) => ({ ...p, [mediaId]: checked }));
    },
    [],
  );

  const quotePackagePeriodTemplate = t("quote.usePackagePeriodOnly", {
    period: "{period}",
  });

  const renderQuoteMediaQuantityFields = useCallback(
    (media: MediaItem, checked: boolean) => (
      <QuoteMediaQuantityFields
        media={media}
        isKo={isKo}
        checked={checked}
        mediaQuantities={mediaQuantities}
        mediaPriceOptionIndex={mediaPriceOptionIndex}
        networkQuoteOptions={networkQuoteOptions}
        usePackagePeriodByMediaId={usePackagePeriodByMediaId}
        onMediaQuantityChange={handleMediaQuantityChange}
        onPriceOptionChange={handleMediaPriceOptionChange}
        onNetworkQuoteOptionsChange={handleNetworkQuoteOptionsChange}
        onPackagePeriodToggle={handlePackagePeriodToggle}
        packagePeriodMeta={packagePeriodToggleMeta(
          media,
          mediaPriceOptionIndex[media.id] ?? 0,
        )}
        networkRegionLabel={t("quote.networkRegion")}
        networkRegionAllLabel={t("quote.networkRegionAll")}
        packagePeriodOnlyLabel={quotePackagePeriodTemplate}
      />
    ),
    [
      isKo,
      mediaQuantities,
      mediaPriceOptionIndex,
      networkQuoteOptions,
      usePackagePeriodByMediaId,
      handleMediaQuantityChange,
      handleMediaPriceOptionChange,
      handleNetworkQuoteOptionsChange,
      handlePackagePeriodToggle,
      quotePackagePeriodTemplate,
      t,
    ],
  );

  const bounds = useMemo(() => computeCatalogBounds(catalog), [catalog]);
  const defaultAdvanced = useMemo(
    () => defaultAdvancedFilterState(bounds),
    [bounds],
  );

  const { filters } = useMediaCatalogFilters();
  const targetAgePick = filters.targetAge;

  const filterState = useMemo(
    () => ({
      ...defaultAdvanced,
      priceMin: bounds.minPrice,
      priceMax: bounds.maxPrice,
      targetAgePick,
    }),
    [defaultAdvanced, bounds.maxPrice, bounds.minPrice, targetAgePick],
  );

  const filteredCatalog = useMemo(() => {
    const chipFiltered = filterMediaByDiscoveryChips(catalog, {
      mainCategory: browseMainCategory,
      subCategory: browseSubCategory,
      target: browseTarget,
      regionMain: browseRegionMain,
      regionSub: browseRegionSub,
      priceMin: browsePriceMin,
      priceMax: browsePriceMax,
      features: browseFeatures,
    });
    const q = mediaTextFilter.trim().toLowerCase();
    return chipFiltered.filter((m) => {
      if (!passesMediaAdvancedFilters(m, filterState, bounds)) return false;
      if (q.length > 0 && !matchesMediaTextQuery(m, q)) return false;
      return true;
    });
  }, [
    catalog,
    browseMainCategory,
    browseSubCategory,
    browseTarget,
    browseRegionMain,
    browseRegionSub,
    browsePriceMin,
    browsePriceMax,
    browseFeatures,
    mediaTextFilter,
    filterState,
    bounds,
  ]);

  const sortedCatalog = useMemo(() => {
    const arr = [...filteredCatalog];
    switch (discoverySort) {
      case "price_asc":
        return arr.sort((a, b) =>
          compareMediaByMonthlyEquivalentPrice(a, b, "asc"),
        );
      case "price_desc":
        return arr.sort((a, b) =>
          compareMediaByMonthlyEquivalentPrice(a, b, "desc"),
        );
      case "newest":
        return arr.sort((a, b) => {
          const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
          const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
          return tb - ta;
        });
      case "popular":
        return arr.sort(
          (a, b) => (b.popularityScore ?? 0) - (a.popularityScore ?? 0),
        );
      default:
        return arr;
    }
  }, [filteredCatalog, discoverySort]);

  const mediaLayout =
    browseViewMode === "compact" ? "compact" : "grid";

  const pagedCatalog = useMemo(
    () => sortedCatalog.slice(0, mediaPage * mediaPageSize),
    [sortedCatalog, mediaPage, mediaPageSize],
  );

  const hasMoreMedia = mediaPage * mediaPageSize < sortedCatalog.length;

  const periodMonths = useMemo(
    () => quoteCampaignDaysFromPeriodKey(period) / 30,
    [period],
  );
  const periodLabel = t(`quote.periods.${period}` as `quote.periods.${PeriodKey}`);

  const quoteLineContexts = useMemo(
    () =>
      selectedMedia.map((m) => {
        const isNw = m.catalogSource === "network";
        const opt = networkQuoteOptions[m.id];
        return buildQuoteWizardLineContext(m, {
          isKo,
          campaignPeriod: period,
          campaignPeriodLabel: periodLabel,
          priceOptionIndex: mediaPriceOptionIndex[m.id] ?? 0,
          networkUnits: isNw ? opt?.units ?? m.networkMinUnits ?? 1 : undefined,
          mobileUnits: !isNw ? mediaQuantities[m.id] : undefined,
          usePackagePeriod: usePackagePeriodByMediaId[m.id] === true,
        });
      }),
    [
      selectedMedia,
      networkQuoteOptions,
      mediaPriceOptionIndex,
      mediaQuantities,
      usePackagePeriodByMediaId,
      isKo,
      period,
      periodLabel,
    ],
  );

  const pdfPeriodLabel = useMemo(() => {
    const globalDays = quoteCampaignDaysFromPeriodKey(period);
    const lineDays = quoteLineContexts.map((line) => line.campaignDays);
    const allSame =
      lineDays.length === 0 || lineDays.every((d) => d === globalDays);
    if (allSame) return periodLabel;
    return t("quote.periodMixedSummary", { period: periodLabel });
  }, [quoteLineContexts, period, periodLabel, t]);

  const unitPriceSumMan = useMemo(
    () => quoteLineContexts.reduce((sum, line) => sum + line.unitPriceMan, 0),
    [quoteLineContexts],
  );

  const hasProrationLine = useMemo(
    () =>
      quoteLineContexts.some(
        (line) => line.prorationLabel != null || line.usesMediaPartialRate,
      ),
    [quoteLineContexts],
  );

  const totalCost = useMemo(
    () => quoteLineContexts.reduce((sum, line) => sum + line.lineTotalMan, 0),
    [quoteLineContexts],
  );

  const estimateLineBreakdowns = useMemo(
    () =>
      selectedMedia.flatMap((m, idx) => {
        if (usePackagePeriodByMediaId[m.id]) return [];
        const line = quoteLineContexts[idx];
        if (!line?.prorationLabel) return [];
        const poIdx = mediaPriceOptionIndex[m.id] ?? 0;
        const priceOpt = m.priceOptions?.[poIdx];
        const name = (isKo ? m.name : m.nameEn || m.name) || m.name;
        const optionPart = priceOpt?.label?.trim()
          ? ` · ${priceOpt.label}`
          : "";
        return [
          {
            key: m.id,
            label: `${name}${optionPart} ${line.prorationLabel}`,
            usesMediaPartialRate: line.usesMediaPartialRate,
          },
        ];
      }),
    [selectedMedia, quoteLineContexts, mediaPriceOptionIndex, isKo],
  );

  const periodMismatchLines = useMemo(() => {
    return selectedMedia.flatMap((m, idx) => {
      const line = quoteLineContexts[idx];
      if (
        line?.bundleDays == null ||
        line.bundleDays === line.campaignDays
      ) {
        return [];
      }
      const poIdx = mediaPriceOptionIndex[m.id] ?? 0;
      const priceOpt = m.priceOptions?.[poIdx];
      const optionLabel =
        priceOpt?.label?.trim() ??
        ((isKo ? m.name : m.nameEn || m.name) || m.name);
      return [
        {
          mediaId: m.id,
          optionLabel,
          bundleDays: line.bundleDays,
          campaignDays: line.campaignDays,
          inferredPeriod: inferQuoteCampaignPeriodFromMedia(m, poIdx),
        },
      ];
    });
  }, [selectedMedia, quoteLineContexts, mediaPriceOptionIndex, isKo]);

  const periodSnapTarget = useMemo((): QuoteCampaignPeriodKey | null => {
    if (periodMismatchLines.length === 0) return null;
    const periods = new Set(
      periodMismatchLines.map((row) => row.inferredPeriod),
    );
    if (periods.size !== 1) return null;
    return periodMismatchLines[0]!.inferredPeriod;
  }, [periodMismatchLines]);

  const budgetMinN = useMemo(() => {
    const n = parseInt(form.budgetMin, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [form.budgetMin]);
  const budgetMaxN = useMemo(() => {
    const n = parseInt(form.budgetMax, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }, [form.budgetMax]);

  const pdfPreviewRef = useRef<HTMLDivElement>(null);
  const quoteFloatingStashRef = useRef<MediaItem[]>([]);

  const pdfPreviewRows = useMemo(() => {
    return selectedMedia.map((m, idx) => {
      const isNw = m.catalogSource === "network";
      const opt = networkQuoteOptions[m.id];
      const units = isNw ? opt?.units ?? m.networkMinUnits ?? 1 : 0;
      const poIdx = mediaPriceOptionIndex[m.id] ?? 0;
      const priceOpt = !isNw ? m.priceOptions?.[poIdx] : undefined;
      const line = quoteLineContexts[idx];
      const baseName = (isKo ? m.name : (m.nameEn || m.name)) || m.name;
      let name = baseName;
      if (isNw && units) {
        name = `${baseName} (${units}${isKo ? "개소" : " sites"})`;
      } else if (priceOpt?.label) {
        name = `${baseName} (${priceOpt.label})`;
      }
      const location =
        isNw && opt
          ? opt.regionScope === "all"
            ? isKo
              ? "지역: 전체"
              : "Regions: all"
            : opt.regionScope
          : (isKo ? m.location : (m.locationEn || m.location)) || m.location;
      const detail = mediaToDocumentDetail(m, {
        isKo,
        lineTotalWon: Math.round(line.lineTotalMan * 10_000),
        priceOptionIndex: poIdx,
      });
      return {
        id: m.id,
        thumbUrl: detail.thumbUrl ?? getPrimaryMediaImageUrl(m),
        name,
        location,
        unitPriceWon: Math.round(line.unitPriceMan * 10_000),
        lineTotalWon: Math.round(line.lineTotalMan * 10_000),
        unitPeriodLabel: line.unitPeriodLabel,
        executionPeriodLabel: line.executionPeriodLabel,
        size: detail.size,
        dailyFootTraffic: detail.dailyTraffic,
        operatingHours: detail.operatingHours,
        categoryLabel: detail.categoryLabel,
        broadcastLabel: detail.broadcastLabel,
      };
    });
  }, [
    selectedMedia,
    networkQuoteOptions,
    mediaPriceOptionIndex,
    isKo,
    quoteLineContexts,
  ]);

  /** 사용자 견적 PDF 미리보기는 원 단위로 모든 금액 전달 (만원 round 누적 손실 방지). */
  const pdfSubtotalWon = useMemo(() => Math.round(totalCost * 10_000), [totalCost]);
  const pdfVatWon = useMemo(() => Math.round(pdfSubtotalWon * 0.1), [pdfSubtotalWon]);
  const pdfGrandTotalWon = useMemo(
    () => pdfSubtotalWon + pdfVatWon,
    [pdfSubtotalWon, pdfVatWon],
  );

  const quotePdfPreviewProps = useMemo(
    () => ({
      template,
      customerLogoSrc: logoDataUrl,
      company: form.company,
      contactName: form.name,
      contactPhone: form.phone,
      contactEmail: form.email,
      periodLabel: pdfPeriodLabel,
      periodMonths,
      rows: pdfPreviewRows,
      subtotalWon: pdfSubtotalWon,
      vatWon: pdfVatWon,
      grandTotalWon: pdfGrandTotalWon,
      issuedAt: quoteIssuedAt,
      validUntil: quoteValidUntil,
    }),
    [
      template,
      logoDataUrl,
      form.company,
      form.name,
      form.phone,
      form.email,
      periodLabel,
      pdfPeriodLabel,
      periodMonths,
      pdfPreviewRows,
      pdfSubtotalWon,
      pdfVatWon,
      pdfGrandTotalWon,
      quoteIssuedAt,
      quoteValidUntil,
    ],
  );

  const quotePremiumDateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(isKo ? "ko-KR" : "en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(quoteIssuedAt),
    [isKo, quoteIssuedAt],
  );

  const quotePremiumRegion = useMemo(() => {
    const parts = [
      ...new Set(
        selectedMedia
          .map((m) => (isKo ? m.region : m.region) || m.location)
          .filter(Boolean),
      ),
    ];
    return parts.slice(0, 4).join(", ") || undefined;
  }, [selectedMedia, isKo]);

  const quotePremiumProps = useMemo(
    () => ({
      customerName: form.company.trim() || form.name.trim(),
      contactName: form.name.trim(),
      brandName: form.company.trim() || form.name.trim(),
      version: "v1.0",
      dateLabel: quotePremiumDateLabel,
      durationLabel: pdfPeriodLabel,
      periodKey: period,
      periodMonths,
      region: quotePremiumRegion,
      goal: isKo ? "브랜드 인지도 · OOH 집행" : "Brand awareness · OOH",
      mediaItems: pdfPreviewRows.map((row) => ({
        id: row.id,
        name: row.name,
        location: row.location,
        thumbUrl: row.thumbUrl,
        lineTotalWon: row.lineTotalWon,
        dailyFootTraffic: row.dailyFootTraffic ?? null,
        size: row.size ?? null,
        categoryLabel: row.categoryLabel ?? null,
        operatingHours: row.operatingHours ?? null,
        broadcastLabel: row.broadcastLabel ?? null,
        mediaTypeLabel: row.categoryLabel ?? null,
        unitPriceWon: row.unitPriceWon,
        unitPeriodLabel: row.unitPeriodLabel ?? null,
        executionPeriodLabel: row.executionPeriodLabel ?? null,
      })),
      subtotalWon: pdfSubtotalWon,
      vatWon: pdfVatWon,
      grandTotalWon: pdfGrandTotalWon,
      contactPhone: form.phone,
      contactEmail: form.email,
      issuedAt: quoteIssuedAt,
      validUntil: quoteValidUntil,
    }),
    [
      form.name,
      form.company,
      form.phone,
      form.email,
      quotePremiumRegion,
      isKo,
      quotePremiumDateLabel,
      pdfPeriodLabel,
      period,
      periodMonths,
      pdfPreviewRows,
      pdfSubtotalWon,
      pdfVatWon,
      pdfGrandTotalWon,
      quoteIssuedAt,
      quoteValidUntil,
    ],
  );

  const toggleMedia = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearAllMediaSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const popularIds = useMemo(
    () =>
      new Set(
        catalog
          .filter((m) =>
            m.trustBadges?.some(
              (b) => b.id === "popular" || b.id === "hot_week",
            ),
          )
          .map((m) => m.id),
      ),
    [catalog],
  );

  const updateField = useCallback((field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const validate = useCallback(
    (f: FormState, mediaCount: number): FormErrors => {
      const e: FormErrors = {};
      if (!f.name.trim()) {
        e.name = isKo ? "이름을 입력해 주세요." : "Please enter your name.";
      }
      if (!f.phone.trim()) {
        e.phone = isKo
          ? "연락처를 입력해 주세요."
          : "Please enter your phone number.";
      } else if (!PHONE_RE.test(f.phone)) {
        e.phone = isKo
          ? "올바른 연락처 형식이 아닙니다."
          : "Please enter a valid phone number.";
      }
      if (mediaCount < 1) {
        e.media = t("quote.noMediaSelected");
      }
      return e;
    },
    [isKo, t],
  );

  const stepLabels = useMemo(
    () => [
      t("quote.stepMedia"),
      t("quote.stepPeriodBudget"),
      t("quote.stepTemplate"),
      t("quote.stepReview"),
    ],
    [t],
  );

  const StepHeaderIcon = (
    [Images, Calculator, LayoutTemplate, CheckCircle] as const
  )[step - 1];

  const canGoNext = useCallback(() => {
    if (step === 1) return selectedMedia.length > 0;
    return true;
  }, [step, selectedMedia.length]);

  const goNext = () => {
    if (!canGoNext()) {
      toast("warning", t("quote.noMediaSelected"));
      setTouched((prev) => ({ ...prev, media: true }));
      setErrors((prev) => ({ ...prev, media: t("quote.noMediaSelected") }));
      return;
    }
    setStep((s) => (s < 4 ? ((s + 1) as WizardStep) : s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("image/")) {
      toast("warning", isKo ? "이미지 파일만 올릴 수 있습니다." : "Images only.");
      return;
    }
    if (f.size > LOGO_MAX_BYTES) {
      toast("warning", t("quote.logoTooLarge"));
      return;
    }
    const r = new FileReader();
    r.onload = () => setLogoDataUrl(r.result as string);
    r.readAsDataURL(f);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Partial<Record<keyof FormState | "media", boolean>> = {
      name: true,
      phone: true,
      email: true,
      company: true,
      message: true,
      website: true,
      budgetMin: true,
      budgetMax: true,
      media: true,
    };
    setTouched(allTouched);

    const validationErrors = validate(form, selectedMedia.length);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      toast(
        "warning",
        isKo ? "필수 항목을 모두 입력해 주세요." : "Please fill in all required fields.",
      );
      return;
    }

    if (form.website.trim()) {
      setSubmitted(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: form.company,
          name: form.name,
          phone: form.phone,
          email: form.email,
          mediaIds: selectedMedia.map((m) => m.id),
          period,
          budgetMin: form.budgetMin,
          budgetMax: form.budgetMax,
          estimatedCost: totalCost,
          mediaSelections: submitMediaSelections,
          message: form.message,
          website: form.website,
          pdfTemplate: template,
          locale: isKo ? "ko" : "en",
          networkSelections: selectedMedia
            .filter((m) => m.catalogSource === "network")
            .map((m) => {
              const opt = networkQuoteOptions[m.id] ?? {
                units: Math.max(m.networkMinUnits ?? 1, 1),
                regionScope: "all",
              };
              return {
                catalogId: m.id,
                units: opt.units,
                regionScope: opt.regionScope,
                lineTotal: computeNetworkMonthlyFromMediaItem(m, opt.units),
              };
            }),
        }),
      });
      if (!res.ok) throw new Error("submit failed");
      const payload = (await res.json()) as { quoteId?: string };
      if (payload.quoteId) {
        toast(
          "success",
          isKo ? "견적이 접수되었습니다. 견적서 페이지로 이동합니다." : "Quote saved. Opening your quote page.",
        );
        router.push(`/quote/${payload.quoteId}`);
        return;
      }
      setSubmitted(true);
      toast(
        "success",
        isKo ? "견적 요청이 접수되었습니다." : "Your quote request has been submitted.",
      );
    } catch {
      toast(
        "error",
        isKo ? "일시적 오류가 발생했습니다. 다시 시도해 주세요." : "An error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const fieldError = (field: keyof FormErrors) =>
    touched[field] && errors[field] ? (
      <p className="mt-1 text-xs font-medium text-red-500">{errors[field]}</p>
    ) : null;

  const inputErrorClass = (field: keyof FormErrors) =>
    touched[field] && errors[field]
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "";

  const exportTemplate = template === "premium" ? "premium" : "basic";

  const exportMediaPriceOptionIndex = useMemo(
    () =>
      Object.fromEntries(
        selectedMedia.map((m) => [m.id, mediaPriceOptionIndex[m.id] ?? 0]),
      ),
    [selectedMedia, mediaPriceOptionIndex],
  );

  const submitMediaSelections = useMemo((): QuoteMediaSelectionSnapshot[] => {
    return selectedMedia.map((m, idx) => {
      const poIdx = mediaPriceOptionIndex[m.id] ?? 0;
      const line = quoteLineContexts[idx];
      const isNw = m.catalogSource === "network";
      const units = isNw
        ? (networkQuoteOptions[m.id]?.units ?? m.networkMinUnits ?? 1)
        : mediaQuantities[m.id];
      return buildQuoteMediaSelectionSnapshot({
        media: m,
        isKo,
        priceOptionIndex: poIdx,
        units,
        lineTotalWon: Math.round((line?.lineTotalMan ?? 0) * 10_000),
        ...(usePackagePeriodByMediaId[m.id]
          ? {
              usePackagePeriod: true as const,
              lineCampaignDays: line?.campaignDays,
            }
          : {}),
      });
    });
  }, [
    selectedMedia,
    mediaPriceOptionIndex,
    quoteLineContexts,
    usePackagePeriodByMediaId,
    networkQuoteOptions,
    mediaQuantities,
    isKo,
  ]);

  const exportQuoteDraft = useCallback(
    async (format: QuoteExportFormat) => {
      const res = await fetch("/api/quote/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          template: exportTemplate,
          locale: isKo ? "ko" : "en",
          mediaIds: selectedMedia.map((m) => m.id),
          periodKey: period,
          mediaPriceOptionIndex: exportMediaPriceOptionIndex,
          mediaSelections: submitMediaSelections,
          clientName: form.name.trim(),
          clientEmail: form.email.trim(),
          clientPhone: form.phone.trim() || null,
          clientCompany: form.company.trim() || null,
        }),
        cache: "no-store",
      });
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) {
          throw new Error("PRO_REQUIRED");
        }
        throw new Error(`${format.toUpperCase()} HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") ?? "";
      const m = cd.match(/filename\*=UTF-8''([^;]+)/i);
      const name = m
        ? decodeURIComponent(m[1]!)
        : `THINKAD_견적서_${new Date().toISOString().slice(0, 10)}.${format}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      return name;
    },
    [
      exportTemplate,
      exportMediaPriceOptionIndex,
      submitMediaSelections,
      form.company,
      form.email,
      form.name,
      form.phone,
      isKo,
      period,
      selectedMedia,
    ],
  );

  const runQuoteExport = async (format: QuoteExportFormat) => {
    if (selectedMedia.length === 0) {
      toast("warning", t("quote.noMediaSelected"));
      return;
    }
    setDownloading(format);
    try {
      const name = await exportQuoteDraft(format);
      toast(
        "success",
        format === "pdf"
          ? t("quote.pdfDownloaded") + (name ? ` · ${name}` : "")
          : (isKo ? "PPT 다운로드 완료" : "PPT downloaded") +
              (name ? ` · ${name}` : ""),
      );
    } catch (e) {
      console.error(`[quote ${format} download]`, e);
      const proRequired =
        e instanceof Error && e.message === "PRO_REQUIRED";
      toast(
        proRequired ? "warning" : "error",
        proRequired
          ? isKo
            ? "견적서 다운로드는 PRO 전용입니다."
            : "Quote export requires PRO."
          : format === "pdf"
            ? t("quote.pdfError")
            : isKo
              ? "PPT 생성에 실패했습니다."
              : "PPT export failed.",
      );
    } finally {
      setDownloading(null);
    }
  };

  const [capturing, setCapturing] = useState(false);
  const handleCapture = async () => {
    if (selectedMedia.length === 0) {
      toast("warning", t("quote.noMediaSelected"));
      return;
    }
    const el =
      template === "premium"
        ? (pdfPreviewRef.current?.closest("[data-quote-pdf-scale-wrap]") ??
            document.querySelector("[data-quote-pdf-scale-wrap]")
          )?.querySelector<HTMLElement>('[data-quote-premium-page="1"]') ?? null
        : pdfPreviewRef.current;
    if (!el) {
      toast("error", t("quote.pdfError"));
      return;
    }
    setCapturing(true);
    try {
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await runWithQuotePdfExport(el, async () => {
        await captureElementAsPng(
          el,
          isKo ? `싱커드_견적서_${ymd}.png` : `THINKAD_quote_${ymd}.png`,
        );
      });
      toast("success", t("quote.imageSaved"));
    } catch (e) {
      console.error("[quote png capture]", e);
      toast("error", t("quote.pdfError"));
    } finally {
      setCapturing(false);
    }
  };

  const handleEmailPdf = async () => {
    if (selectedMedia.length === 0) {
      toast("warning", t("quote.noMediaSelected"));
      return;
    }
    if (!form.email.trim() || !EMAIL_RE.test(form.email.trim())) {
      toast("warning", t("quote.emailRequiredForPdf"));
      return;
    }
    setEmailPdfLoading(true);
    try {
      const exportRes = await fetch("/api/quote/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "pdf",
          template: exportTemplate,
          locale: isKo ? "ko" : "en",
          mediaIds: selectedMedia.map((m) => m.id),
          periodKey: period,
          mediaPriceOptionIndex: exportMediaPriceOptionIndex,
          clientName: form.name.trim(),
          clientEmail: form.email.trim(),
          clientPhone: form.phone.trim() || null,
          clientCompany: form.company.trim() || null,
        }),
        cache: "no-store",
      });
      if (!exportRes.ok) {
        if (exportRes.status === 401 || exportRes.status === 403) {
          toast(
            "warning",
            isKo
              ? "견적서 PDF는 로그인 후 PRO에서 이용할 수 있습니다."
              : "Sign in with PRO to email quote PDFs.",
          );
        } else {
          toast("error", t("quote.pdfError"));
        }
        return;
      }
      const pdfBlob = await exportRes.blob();
      const pdfBase64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const data = String(reader.result ?? "");
          const b64 = data.includes(",") ? data.split(",")[1]! : data;
          resolve(b64);
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(pdfBlob);
      });
      const res = await fetch("/api/quote/email-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          pdfBase64,
          locale: isKo ? "ko" : "en",
          website: emailHoneypot,
        }),
      });
      const data = (await res.json()) as { code?: string; error?: string };
      if (!res.ok) {
        if (data.code === "EMAIL_DISABLED" || data.code === "SMTP_DISABLED") {
          toast("warning", t("quote.smtpDisabled"));
          return;
        }
        throw new Error(data.error ?? "fail");
      }
      toast("success", t("quote.pdfEmailed"));
    } catch (e) {
      console.error("[quote pdf email]", e);
      toast("error", t("quote.pdfEmailFail"));
    } finally {
      setEmailPdfLoading(false);
    }
  };

  if (selectedMedia.length > 0) quoteFloatingStashRef.current = selectedMedia;
  const quoteBarOpen = step === 1 && selectedMedia.length > 0;
  const displaySelectedForBar =
    selectedMedia.length > 0 ? selectedMedia : quoteFloatingStashRef.current;

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon min-h-[calc(100vh-72px)]">
      <CategoryExploreHero
        code="// 07 / Quote"
        showBeta
        headlineBefore={isKo ? "" : "Request a "}
        headlineGradient={isKo ? "견적 요청" : "Quote"}
        subtitle={t("quote.subtitle")}
      >
        <p className="mx-auto max-w-xl font-display text-xs font-medium uppercase tracking-[0.18em] dark:text-white text-gray-500">
          {`// `}{t("quote.wizardSubtitle")}
        </p>
      </CategoryExploreHero>

      <section className="border-t border-white/8 bg-transparent py-12 sm:py-16 lg:py-20">
        <div className="mx-auto max-w-[88rem] px-4 sm:px-6 lg:px-8">
          <div className="mb-12 sm:mb-14">
            <p className="mb-5 text-center font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
              [ {t("quote.wizardTitle")} ]
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {([1, 2, 3, 4] as const).map((n) => (
                <div key={n} className="flex items-center gap-1.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      if (n <= step) {
                        setStep(n);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                        return;
                      }
                      if (selectedMedia.length === 0) {
                        toast("warning", t("quote.noMediaSelected"));
                        return;
                      }
                      setStep(n);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className={cn(
                      "tkad-quote-wizard-step-btn flex h-12 w-12 items-center justify-center rounded-2xl border-2 text-base font-black backdrop-blur transition-colors sm:h-14 sm:w-14 sm:text-lg",
                      step === n && "tkad-quote-wizard-step-btn-active",
                      step > n && "tkad-quote-wizard-step-btn-done",
                    )}
                  >
                    {step > n ? "✓" : n}
                  </button>
                  <span
                    className={cn(
                      "tkad-quote-wizard-step-label hidden max-w-[100px] font-display text-xs font-medium uppercase tracking-[0.18em] sm:block",
                      step === n && "tkad-quote-wizard-step-label-active",
                    )}
                  >
                    {stepLabels[n - 1]}
                  </span>
                  {n < 4 ? (
                    <ChevronRight className="hidden h-4 w-4 text-muted-foreground sm:block" />
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
              {`// `}{t("quote.stepOf", { current: step, total: 4 })}
            </p>
          </div>

          <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-10 xl:grid-cols-[1fr_26rem]">
            <div className="order-2 min-w-0 lg:order-1">
              <div className="tkad-glass-surface relative min-h-[380px] overflow-x-clip overflow-y-visible rounded-[32px] border border-gray-200 dark:border-white/12 sm:min-h-[420px]">
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-0" />
                <div className="relative border-b dark:border-white/10 border-gray-200 p-6 sm:p-8">
                  <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
                    [ STEP {step} / 4 ]
                  </p>
                  <h3 className="mt-3 flex items-center gap-3 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                    <StepHeaderIcon className="h-6 w-6 text-primary sm:h-7 sm:w-7" aria-hidden />
                    {stepLabels[step - 1]}
                  </h3>
                </div>
                <div className="relative p-6 sm:p-8 lg:p-10">
                  {step === 1 && (
                    <>
                      {touched.media && errors.media ? (
                        <p className="mb-4 text-sm font-medium text-red-500">
                          {errors.media}
                        </p>
                      ) : null}
                      <p className="mb-4 text-[11px] tracking-tight text-muted-foreground">
                        {`// `}{t("quote.selectMediaDesc")}
                      </p>
                      <div className="flex flex-col gap-6">
                        <MediaManualBrowseFilters
                          isKo={isKo}
                          showSectionHeader
                          sectionEyebrow="Manual Browse"
                          sectionTitle={tPlanner("recommendBrowseTitle")}
                          sectionDesc={tPlanner("recommendBrowseDesc")}
                          query={mediaTextFilter}
                          onQueryChange={(q) => {
                            setMediaTextFilter(q);
                            setMediaPage(1);
                          }}
                          mainCategory={browseMainCategory}
                          onMainCategoryChange={(v) => {
                            setBrowseMainCategory(v);
                            setMediaPage(1);
                          }}
                          subCategory={browseSubCategory}
                          onSubCategoryChange={(v) => {
                            setBrowseSubCategory(v);
                            setMediaPage(1);
                          }}
                          target={browseTarget}
                          onTargetChange={(v) => {
                            setBrowseTarget(v);
                            setMediaPage(1);
                          }}
                          regionMain={browseRegionMain}
                          onRegionMainChange={(v) => {
                            setBrowseRegionMain(v);
                            setMediaPage(1);
                          }}
                          regionSub={browseRegionSub}
                          onRegionSubChange={(v) => {
                            setBrowseRegionSub(v);
                            setMediaPage(1);
                          }}
                          priceMin={browsePriceMin}
                          onPriceMinChange={(v) => {
                            setBrowsePriceMin(v);
                            setMediaPage(1);
                          }}
                          priceMax={browsePriceMax}
                          onPriceMaxChange={(v) => {
                            setBrowsePriceMax(v);
                            setMediaPage(1);
                          }}
                          features={browseFeatures}
                          onFeaturesChange={(v) => {
                            setBrowseFeatures(v);
                            setMediaPage(1);
                          }}
                          sort={discoverySort}
                          onSortChange={(v) => {
                            setDiscoverySort(v);
                            setMediaPage(1);
                          }}
                          viewMode={browseViewMode}
                          onViewModeChange={(mode) => {
                            setBrowseViewMode(mode);
                            setMediaPage(1);
                          }}
                          resultCount={sortedCatalog.length}
                          totalCount={catalog.length}
                          selectedCount={selectedIds.size}
                          toolbarEnd={
                            <>
                              <PerPageSelect
                                value={mediaPageSize}
                                onChange={(next) => {
                                  setMediaPageSize(next);
                                  setMediaPage(1);
                                }}
                              />
                              <div className="inline-flex overflow-hidden rounded-xl border border-gray-200 dark:border-white/10">
                                <button
                                  type="button"
                                  className="px-2.5 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:bg-gray-50 disabled:opacity-40 dark:text-white/80 dark:hover:bg-white/10"
                                  onClick={() => {
                                    setSelectedIds(
                                      new Set(pagedCatalog.map((m) => m.id)),
                                    );
                                  }}
                                  disabled={pagedCatalog.length === 0}
                                >
                                  {isKo ? "페이지 전체선택" : "Select page"}
                                </button>
                                <button
                                  type="button"
                                  className="border-l border-gray-200 px-2.5 py-1.5 text-[11px] font-semibold text-gray-500 transition hover:bg-gray-50 disabled:opacity-40 dark:border-white/10 dark:text-white/60 dark:hover:bg-white/10"
                                  onClick={() => setSelectedIds(new Set())}
                                  disabled={selectedIds.size === 0}
                                >
                                  {isKo ? "선택 해제" : "Clear"}
                                </button>
                              </div>
                            </>
                          }
                        />

                        <p className="flex items-center gap-2 text-xs text-gray-500 dark:text-white/50">
                          <ShieldCheck
                            className="h-3.5 w-3.5 shrink-0 text-[color:var(--qp-accent)]"
                            aria-hidden
                          />
                          {tMedia("browseCatalogVerifiedBadge")}
                          <span className="text-gray-400 dark:text-white/35">·</span>
                          <span className="text-gray-400 dark:text-white/45">
                            {tMedia("browseCatalogVerifiedListHint")}
                          </span>
                        </p>

                        <div className="min-w-0">
                      {filteredCatalog.length === 0 ? (
                        <div className="flex h-64 items-center justify-center border-2 border-border bg-muted font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                          {isKo ? "조건에 맞는 매체가 없습니다." : "No media matches your filters."}
                        </div>
                      ) : mediaLayout === "grid" ? (
                      <div
                        className={cn(
                          "grid gap-3",
                          browseViewMode === "feed"
                            ? "grid-cols-1"
                            : "grid-cols-2 md:grid-cols-3 xl:grid-cols-4",
                        )}
                      >
                        {pagedCatalog.map((media) => {
                          const checked = selectedIds.has(media.id);
                          const nwOpt = networkQuoteOptions[media.id];
                          const isNw = media.catalogSource === "network";
                          const poIdx = mediaPriceOptionIndex[media.id] ?? 0;
                          const displayPrice = quoteCatalogDisplayPriceMan(media, {
                            priceOptionIndex: poIdx,
                            mobileUnits: mediaQuantities[media.id],
                            networkUnits: nwOpt?.units,
                          });
                          return (
                            <div key={media.id} className="space-y-2">
                              <QuoteMediaSelectCard
                                media={media}
                                isKo={isKo}
                                selected={checked}
                                priceMan={displayPrice}
                                pricePeriod={resolveQuoteMediaPricePeriod(
                                  media,
                                  poIdx,
                                  isNw,
                                )}
                                onToggle={() => toggleMedia(media.id)}
                              />
                              {renderQuoteMediaQuantityFields(media, checked)}
                            </div>
                          );
                        })}
                      </div>
                      ) : (
                        <div className={MEDIA_CATALOG_COMPACT_GRID_CLASS}>
                          {pagedCatalog.map((media) => {
                            const checked = selectedIds.has(media.id);
                            const typeLabel = typeLabels[media.type];
                            const quoteThumb =
                              dedupeImageUrls(media.sampleImages ?? [])[0]?.trim() ||
                              null;
                            const nwOpt = networkQuoteOptions[media.id];
                            const isNw = media.catalogSource === "network";
                            const poIdxC = mediaPriceOptionIndex[media.id] ?? 0;
                            const displayPrice = quoteCatalogDisplayPriceMan(media, {
                              priceOptionIndex: poIdxC,
                              mobileUnits: mediaQuantities[media.id],
                              networkUnits: nwOpt?.units,
                            });
                            const pricePeriod = resolveQuoteMediaPricePeriod(
                              media,
                              poIdxC,
                              isNw,
                            );
                            const priceLabel =
                              displayPrice > 0
                                ? formatMediaPriceWithPeriodSuffix(
                                    displayPrice * 10_000,
                                    pricePeriod,
                                    isKo ? "ko-KR" : "en-US",
                                  )
                                : null;
                            return (
                              <div key={media.id} className="space-y-2">
                                <label className="block cursor-pointer">
                                  <input
                                    type="checkbox"
                                    className="peer sr-only"
                                    checked={checked}
                                    onChange={() => toggleMedia(media.id)}
                                  />
                                  <div
                                    className={cn(
                                      MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS,
                                      "peer-checked:border-accent",
                                    )}
                                  >
                                    <MediaCatalogThumbnail
                                      media={media}
                                      primaryImageUrl={quoteThumb}
                                      placeholderLabel={tMedia("imagePreparing")}
                                      className="relative z-10 h-[4.5rem] w-[4.5rem] shrink-0 overflow-hidden rounded-md sm:h-24 sm:w-28 sm:rounded-lg"
                                      bottomGradientClassName={null}
                                      placeholderSize="xs"
                                    >
                                      <span
                                        className={cn(
                                          "absolute right-1 top-1 z-20 flex size-7 items-center justify-center border-2 text-[10px] font-bold",
                                          checked
                                            ? "border-accent bg-accent text-white"
                                            : "border-border bg-card text-foreground",
                                        )}
                                        aria-hidden
                                      >
                                        {checked ? "✓" : ""}
                                      </span>
                                    </MediaCatalogThumbnail>
                                    <div className="relative z-0 flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden sm:gap-1.5">
                                      <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
                                        <span className="max-w-full shrink border-2 border-border bg-card px-1.5 py-0 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground sm:text-[10px]">
                                          {isKo
                                            ? (typeLabel?.ko ?? media.type)
                                            : (typeLabel?.en ?? media.type)}
                                        </span>
                                        {popularIds.has(media.id) ? (
                                          <span className="inline-flex shrink-0 items-center gap-0.5 border-2 border-accent bg-accent px-1.5 py-0 font-display text-xs font-medium uppercase tracking-[0.18em] text-white">
                                            <Flame className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                            {isKo ? "인기" : "Hot"}
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="line-clamp-2 min-w-0 break-words text-[13px] font-bold leading-snug tracking-tight text-foreground sm:line-clamp-1 sm:text-sm">
                                        {isKo ? media.name : (media.nameEn || media.name)}
                                      </p>
                                      <p className="flex min-w-0 items-start gap-0.5 font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground sm:items-center sm:text-[11px]">
                                        <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0 sm:mt-0 sm:h-3 sm:w-3" />
                                        <span className="min-w-0 line-clamp-2 sm:line-clamp-1">
                                          {formatMediaLocationShort(media, isKo)}
                                        </span>
                                      </p>
                                      <p className="min-w-0 break-words font-display text-[13px] font-bold tabular-nums leading-tight text-accent sm:text-sm sm:leading-none">
                                        {priceLabel}
                                      </p>
                                      <MediaPriceExclNote isKo={isKo} className="mt-0.5" />
                                    </div>
                                  </div>
                                </label>
                                {renderQuoteMediaQuantityFields(media, checked)}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {hasMoreMedia ? (
                        <div className="mt-4 border-t border-gray-100 pt-4 dark:border-white/10">
                          <button
                            type="button"
                            onClick={() => setMediaPage((p) => p + 1)}
                            className="w-full rounded-2xl border border-gray-200 py-3 text-sm font-semibold text-gray-700 transition hover:bg-gray-50 dark:border-white/10 dark:text-white/80 dark:hover:bg-white/5"
                          >
                            {tMedia("loadMoreBrowse")}
                          </button>
                        </div>
                      ) : null}
                        </div>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {`// `}{t("quote.periodBudgetPdfHint")}
                      </p>
                      <div>
                        <label className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                          [ {t("quote.period")} ]
                        </label>
                        <select
                          value={period}
                          onChange={(e) => {
                            periodDirtyRef.current = true;
                            setPeriod(e.target.value as PeriodKey);
                          }}
                          className="h-12 w-full rounded-[18px] border-2 border-border bg-card px-4 text-base text-foreground focus:border-accent focus:outline-none sm:h-14"
                          aria-label={t("quote.period")}
                        >
                          {QUOTE_WIZARD_PERIOD_KEYS.map((key) => (
                            <option key={key} value={key}>
                              {t(`quote.periods.${key}` as `quote.periods.${PeriodKey}`)}
                            </option>
                          ))}
                        </select>
                      </div>
                      {/* 예산 입력 제거 — 매체를 이미 선택했으므로 불필요 */}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
                      <div>
                        <p className="mb-4 text-[11px] tracking-tight text-muted-foreground">
                          {`// `}{t("quote.templateDesc")}
                        </p>
                        <div className="grid gap-0 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setTemplate("default")}
                            className={cn(
                              "-mt-[2px] -ml-[2px] border-2 p-5 text-left transition-colors",
                              template === "default"
                                ? "border-accent bg-accent text-white"
                                : "border-border bg-card text-foreground hover:bg-muted",
                            )}
                          >
                            <LayoutTemplate
                              className={cn(
                                "mb-3 h-8 w-8",
                                template === "default" ? "text-white" : "text-accent",
                              )}
                            />
                            <p className="font-display text-xs font-medium uppercase tracking-[0.22em]">
                              [ DEFAULT ]
                            </p>
                            <p className="mt-1 font-bold tracking-tight">
                              {t("quote.templateDefault")}
                            </p>
                            <p
                              className={cn(
                                "mt-2  text-[11px] tracking-tight",
                                template === "default" ? "text-white/85" : "text-muted-foreground",
                              )}
                            >
                              {t("quote.templateDefaultDesc")}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setTemplate("premium")}
                            className={cn(
                              "-mt-[2px] -ml-[2px] border-2 p-5 text-left transition-colors",
                              template === "premium"
                                ? "border-accent bg-accent text-white"
                                : "border-border bg-card text-foreground hover:bg-muted",
                            )}
                          >
                            <Sparkles
                              className={cn(
                                "mb-3 h-8 w-8",
                                template === "premium" ? "text-white" : "text-accent",
                              )}
                            />
                            <p className="font-display text-xs font-medium uppercase tracking-[0.22em]">
                              [ PREMIUM ]
                            </p>
                            <p className="mt-1 font-bold tracking-tight">
                              {t("quote.templatePremium")}
                            </p>
                            <p
                              className={cn(
                                "mt-2  text-[11px] tracking-tight",
                                template === "premium" ? "text-white/85" : "text-muted-foreground",
                              )}
                            >
                              {t("quote.templatePremiumDesc")}
                            </p>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.22em] text-accent">
                          [ {t("quote.logoLabel")} ]
                        </label>
                        <p className="mb-3 text-[11px] tracking-tight text-muted-foreground">
                          {`// `}{t("quote.logoHint")}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 border-2 border-border bg-card px-4 py-2 font-display text-xs font-medium uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background">
                            <ImagePlus className="h-4 w-4" />
                            {isKo ? "파일 선택" : "Choose file"}
                            <input
                              type="file"
                              accept="image/png,image/jpeg"
                              className="hidden"
                              onChange={onLogoChange}
                            />
                          </label>
                          {logoDataUrl ? (
                            <BtnBlock
                              variant="secondary"
                              size="sm"
                              onClick={() => setLogoDataUrl(null)}
                            >
                              <Trash2 className="h-4 w-4" />
                              {t("quote.logoRemove")}
                            </BtnBlock>
                          ) : null}
                        </div>
                        {logoDataUrl ? (
                          <div className="mt-4 inline-block border-2 border-border bg-muted p-3">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={logoDataUrl}
                              alt={t("quote.logoPreviewAlt")}
                              className="max-h-24 max-w-[200px] object-contain"
                            />
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {step === 4 && !submitted && (
                    <div className="min-w-0 space-y-8 overflow-x-clip">
                      {selectedMedia.length > 0 ? (
                        <section className="space-y-4">
                          <div className="space-y-2">
                            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                              {isKo ? "[ PDF 미리보기 ]" : "[ PDF PREVIEW ]"}
                            </p>
                            <h3 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                              {t("quote.pdfPreviewTitle")}
                            </h3>
                            <p className="text-[11px] tracking-tight text-muted-foreground sm:text-xs">
                              {`// `}
                              {template === "premium"
                                ? isKo
                                  ? "다운로드·이메일 PDF/PPT는 서버에서 생성됩니다. (제안서 표지 + 공식 견적서)"
                                  : "PDF/PPT downloads use server export (proposal cover + official quote)."
                                : isKo
                                  ? "다운로드·이메일 PDF/PPT는 신규 견적서 디자인으로 서버에서 생성됩니다."
                                  : "PDF/PPT use the new server-rendered quote design."}
                            </p>
                          </div>
                          <div className="min-w-0 overflow-x-auto">
                            <DocumentPreviewFrame>
                              <div
                                data-quote-pdf-scale-wrap
                                className="w-full min-w-0"
                              >
                                {template === "premium" ? (
                                  <QuotePremium {...quotePremiumProps} />
                                ) : (
                                  <QuotePdfPreview
                                    ref={pdfPreviewRef}
                                    {...quotePdfPreviewProps}
                                  />
                                )}
                              </div>
                            </DocumentPreviewFrame>
                          </div>
                        </section>
                      ) : null}

                      <div className="tkad-glass-surface relative overflow-hidden rounded-[32px] border border-gray-200 bg-gray-50 dark:border-white/12 dark:bg-white/6 backdrop-blur-md">
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-0"
                        />
                        <div className="relative border-b dark:border-white/10 border-gray-200 px-6 py-5 sm:px-8 sm:py-6">
                          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary sm:text-xs">
                            [ {t("quote.reviewTitle")} ]
                          </p>
                        </div>
                        <ul className="relative divide-y divide-white/10 px-6 py-2 text-sm sm:px-8">
                          <li className="flex flex-wrap items-baseline justify-between gap-2 py-3.5">
                            <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {t("quote.reviewMediaCount")}
                            </span>
                            <span className="font-display text-base font-bold tabular-nums text-foreground">
                              {selectedMedia.length}
                              {isKo ? "건" : ""}
                            </span>
                          </li>
                          <li className="flex flex-wrap items-baseline justify-between gap-2 py-3.5">
                            <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {t("quote.period")}
                            </span>
                            <span className="font-bold text-foreground">{pdfPeriodLabel}</span>
                          </li>
                          <li className="flex flex-wrap items-baseline justify-between gap-2 py-3.5">
                            <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {t("quote.budgetRange")}
                            </span>
                            <span className="font-display text-sm font-bold tabular-nums text-foreground">
                              {budgetMinN != null || budgetMaxN != null ? (
                                <>
                                  {budgetMinN != null
                                    ? `₩${budgetMinN.toLocaleString()}`
                                    : "—"}
                                  {" ~ "}
                                  {budgetMaxN != null
                                    ? `₩${budgetMaxN.toLocaleString()}`
                                    : "—"}
                                  {isKo ? "만원" : " (10K)"}
                                </>
                              ) : (
                                t("quote.reviewBudgetUnset")
                              )}
                            </span>
                          </li>
                          <li className="flex flex-wrap items-baseline justify-between gap-2 py-3.5">
                            <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {t("quote.reviewTemplate")}
                            </span>
                            <span className="font-bold text-foreground">
                              {template === "premium"
                                ? t("quote.templatePremium")
                                : t("quote.templateDefault")}
                            </span>
                          </li>
                          <li className="flex flex-wrap items-baseline justify-between gap-2 py-3.5">
                            <span className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                              {t("quote.reviewLogo")}
                            </span>
                            <span className="font-bold text-foreground">
                              {logoDataUrl
                                ? t("quote.reviewLogoYes")
                                : t("quote.reviewLogoNo")}
                            </span>
                          </li>
                        </ul>
                      </div>

                      <div className="tkad-glass-surface relative overflow-hidden rounded-[32px] border border-gray-200 bg-gray-50 dark:border-white/12 dark:bg-white/6 backdrop-blur-md">
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-0"
                        />
                        <div className="absolute -left-[9999px]" aria-hidden>
                          <input
                            value={emailHoneypot}
                            onChange={(e) => setEmailHoneypot(e.target.value)}
                            tabIndex={-1}
                            autoComplete="off"
                          />
                        </div>
                        <div className="relative flex flex-col gap-5 border-b dark:border-white/10 border-gray-200 p-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-8">
                          <div className="min-w-0">
                            <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary sm:text-xs">
                              [ PDF DOCUMENT ]
                            </p>
                            <h3 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                              {t("quote.pdfDocumentTitle")}
                            </h3>
                            <p className="mt-2 text-[11px] tracking-tight text-muted-foreground sm:text-xs">
                              {`// `}
                              {isKo
                                ? "견적서 PDF·PPT 다운로드·이메일 전송은 PRO 전용입니다. (14일 무료 체험)"
                                : "Quote PDF/PPT download and email require PRO. (14-day trial)"}
                            </p>
                          </div>
                          <div className="flex w-full min-w-0 flex-col gap-2.5 sm:w-auto sm:min-w-[min(100%,22rem)] md:min-w-[28rem]">
                            <div className="flex w-full min-w-0 flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                              <PlannerPdfDownloadGate
                                isKo={isKo}
                                onAllowedDownload={() => void runQuoteExport("pdf")}
                              >
                                {({ onDownloadClick, pdfAllowed, checking }) => (
                                  <BtnBlock
                                    variant="secondary"
                                    size="md"
                                    onClick={onDownloadClick}
                                    disabled={
                                      downloading !== null ||
                                      selectedMedia.length === 0 ||
                                      checking
                                    }
                                    className="w-full min-w-0 rounded-[18px] sm:w-auto"
                                  >
                                    {downloading === "pdf" ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : !pdfAllowed ? (
                                      <Lock className="h-4 w-4" />
                                    ) : (
                                      <FileDown className="h-4 w-4" />
                                    )}
                                    {downloading === "pdf"
                                      ? t("quote.generatingPdf")
                                      : !pdfAllowed
                                        ? isKo
                                          ? "🔒 견적서 PDF (PRO)"
                                          : "🔒 Quote PDF (PRO)"
                                        : isKo
                                          ? "견적서 PDF 다운로드"
                                          : "Download quote PDF"}
                                  </BtnBlock>
                                )}
                              </PlannerPdfDownloadGate>
                              <PlannerPdfDownloadGate
                                isKo={isKo}
                                onAllowedDownload={() => void runQuoteExport("pptx")}
                              >
                                {({ onDownloadClick, pdfAllowed, checking }) => (
                                  <BtnBlock
                                    variant="secondary"
                                    size="md"
                                    onClick={onDownloadClick}
                                    disabled={
                                      downloading !== null ||
                                      selectedMedia.length === 0 ||
                                      checking
                                    }
                                    className="w-full min-w-0 rounded-[18px] sm:w-auto"
                                  >
                                    {downloading === "pptx" ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : !pdfAllowed ? (
                                      <Lock className="h-4 w-4" />
                                    ) : (
                                      <FileDown className="h-4 w-4" />
                                    )}
                                    {downloading === "pptx"
                                      ? isKo
                                        ? "PPT 생성 중…"
                                        : "Generating PPT…"
                                      : !pdfAllowed
                                        ? isKo
                                          ? "🔒 견적서 PPT (PRO)"
                                          : "🔒 Quote PPT (PRO)"
                                        : isKo
                                          ? "견적서 PPT 다운로드"
                                          : "Download quote PPT"}
                                  </BtnBlock>
                                )}
                              </PlannerPdfDownloadGate>
                            </div>
                            <BtnBlock
                              variant="secondary"
                              size="md"
                              onClick={handleCapture}
                              disabled={
                                capturing || selectedMedia.length === 0
                              }
                              className="w-full min-w-0 rounded-[18px] sm:w-auto"
                            >
                              {capturing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Camera className="h-4 w-4" />
                              )}
                              {t("quote.capturePng")}
                            </BtnBlock>
                            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                              <label className="sr-only" htmlFor="quote-pdf-email">
                                {t("quote.email")}
                              </label>
                              <input
                                id="quote-pdf-email"
                                type="email"
                                placeholder={t("quote.emailPlaceholder")}
                                value={form.email}
                                onChange={(e) =>
                                  updateField("email", e.target.value)
                                }
                                className="h-12 w-full min-w-0 rounded-[18px] border-2 border-border bg-card/80 px-4 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:min-w-[14rem]"
                              />
                              <PlannerPdfDownloadGate
                                isKo={isKo}
                                onAllowedDownload={() => void handleEmailPdf()}
                              >
                                {({ onDownloadClick, pdfAllowed, checking }) => (
                                  <BtnBlock
                                    variant="accent"
                                    size="md"
                                    onClick={onDownloadClick}
                                    disabled={
                                      emailPdfLoading ||
                                      selectedMedia.length === 0 ||
                                      checking
                                    }
                                    className="w-full shrink-0 rounded-[18px] sm:w-auto"
                                  >
                                    {emailPdfLoading ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : !pdfAllowed ? (
                                      <Lock className="h-4 w-4" />
                                    ) : (
                                      <Mail className="h-4 w-4" />
                                    )}
                                    {emailPdfLoading
                                      ? t("quote.sendingPdf")
                                      : !pdfAllowed
                                        ? isKo
                                          ? "🔒 PDF 이메일 (PRO)"
                                          : "🔒 Email PDF (PRO)"
                                        : t("quote.sendPdfEmail")}
                                  </BtnBlock>
                                )}
                              </PlannerPdfDownloadGate>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="tkad-glass-surface relative overflow-hidden rounded-[32px] border border-gray-200 bg-gray-50 dark:border-white/12 dark:bg-white/6 backdrop-blur-md">
                        <div
                          aria-hidden
                          className="pointer-events-none absolute inset-0 opacity-0"
                        />
                        <div className="relative border-b dark:border-white/10 border-gray-200 px-6 py-5 sm:px-8 sm:py-6">
                          <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary sm:text-xs">
                            [ GET QUOTE ]
                          </p>
                          <h3 className="mt-3 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                            {t("quote.getQuote")}
                          </h3>
                        </div>
                        <form
                          id="quote-wizard-form"
                          className="relative space-y-5 px-6 py-6 sm:space-y-6 sm:px-8 sm:py-8"
                          onSubmit={handleSubmit}
                          noValidate
                        >
                          <div
                            className="absolute -left-[9999px]"
                            aria-hidden="true"
                            tabIndex={-1}
                          >
                            <label htmlFor="quote-website">Website</label>
                            <input
                              type="text"
                              id="quote-website"
                              name="website"
                              value={form.website}
                              onChange={(e) =>
                                updateField("website", e.target.value)
                              }
                              tabIndex={-1}
                              autoComplete="off"
                            />
                          </div>

                          <div className="grid gap-5 sm:grid-cols-2">
                            <div>
                              <label className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                                [ {t("quote.company")} ]
                              </label>
                              <input
                                placeholder={t("quote.companyPlaceholder")}
                                value={form.company}
                                onChange={(e) =>
                                  updateField("company", e.target.value)
                                }
                                className="h-12 w-full rounded-[18px] border-2 border-border bg-card/80 px-4 text-base text-foreground backdrop-blur-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:h-14"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                                [ {t("quote.name")} ]{" "}
                                <span className="text-primary">*</span>
                              </label>
                              <input
                                placeholder={t("quote.namePlaceholder")}
                                value={form.name}
                                onChange={(e) =>
                                  updateField("name", e.target.value)
                                }
                                className={cn(
                                  "h-12 w-full rounded-[18px] border-2 border-border bg-card/80 px-4  text-base text-foreground backdrop-blur-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:h-14",
                                  inputErrorClass("name"),
                                )}
                              />
                              {fieldError("name")}
                            </div>
                            <div>
                              <label className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                                [ {t("quote.phone")} ]{" "}
                                <span className="text-primary">*</span>
                              </label>
                              <input
                                placeholder={t("quote.phonePlaceholder")}
                                value={form.phone}
                                onChange={(e) =>
                                  updateField("phone", e.target.value)
                                }
                                className={cn(
                                  "h-12 w-full rounded-[18px] border-2 border-border bg-card/80 px-4  text-base text-foreground backdrop-blur-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:h-14",
                                  inputErrorClass("phone"),
                                )}
                              />
                              {fieldError("phone")}
                            </div>
                            <div>
                              <label className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                                [ {t("quote.email")} ]
                              </label>
                              <input
                                type="email"
                                placeholder={t("quote.emailPlaceholder")}
                                value={form.email}
                                onChange={(e) =>
                                  updateField("email", e.target.value)
                                }
                                className="h-12 w-full rounded-[18px] border-2 border-border bg-card/80 px-4 text-base text-foreground backdrop-blur-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none sm:h-14"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block font-display text-xs font-medium uppercase tracking-[0.22em] text-primary">
                              [ {t("quote.message")} ]
                            </label>
                            <textarea
                              rows={4}
                              placeholder={t("quote.messagePlaceholder")}
                              value={form.message}
                              onChange={(e) =>
                                updateField("message", e.target.value)
                              }
                              className="w-full rounded-[18px] border-2 border-border bg-card/80 px-4 py-3 text-sm text-foreground backdrop-blur-sm placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                            />
                          </div>

                          <BtnBlock
                            type="submit"
                            variant="accent"
                            size="lg"
                            disabled={loading}
                            className="w-full rounded-[20px]"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                {t("quote.submitting")}
                              </>
                            ) : (
                              <>
                                <Send className="h-4 w-4" />
                                {t("quote.submit")}
                              </>
                            )}
                          </BtnBlock>
                        </form>
                      </div>
                    </div>
                  )}

                  {step === 4 && submitted ? (
                    <div className="tkad-glass-surface relative overflow-hidden rounded-[32px] border border-gray-200 bg-gray-50 dark:border-white/12 dark:bg-white/6 backdrop-blur-md">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0 opacity-0"
                      />
                      <div className="relative flex flex-col items-center gap-5 px-6 py-14 text-center sm:px-10 sm:py-16">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-[color:var(--qp-accent)]/40 bg-[color:var(--qp-accent)]/15 shadow-[0_0_24px_rgba(255,98,0,0.18)]">
                          <CheckCircle className="h-9 w-9 text-primary" aria-hidden />
                        </div>
                        <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary sm:text-xs">
                          [ SUCCESS ]
                        </p>
                        <p className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                          {t("quote.successTitle")}
                        </p>
                        <p className="max-w-md text-[12px] leading-relaxed tracking-tight text-muted-foreground sm:text-sm">
                          {`// `}{t("quote.successDesc")}
                        </p>
                      </div>
                    </div>
                  ) : null}

                  {step < 4 || (step === 4 && !submitted) ? (
                    !(step === 1 && selectedMedia.length > 0) ? (
                      <div className="mt-8 flex flex-wrap justify-between gap-3 border-t-2 border-border pt-6">
                        <BtnBlock
                          variant="secondary"
                          size="md"
                          onClick={goPrev}
                          disabled={step === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          {t("quote.prevStep")}
                        </BtnBlock>
                        {step < 4 ? (
                          <BtnBlock
                            variant="accent"
                            size="md"
                            onClick={goNext}
                          >
                            {t("quote.nextStep")}
                            <ChevronRight className="h-4 w-4" />
                          </BtnBlock>
                        ) : null}
                      </div>
                    ) : null
                  ) : null}
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 lg:sticky lg:top-24">
              <div className="space-y-0">
                <div className="tkad-glass-surface overflow-hidden rounded-[32px] border border-gray-200 bg-gray-50 dark:border-white/12 dark:bg-white/6 backdrop-blur-md">
                  <div className="border-b dark:border-white/10 border-gray-200 p-6 sm:p-7">
                    <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary sm:text-xs">
                      [ ESTIMATE ]
                    </p>
                    <h3 className="mt-3 flex items-center gap-2.5 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                      <Calculator className="h-5 w-5 text-primary sm:h-6 sm:w-6" />
                      {t("quote.estimatedCost")}
                    </h3>
                    <p className="mt-2 text-xs tracking-tight text-muted-foreground sm:text-sm">
                      {`// `}{t("quote.estimatedCostDesc")}
                    </p>
                  </div>
                  <div className="space-y-5 p-6 sm:p-7">
                    {periodMismatchLines.length > 0 ? (
                      <div className="space-y-2.5 rounded-xl border border-amber-500/35 bg-amber-500/10 p-3.5">
                        {periodMismatchLines.map((row) => (
                          <p
                            key={row.mediaId}
                            className="text-xs leading-relaxed text-amber-950 dark:text-amber-100 sm:text-sm"
                          >
                            {t("quote.periodBundleMismatch", {
                              optionLabel: row.optionLabel,
                              bundleDays: row.bundleDays,
                              campaignDays: row.campaignDays,
                            })}
                          </p>
                        ))}
                        {periodSnapTarget ? (
                          <button
                            type="button"
                            className="w-full rounded-lg border border-amber-600/50 bg-amber-500/15 px-3 py-2 text-left text-xs font-semibold text-amber-950 transition hover:bg-amber-500/25 dark:text-amber-50 sm:text-sm"
                            onClick={() => setPeriod(periodSnapTarget)}
                          >
                            {t("quote.alignCampaignPeriod", {
                              periodWithDays: formatQuoteCampaignPeriodWithDays(
                                periodSnapTarget,
                                t(
                                  `quote.periods.${periodSnapTarget}` as `quote.periods.${QuoteCampaignPeriodKey}`,
                                ),
                                isKo,
                              ),
                            })}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {estimateLineBreakdowns.length > 0 ? (
                      <ul className="space-y-2 border-b dark:border-white/10 border-gray-200 pb-4">
                        {estimateLineBreakdowns.map((row) => (
                          <li
                            key={row.key}
                            className="text-xs leading-relaxed text-muted-foreground sm:text-sm"
                          >
                            {row.usesMediaPartialRate ? (
                              <span className="mr-1.5 inline-block rounded-md border border-accent/40 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                                {isKo ? "매체 지정 요율" : "Media rate"}
                              </span>
                            ) : null}
                            {row.label}
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    <div>
                      <p className="font-display text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground sm:text-xs">
                        [ {t(hasProrationLine ? "quote.packagePriceSum" : "quote.unitPriceSum")} ]
                      </p>
                      <p className="mt-2 font-display text-2xl font-bold tabular-nums text-foreground sm:text-3xl">
                        {isKo
                          ? `${Math.round(unitPriceSumMan).toLocaleString()}만원`
                          : `₩${Math.round(unitPriceSumMan * 10_000).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="border-t dark:border-white/10 border-gray-200 pt-4">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-display text-xs font-medium uppercase tracking-[0.22em] text-primary sm:text-xs">
                          [ {t("quote.total")} ]
                        </span>
                        <span className="tkad-home-accent-text font-display text-3xl font-bold tabular-nums sm:text-4xl">
                          {isKo
                            ? `${Math.round(totalCost).toLocaleString()}만원`
                            : `₩${Math.round(totalCost * 10_000).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    {step >= 3 ? (
                      <p className="font-display text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                        {`// `}
                        {t("quote.sidebarDocSummary", {
                          template:
                            template === "premium"
                              ? t("quote.sidebarTemplatePremium")
                              : t("quote.sidebarTemplateDefault"),
                          logoSuffix: logoDataUrl
                            ? t("quote.sidebarDocSummaryLogoSuffix")
                            : "",
                        })}
                      </p>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {step === 4 && !submitted ? (
        <FloatingSelectionBar
          open
          variant="neon"
          ariaLabel={isKo ? "견적서 제출 작업" : "Quote submission actions"}
        >
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end">
            <BtnBlock
              variant="secondary"
              size="md"
              onClick={() => {
                document
                  .getElementById("quote-pdf-email")
                  ?.scrollIntoView({ behavior: "smooth", block: "center" });
              }}
            >
              <Mail className="h-4 w-4" />
              {t("quote.sendPdfEmail")}
            </BtnBlock>
            <BtnBlock
              variant="accent"
              size="md"
              disabled={loading}
              onClick={() =>
                (
                  document.getElementById(
                    "quote-wizard-form",
                  ) as HTMLFormElement | null
                )?.requestSubmit()
              }
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {loading ? t("quote.submitting") : t("quote.submit")}
            </BtnBlock>
          </div>
        </FloatingSelectionBar>
      ) : null}

      {step === 4 && !submitted ? (
        <div className={FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS} aria-hidden />
      ) : null}

      <FloatingSelectionBar
        open={quoteBarOpen}
        variant="neon"
        ariaLabel={isKo ? "선택한 매체 작업" : "Selected media actions"}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div
            className="flex min-w-0 items-center gap-2 sm:gap-2.5"
            aria-live="polite"
            aria-atomic="true"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/40 bg-primary/20 text-base font-bold leading-none text-primary"
              aria-hidden
            >
              ✓
            </span>
            <span className="min-w-0 truncate font-display text-sm font-bold tabular-nums text-foreground sm:text-base">
              {t("quote.floatingSelectedCount", {
                count: displaySelectedForBar.length,
              })}
            </span>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:justify-end sm:gap-3">
            <BtnBlock
              variant="secondary"
              size="md"
              onClick={clearAllMediaSelection}
            >
              {t("quote.floatingClearSelection")}
            </BtnBlock>
            <BtnBlock
              variant="accent"
              size="md"
              onClick={goNext}
            >
              {t("quote.nextStep")}
            </BtnBlock>
          </div>
        </div>
      </FloatingSelectionBar>

      {quoteBarOpen ? (
        <div className={FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS} aria-hidden />
      ) : null}
      </div>
    </HomeLandingDayNight>
  );
}
