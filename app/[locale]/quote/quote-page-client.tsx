"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle,
  Images,
  Calculator,
  MapPin,
  Send,
  Download,
  Camera,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  LayoutTemplate,
  ImagePlus,
  Trash2,
  Mail,
  ShieldCheck,
  Flame,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import {
  dedupeImageUrls,
  getPrimaryMediaImageUrl,
  matchesMediaTextQuery,
  typeLabels,
  type MediaItem,
} from "@/lib/media-data";
import { computeNetworkMonthlyFromMediaItem } from "@/lib/media-network-types";
import Spinner from "@/components/spinner";
import { MediaCatalogThumbnail } from "@/components/media-catalog-thumbnail";
import { MediaCatalogGridCard } from "@/components/media-catalog-grid-card";
import MediaSearchAutocomplete from "@/components/media-search-autocomplete";
import {
  FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS,
  FloatingSelectionBar,
} from "@/components/floating-selection-bar";
import {
  MEDIA_CATALOG_GRID_CLASS,
  MEDIA_CATALOG_COMPACT_GRID_CLASS,
  MEDIA_CATALOG_COMPACT_ROW_OUTER_CLASS,
  MediaCatalogGridCompactToggle,
} from "@/components/media-catalog-shared";
import MediaCatalogFiltersBar from "@/components/media-catalog-filters-bar";
import { PerPageSelect } from "@/components/per-page-select";
import { useMediaCatalogFilters } from "@/lib/use-media-catalog-filters";
import { buildMediaRegionFilterOptions } from "@/lib/media-region-filter-options";
import { cn } from "@/lib/utils";
import {
  computeCatalogBounds,
  defaultAdvancedFilterState,
  passesMediaAdvancedFilters,
  type TargetAgeBucket,
} from "@/lib/media-filter-advanced";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  catalogPriceFieldToPriceMan,
  formatCatalogPriceFieldWon,
  formatMediaPriceWonWithSymbol,
  mediaPricePeriodTranslationKey,
} from "@/lib/media-price-format";
import { useToast } from "@/components/toast-provider";
import { useRouter } from "@/i18n/navigation";
import type { QuoteTemplateId } from "@/lib/build-quote-pdf";
import { QuotePdfPreview } from "@/components/quote-pdf-preview";
import {
  downloadQuotePdfFromElement,
  quoteElementToPdfBase64,
} from "@/lib/quote-html-pdf";
import { captureElementAsPng } from "@/lib/html-to-pdf";
import {
  selectHasDraftContent,
  selectIsDraftExpired,
  useQuoteStore,
} from "@/lib/quote/store";
import { QUOTE_MAX_MEDIA, type QuoteSource } from "@/lib/quote/types";
import { QuoteSourceBanner } from "@/components/quote/source-banner";
import { QuoteRestoreModal } from "@/components/quote/restore-modal";
import { QuotePeriodStep } from "@/components/quote/period-step";
import { QuoteCreativeStep } from "@/components/quote/creative-step";
import { QuoteCustomerForm } from "@/components/quote/customer-form";
import type { QuoteCustomerInfo } from "@/lib/quote/types";
import {
  computeQuoteTotals,
  inclusiveCampaignDays,
  type LineInput,
  type QuoteTotals,
} from "@/lib/pricing";
import { canProceedFromStep } from "@/lib/quote/validation";
import { isoToDate } from "@/lib/quote/store";
import {
  deriveLegacyPeriodKey,
  deriveLegacyPeriodMonths,
} from "@/lib/quote/period-derive";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_MAX_BYTES = 600 * 1024;

type PeriodKey = "1month" | "3months" | "6months" | "12months";

const PERIOD_MONTHS: Record<PeriodKey, number> = {
  "1month": 1,
  "3months": 3,
  "6months": 6,
  "12months": 12,
};

type WizardStep = 1 | 2 | 3 | 4;

export default function QuotePageClient({ catalog }: { catalog: MediaItem[] }) {
  const t = useTranslations();
  const tMedia = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";

  // 견적 마법사 상태는 lib/quote/store 단일 진실. step / 매체 선택 / 네트워크·가격 옵션
  // 모두 store 가 보유하며 24시간 자동 만료 + draft 복원을 지원한다. period / form / template
  // 등은 PR-4~6 에서 단계별로 이전된다.
  const storeStep = useQuoteStore((s) => s.step);
  const setStoreStep = useQuoteStore((s) => s.setStep);
  const selectedMediaIds = useQuoteStore((s) => s.selectedMediaIds);
  const networkOptionsStore = useQuoteStore((s) => s.networkOptions);
  const priceOptionIndicesStore = useQuoteStore((s) => s.priceOptionIndices);
  const storeToggleMedia = useQuoteStore((s) => s.toggleMedia);
  const storeSetSelectedMediaIds = useQuoteStore(
    (s) => s.setSelectedMediaIds,
  );
  const storeClearSelectedMedia = useQuoteStore((s) => s.clearSelectedMedia);
  const storeSetNetworkOption = useQuoteStore((s) => s.setNetworkOption);
  const storeSetPriceOptionIndex = useQuoteStore(
    (s) => s.setPriceOptionIndex,
  );
  const storeSetSource = useQuoteStore((s) => s.setSource);
  const sourceFromStore = useQuoteStore((s) => s.source);
  const storeResetAll = useQuoteStore((s) => s.resetAll);

  // 입력 단계는 1~4 만 사용 — store 의 5(컨펌) 는 본 컴포넌트에서 submitted boolean 로 대체.
  const step = (Math.min(storeStep, 4) as WizardStep);
  const setStep = useCallback(
    (s: WizardStep) => setStoreStep(s),
    [setStoreStep],
  );

  // dates 미입력 시 PDF/제출 폴백용 — Step 2 가 dates 를 채우면 quoteTotals 가 우선.
  const period: PeriodKey = "1month";
  const [mediaLayout, setMediaLayout] = useState<"grid" | "compact">("grid");
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaPageSize, setMediaPageSize] = useState(12);
  const [mediaTextFilter, setMediaTextFilter] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [mediaRegionFilter, setMediaRegionFilter] = useState("all");
  const [quoteSearchFieldKey, setQuoteSearchFieldKey] = useState(0);
  const mediaQueryApplied = useRef(false);

  // ── 호환 어댑터 ──────────────────────────────────────────────────────────
  // 기존 컴포넌트가 Set<string> / 객체 setter 를 가정하고 있어 로컬 어댑터로 감싼다.
  const selectedIds = useMemo(
    () => new Set(selectedMediaIds),
    [selectedMediaIds],
  );
  const setSelectedIds = useCallback(
    (next: Set<string> | ((prev: Set<string>) => Set<string>)) => {
      const value =
        typeof next === "function" ? next(new Set(selectedMediaIds)) : next;
      storeSetSelectedMediaIds([...value]);
    },
    [selectedMediaIds, storeSetSelectedMediaIds],
  );
  const networkQuoteOptions = networkOptionsStore;
  const setNetworkQuoteOptions = useCallback(
    (
      next:
        | Record<string, { units: number; regionScope: string }>
        | ((
            prev: Record<string, { units: number; regionScope: string }>,
          ) => Record<string, { units: number; regionScope: string }>),
    ) => {
      const value =
        typeof next === "function" ? next(networkOptionsStore) : next;
      // 키 단위로 업데이트 — store 가 단일 매체 setter 를 노출하므로 diff 적용.
      const prevKeys = new Set(Object.keys(networkOptionsStore));
      for (const [k, v] of Object.entries(value)) {
        storeSetNetworkOption(k, v);
        prevKeys.delete(k);
      }
      // 사라진 키는 selection cleanup 에서 자동 제거되므로 별도 작업 불필요.
    },
    [networkOptionsStore, storeSetNetworkOption],
  );
  const mediaPriceOptionIndex = priceOptionIndicesStore;
  const setMediaPriceOptionIndex = useCallback(
    (
      next:
        | Record<string, number>
        | ((prev: Record<string, number>) => Record<string, number>),
    ) => {
      const value =
        typeof next === "function" ? next(priceOptionIndicesStore) : next;
      for (const [k, v] of Object.entries(value)) {
        storeSetPriceOptionIndex(k, v);
      }
    },
    [priceOptionIndicesStore, storeSetPriceOptionIndex],
  );

  // ── Draft 복원 모달 ──────────────────────────────────────────────────────
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const restoreCheckedRef = useRef(false);
  const draftSavedAt = useQuoteStore((s) => s.draftSavedAt);
  useEffect(() => {
    if (restoreCheckedRef.current) return;
    restoreCheckedRef.current = true;
    const state = useQuoteStore.getState();
    if (selectIsDraftExpired(state)) {
      storeResetAll();
      return;
    }
    if (!selectHasDraftContent(state)) return;
    // URL 쿼리 사전 데이터가 있으면 사용자 의도가 명확하므로 모달 생략.
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const hasIntent =
        params.has("source") ||
        params.has("planId") ||
        params.has("mediaId") ||
        params.has("media") ||
        params.has("compareIds");
      if (hasIntent) return;
    }
    setRestoreModalOpen(true);
  }, [storeResetAll]);
  const [template, setTemplate] = useState<QuoteTemplateId>("default");
  const [sortBy, setSortBy] = useState<
    "default" | "priceAsc" | "priceDesc" | "trafficDesc"
  >("default");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [emailHoneypot, setEmailHoneypot] = useState("");

  // 다중 진입 경로 파싱 — 한 번만 적용. 우선순위: compareIds > mediaId > media (legacy).
  // source 가 명시되지 않아도 어떤 파라미터가 채워졌는지로 자동 분류.
  useEffect(() => {
    if (mediaQueryApplied.current) return;
    if (typeof window === "undefined") return;
    mediaQueryApplied.current = true;
    const params = new URLSearchParams(window.location.search);

    const sourceRaw = params.get("source");
    const allowed: QuoteSource[] = ["planner", "media", "compare", "direct"];
    let detectedSource: QuoteSource | null = allowed.includes(
      sourceRaw as QuoteSource,
    )
      ? (sourceRaw as QuoteSource)
      : null;
    const planId = params.get("planId");
    const mediaIdSingle = params.get("mediaId");
    const compareIdsRaw = params.get("compareIds");
    const mediaListRaw = params.get("media");

    let collected: string[] = [];
    if (compareIdsRaw) {
      collected = compareIdsRaw.split(",");
      detectedSource ??= "compare";
    } else if (mediaIdSingle) {
      collected = [mediaIdSingle];
      detectedSource ??= "media";
    } else if (mediaListRaw) {
      collected = mediaListRaw.split(",");
      // legacy `?media=...` 은 source 추정 불가 → planId 가 있으면 planner.
      detectedSource ??= planId ? "planner" : "direct";
    }

    const validIds = collected
      .map((x) => x.trim())
      .filter((id) => id.length > 0 && catalog.some((m) => m.id === id))
      .slice(0, QUOTE_MAX_MEDIA);

    if (detectedSource && detectedSource !== "direct") {
      const sid = planId ?? mediaIdSingle ?? null;
      storeSetSource(detectedSource, sid);
    }
    if (validIds.length > 0) {
      storeSetSelectedMediaIds(validIds);
    }

    const poRaw = params.get("po");
    const po = poRaw != null ? parseInt(poRaw, 10) : NaN;
    if (validIds.length === 1 && Number.isFinite(po) && po >= 0) {
      const m = catalog.find((x) => x.id === validIds[0]);
      const n = m?.priceOptions?.length ?? 0;
      if (n > 0) {
        storeSetPriceOptionIndex(validIds[0], Math.min(po, n - 1));
      }
    }
  }, [catalog, storeSetSelectedMediaIds, storeSetSource, storeSetPriceOptionIndex]);

  // 신규로 선택된 네트워크 매체에 기본 옵션 주입. unselect 시 제거는 store 가 자동.
  useEffect(() => {
    for (const id of selectedMediaIds) {
      if (networkOptionsStore[id]) continue;
      const m = catalog.find((x) => x.id === id);
      if (m?.catalogSource !== "network") continue;
      storeSetNetworkOption(id, {
        units: Math.max(m.networkMinUnits ?? 1, 1),
        regionScope: "all",
      });
    }
  }, [selectedMediaIds, networkOptionsStore, catalog, storeSetNetworkOption]);

  // priceOptions 가 있는 매체의 인덱스를 유효 범위로 클램프.
  useEffect(() => {
    for (const id of selectedMediaIds) {
      const m = catalog.find((x) => x.id === id);
      const len = m?.priceOptions?.length ?? 0;
      if (len === 0) continue;
      const cur = priceOptionIndicesStore[id] ?? 0;
      const clamped = Math.min(Math.max(0, cur), len - 1);
      if (clamped !== cur || priceOptionIndicesStore[id] == null) {
        storeSetPriceOptionIndex(id, clamped);
      }
    }
  }, [
    selectedMediaIds,
    priceOptionIndicesStore,
    catalog,
    storeSetPriceOptionIndex,
  ]);

  // 4단계 고객 정보는 store.customer 가 진실. 폼은 components/quote/customer-form 의 RHF.
  const customer = useQuoteStore((s) => s.customer);
  const [mediaError, setMediaError] = useState<string | null>(null);
  const { toast } = useToast();
  const router = useRouter();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailPdfLoading, setEmailPdfLoading] = useState(false);
  const [quoteIssuedAt] = useState(() => new Date());

  const selectedMedia = useMemo(
    () => catalog.filter((m) => selectedIds.has(m.id)),
    [catalog, selectedIds],
  );

  const regionFilterOptions = useMemo(
    () => buildMediaRegionFilterOptions(catalog, (key) => tMedia(key)),
    [catalog, tMedia],
  );

  const bounds = useMemo(() => computeCatalogBounds(catalog), [catalog]);
  const defaultAdvanced = useMemo(
    () => defaultAdvancedFilterState(bounds),
    [bounds],
  );

  const [budgetMin, setBudgetMin] = useState(() => bounds.minPrice);
  const [budgetMax, setBudgetMax] = useState(() => bounds.maxPrice);
  const {
    filters,
    toggleFilter,
    resetFilters,
    clearCategory,
    selectAllInCategory,
  } = useMediaCatalogFilters();

  useEffect(() => {
    setBudgetMin(bounds.minPrice);
    setBudgetMax(bounds.maxPrice);
  }, [bounds.minPrice, bounds.maxPrice]);

  const targetAgePick = filters.targetAge;

  const filterState = useMemo(
    () => ({
      ...defaultAdvanced,
      priceMin: budgetMin,
      priceMax: budgetMax,
      targetAgePick,
    }),
    [defaultAdvanced, budgetMin, budgetMax, targetAgePick],
  );

  const filteredCatalog = useMemo(() => {
    const q = mediaTextFilter.trim().toLowerCase();
    return catalog.filter((m) => {
      if (!passesMediaAdvancedFilters(m, filterState, bounds)) return false;
      if (mediaRegionFilter !== "all" && (m.region ?? "") !== mediaRegionFilter)
        return false;
      if (mediaTypeFilter !== "all" && (m.type ?? "") !== mediaTypeFilter)
        return false;
      if (q.length > 0 && !matchesMediaTextQuery(m, q)) return false;
      return true;
    });
  }, [catalog, mediaRegionFilter, mediaTypeFilter, mediaTextFilter, filterState, bounds]);

  const sortedCatalog = useMemo(() => {
    const arr = [...filteredCatalog];
    switch (sortBy) {
      case "priceAsc":
        return arr.sort((a, b) => a.price - b.price);
      case "priceDesc":
        return arr.sort((a, b) => b.price - a.price);
      case "trafficDesc":
        return arr.sort(
          (a, b) => (b.dailyFootTraffic ?? 0) - (a.dailyFootTraffic ?? 0),
        );
      default:
        return arr;
    }
  }, [filteredCatalog, sortBy]);

  const mediaPageCount = useMemo(
    () => Math.max(1, Math.ceil(sortedCatalog.length / mediaPageSize)),
    [sortedCatalog.length, mediaPageSize],
  );

  const pagedCatalog = useMemo(() => {
    const start = (mediaPage - 1) * mediaPageSize;
    return sortedCatalog.slice(start, start + mediaPageSize);
  }, [sortedCatalog, mediaPage, mediaPageSize]);

  const resetQuoteMediaFilters = useCallback(() => {
    setMediaTextFilter("");
    setMediaTypeFilter("all");
    setMediaRegionFilter("all");
    setBudgetMin(bounds.minPrice);
    setBudgetMax(bounds.maxPrice);
    resetFilters();
    setMediaPage(1);
    setQuoteSearchFieldKey((k) => k + 1);
  }, [bounds.minPrice, bounds.maxPrice, resetFilters]);

  const monthlyCost = useMemo(
    () =>
      selectedMedia.reduce((sum, m) => {
        if (m.catalogSource === "network") {
          const opt = networkQuoteOptions[m.id];
          const u = opt?.units ?? m.networkMinUnits ?? 1;
          return sum + catalogPriceFieldToPriceMan(computeNetworkMonthlyFromMediaItem(m, u));
        }
        const opts = m.priceOptions;
        const idx = mediaPriceOptionIndex[m.id] ?? 0;
        if (opts?.length && opts[idx]) {
          return sum + catalogPriceFieldToPriceMan(opts[idx].price);
        }
        return sum + catalogPriceFieldToPriceMan(m.price);
      }, 0),
    [selectedMedia, networkQuoteOptions, mediaPriceOptionIndex],
  );

  // ── PR-4 가격 계산: store 의 startDate/endDate 가 진실. 비어 있으면 legacy period 폴백.
  // computeQuoteTotals 가 lib/pricing 단일 진실로 모든 매체/할인/VAT 를 한 번에 계산.
  const startDateIso = useQuoteStore((s) => s.startDateIso);
  const endDateIso = useQuoteStore((s) => s.endDateIso);
  const timeSlot = useQuoteStore((s) => s.timeSlot);
  const startDateObj = useMemo(() => isoToDate(startDateIso), [startDateIso]);
  const endDateObj = useMemo(() => isoToDate(endDateIso), [endDateIso]);
  const campaignDays = useMemo(() => {
    if (!startDateObj || !endDateObj) return 0;
    return inclusiveCampaignDays(startDateObj, endDateObj);
  }, [startDateObj, endDateObj]);

  const quoteTotals: QuoteTotals | null = useMemo(() => {
    if (!startDateObj || !endDateObj || campaignDays < 1) return null;
    const lines: LineInput[] = selectedMedia.map((m) => ({
      media: m,
      priceOptionIndex: priceOptionIndicesStore[m.id],
      networkUnits: networkOptionsStore[m.id]?.units,
    }));
    return computeQuoteTotals({
      lines,
      start: startDateObj,
      end: endDateObj,
      hint: "auto",
      multiplierCtx: { timeSlot },
    });
  }, [
    startDateObj,
    endDateObj,
    campaignDays,
    selectedMedia,
    priceOptionIndicesStore,
    networkOptionsStore,
    timeSlot,
  ]);

  // legacy `period`/`periodMonths` 는 PDF/제출 호환을 위해 유지 — 일수에서 가까운 키 추정.
  const periodMonths = quoteTotals
    ? deriveLegacyPeriodMonths(campaignDays)
    : PERIOD_MONTHS[period];
  const derivedPeriodKey: PeriodKey = quoteTotals
    ? deriveLegacyPeriodKey(campaignDays)
    : period;
  const totalCost = quoteTotals
    ? quoteTotals.discountedKrw / 10_000 // PDF 표시용 만원 환산
    : monthlyCost * PERIOD_MONTHS[period];

  const periodLabel = t(
    `quote.periods.${derivedPeriodKey}` as `quote.periods.${PeriodKey}`,
  );

  // 예산 범위 — Step 2 에서 단일 budgetKrw 로 입력했으므로 min=max=budgetKrw 로 동일.
  const budgetKrwForApi = useQuoteStore((s) => s.budgetKrw);
  const budgetMinN = budgetKrwForApi;
  const budgetMaxN = budgetKrwForApi;

  const pdfPreviewRef = useRef<HTMLDivElement>(null);
  const quoteFloatingStashRef = useRef<MediaItem[]>([]);

  const pdfPreviewRows = useMemo(() => {
    // quoteTotals 가 있으면 라인별 lineKrw 를 만원 환산해 사용 → 합계와 100% 일치.
    // 없으면 legacy `monthly × periodMonths` 폴백.
    const totalsLineMap = new Map<string, number>(
      quoteTotals?.lines.map((l) => [l.mediaId, l.lineKrw]) ?? [],
    );
    return selectedMedia.map((m) => {
      const isNw = m.catalogSource === "network";
      const opt = networkQuoteOptions[m.id];
      const units = isNw ? opt?.units ?? m.networkMinUnits ?? 1 : 0;
      const poIdx = mediaPriceOptionIndex[m.id] ?? 0;
      const priceOpt = !isNw ? m.priceOptions?.[poIdx] : undefined;
      const lineMonthly = isNw
        ? catalogPriceFieldToPriceMan(computeNetworkMonthlyFromMediaItem(m, units))
        : priceOpt
          ? catalogPriceFieldToPriceMan(priceOpt.price)
          : catalogPriceFieldToPriceMan(m.price);
      const lineKrwFromTotals = totalsLineMap.get(m.id);
      const lineTotalMan =
        lineKrwFromTotals != null
          ? Math.round(lineKrwFromTotals / 10_000)
          : Math.round(lineMonthly * periodMonths);
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
      return {
        id: m.id,
        thumbUrl: getPrimaryMediaImageUrl(m),
        name,
        location,
        unitPriceMan: Math.round(lineMonthly),
        lineTotalMan,
        size: m.size ?? undefined,
        dailyFootTraffic: m.dailyFootTraffic ?? undefined,
        operatingHours: m.operatingHours ?? undefined,
      };
    });
  }, [
    selectedMedia,
    networkQuoteOptions,
    mediaPriceOptionIndex,
    isKo,
    periodMonths,
    quoteTotals,
  ]);

  // PDF 출력은 만원 단위. dates 가 있으면 quoteTotals 의 vat/total 을 환산, 없으면 legacy 식.
  const pdfVatMan = useMemo(
    () =>
      quoteTotals
        ? Math.round(quoteTotals.vatKrw / 10_000)
        : Math.round(totalCost * 0.1),
    [quoteTotals, totalCost],
  );
  const pdfGrandTotalMan = useMemo(
    () =>
      quoteTotals
        ? Math.round(quoteTotals.totalKrw / 10_000)
        : totalCost + pdfVatMan,
    [quoteTotals, totalCost, pdfVatMan],
  );

  const toggleMedia = useCallback(
    (id: string) => {
      // store 가 QUOTE_MAX_MEDIA 한도를 자체 enforce. 한도 초과 시 사용자에게 토스트.
      const willExceed =
        !selectedMediaIds.includes(id) &&
        selectedMediaIds.length >= QUOTE_MAX_MEDIA;
      if (willExceed) {
        toast(
          "warning",
          isKo
            ? `매체는 최대 ${QUOTE_MAX_MEDIA}개까지 선택할 수 있습니다.`
            : `You can select up to ${QUOTE_MAX_MEDIA} media.`,
        );
        return;
      }
      storeToggleMedia(id);
    },
    [selectedMediaIds, storeToggleMedia, toast, isKo],
  );

  const clearAllMediaSelection = useCallback(() => {
    storeClearSelectedMedia();
  }, [storeClearSelectedMedia]);

  const popularIds = useMemo(
    () => new Set(["1", "2", "3", "8", "9"]),
    [],
  );

  // 4단계 고객 정보 검증은 components/quote/customer-form 의 zodResolver 가 담당.
  // 여기에서는 step 1 의 매체 미선택 인라인 에러만 보존.

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
    if (step === 2) {
      return canProceedFromStep(useQuoteStore.getState(), 2).ok;
    }
    if (step === 3) {
      return canProceedFromStep(useQuoteStore.getState(), 3).ok;
    }
    return true;
  }, [step, selectedMedia.length]);

  const stepBlockerMessage = useCallback((): string | null => {
    if (step === 1 && selectedMedia.length === 0) {
      return t("quote.noMediaSelected");
    }
    if (step === 2) {
      const r = canProceedFromStep(useQuoteStore.getState(), 2);
      if (r.ok) return null;
      // 키별 한국어/영어 메시지 — i18n 풀 매핑은 PR-6 에서 일괄.
      const map: Record<string, { ko: string; en: string }> = {
        needDates: {
          ko: "시작일과 종료일을 선택해 주세요.",
          en: "Please pick start and end dates.",
        },
        endBeforeStart: {
          ko: "종료일은 시작일 이후여야 합니다.",
          en: "End date must be after start date.",
        },
        campaignTooShort: {
          ko: "최소 7일 이상 운영해야 합니다.",
          en: "Minimum campaign length is 7 days.",
        },
        campaignTooLong: {
          ko: "최대 365일까지 선택할 수 있습니다.",
          en: "Maximum campaign length is 365 days.",
        },
      };
      const m = map[r.errorKey];
      return m ? (isKo ? m.ko : m.en) : null;
    }
    if (step === 3) {
      const r = canProceedFromStep(useQuoteStore.getState(), 3);
      if (r.ok) return null;
      const map: Record<string, { ko: string; en: string }> = {
        needCreativeAsset: {
          ko: "최소 1개의 소재 파일을 업로드해 주세요.",
          en: "Please upload at least one creative file.",
        },
        needDesignBrief: {
          ko: "디자인 브리프(브랜드명·메시지)를 입력해 주세요.",
          en: "Please fill in your design brief (brand name and message).",
        },
      };
      const m = map[r.errorKey];
      return m ? (isKo ? m.ko : m.en) : null;
    }
    return null;
  }, [step, selectedMedia.length, isKo, t]);

  const goNext = () => {
    if (!canGoNext()) {
      const msg = stepBlockerMessage() ?? t("quote.noMediaSelected");
      toast("warning", msg);
      if (step === 1) setMediaError(t("quote.noMediaSelected"));
      return;
    }
    if (step === 1) setMediaError(null);
    if (step < 4) setStep((step + 1) as WizardStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => {
    if (step > 1) setStep((step - 1) as WizardStep);
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

  /**
   * QuoteCustomerForm 가 zodResolver 통과 후 호출. 매체 미선택 등 부수 검증은 여기서 처리.
   */
  const handleQuoteSubmit = async (
    payload: QuoteCustomerInfo,
  ): Promise<void> => {
    if (selectedMedia.length === 0) {
      toast("warning", t("quote.noMediaSelected"));
      return;
    }

    // honeypot 트랩 — 값이 채워져 있으면 봇으로 간주, 무음 success.
    if (emailHoneypot.trim()) {
      setSubmitted(true);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company: payload.company,
          name: payload.name,
          phone: payload.phone,
          email: payload.email,
          mediaIds: selectedMedia.map((m) => m.id),
          period,
          budgetMin: budgetMinN,
          budgetMax: budgetMaxN,
          estimatedCost: totalCost,
          message: payload.message ?? "",
          website: emailHoneypot,
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
      const body = (await res.json()) as { quoteId?: string };
      if (body.quoteId) {
        toast(
          "success",
          isKo
            ? "견적이 접수되었습니다. 견적서 페이지로 이동합니다."
            : "Quote saved. Opening your quote page.",
        );
        router.push(`/quote/${body.quoteId}`);
        return;
      }
      setSubmitted(true);
      toast(
        "success",
        isKo
          ? "견적 요청이 접수되었습니다."
          : "Your quote request has been submitted.",
      );
    } catch {
      toast(
        "error",
        isKo
          ? "일시적 오류가 발생했습니다. 다시 시도해 주세요."
          : "An error occurred. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPdf = async () => {
    if (selectedMedia.length === 0) {
      toast("warning", t("quote.noMediaSelected"));
      return;
    }
    setDownloading(true);
    try {
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      const el = pdfPreviewRef.current;
      if (!el) {
        toast("error", t("quote.pdfError"));
        return;
      }
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filename = isKo
        ? `싱커드_견적서_${ymd}.pdf`
        : `THINKAD_quote_${ymd}.pdf`;
      await downloadQuotePdfFromElement(el, filename);
      toast("success", t("quote.pdfDownloaded"));
    } catch (e) {
      console.error("[quote pdf download]", e);
      toast("error", t("quote.pdfError"));
    } finally {
      setDownloading(false);
    }
  };

  const [capturing, setCapturing] = useState(false);
  const handleCapture = async () => {
    const el = pdfPreviewRef.current;
    if (!el) return;
    setCapturing(true);
    try {
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await captureElementAsPng(el, isKo ? `싱커드_견적서_${ymd}.png` : `THINKAD_quote_${ymd}.png`);
      toast("success", isKo ? "이미지로 저장됐어요" : "Saved as image");
    } catch {
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
    if (!customer.email.trim() || !EMAIL_RE.test(customer.email.trim())) {
      toast("warning", t("quote.emailRequiredForPdf"));
      return;
    }
    setEmailPdfLoading(true);
    try {
      await new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      );
      const el = pdfPreviewRef.current;
      if (!el) {
        toast("error", t("quote.pdfError"));
        return;
      }
      const pdfBase64 = await quoteElementToPdfBase64(el);
      const res = await fetch("/api/quote/email-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: customer.email.trim(),
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
    <>
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-3 flex items-center justify-center gap-2">
            <h1 className="text-3xl font-bold text-white sm:text-4xl">
              {t("quote.title")}
            </h1>
            <span className="rounded bg-amber-500 px-2 py-0.5 text-xs font-bold text-white">BETA</span>
          </div>
          <p className="mt-2 text-slate-300">{t("quote.subtitle")}</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            {t("quote.wizardSubtitle")}
          </p>
        </div>
      </section>

      <section className="bg-white py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wide text-navy/50">
              {t("quote.wizardTitle")}
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {([1, 2, 3, 4] as const).map((n) => (
                <div key={n} className="flex items-center gap-2 sm:gap-3">
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
                      "flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold transition-colors",
                      step === n
                        ? "bg-gold text-navy ring-2 ring-gold/40"
                        : step > n
                          ? "bg-navy text-white"
                          : "bg-slate-200 text-slate-500",
                    )}
                  >
                    {step > n ? "✓" : n}
                  </button>
                  <span
                    className={cn(
                      "hidden max-w-[100px] text-xs font-medium sm:block",
                      step === n ? "text-navy" : "text-muted-foreground",
                    )}
                  >
                    {stepLabels[n - 1]}
                  </span>
                  {n < 4 ? (
                    <ChevronRight className="hidden h-4 w-4 text-slate-300 sm:block" />
                  ) : null}
                </div>
              ))}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {t("quote.stepOf", { current: step, total: 4 })}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="order-2">
              <Card className="min-h-[320px] shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-navy">
                    <StepHeaderIcon className="h-5 w-5 text-gold" aria-hidden />
                    {stepLabels[step - 1]}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {step === 1 && (
                    <>
                      <QuoteSourceBanner
                        source={sourceFromStore}
                        prefilledMediaCount={selectedMediaIds.length}
                        onDismiss={() => storeSetSource("direct", null)}
                      />
                      {mediaError ? (
                        <p className="mb-4 text-sm font-medium text-red-500">
                          {mediaError}
                        </p>
                      ) : null}
                      <p className="mb-4 text-sm text-muted-foreground">
                        {t("quote.selectMediaDesc")}
                      </p>
                      <div className="flex flex-col gap-6">
                        <div>
                          <label className="mb-2 block text-sm font-semibold text-navy">
                            {t("common.search")}
                          </label>
                          <MediaSearchAutocomplete
                            key={quoteSearchFieldKey}
                            locale={locale}
                            catalog={catalog}
                            onSelect={(m) => toggleMedia(m.id)}
                            onSearchSubmit={(q) =>
                              setMediaTextFilter(q.trim())
                            }
                            onQueryChange={(q) => {
                              if (!q.trim()) setMediaTextFilter("");
                            }}
                            searchButtonLabel={t("media.searchButton")}
                          />
                        </div>
                        <MediaCatalogFiltersBar
                          mediaTypeFilter={mediaTypeFilter}
                          onMediaTypeFilterChange={setMediaTypeFilter}
                          mediaRegionFilter={mediaRegionFilter}
                          onMediaRegionFilterChange={setMediaRegionFilter}
                          regionOptions={regionFilterOptions}
                          bounds={bounds}
                          budgetMin={budgetMin}
                          budgetMax={budgetMax}
                          onBudgetMinChange={setBudgetMin}
                          onBudgetMaxChange={setBudgetMax}
                          filters={filters}
                          onToggleFilter={toggleFilter}
                          onReset={resetQuoteMediaFilters}
                          clearCategory={clearCategory}
                          selectAllInCategory={selectAllInCategory}
                        />

                        <div className="min-w-0">
                          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                              {t("media.results")}: {sortedCatalog.length}
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
                              <MediaCatalogGridCompactToggle
                                layout={mediaLayout}
                                onLayoutChange={setMediaLayout}
                                gridLabel={t("media.browseCardLayoutGrid")}
                                compactLabel={t("media.browseCardLayoutCompact")}
                              />
                              <PerPageSelect
                                value={mediaPageSize}
                                onChange={(next) => {
                                  setMediaPageSize(next);
                                  setMediaPage(1);
                                }}
                              />
                              <div className="inline-flex rounded-full border border-navy/15 bg-slate-50 p-0.5">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold ${
                                    selectedIds.size > 0
                                      ? "text-navy"
                                      : "text-muted-foreground"
                                  }`}
                                  onClick={() => {
                                    const ids = pagedCatalog.map((m) => m.id);
                                    setSelectedIds(new Set(ids));
                                  }}
                                  disabled={pagedCatalog.length === 0}
                                >
                                  {isKo ? "전체선택" : "Select all"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground"
                                  onClick={() => setSelectedIds(new Set())}
                                  disabled={selectedIds.size === 0}
                                >
                                  {isKo ? "전체삭제" : "Clear all"}
                                </Button>
                              </div>
                              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-4 py-1.5 text-sm font-semibold text-emerald-700">
                                <ShieldCheck className="h-4 w-4" aria-hidden />
                                <span>
                                  {tMedia("browseCatalogVerifiedBadge")}
                                </span>
                              </div>
                            </div>
                          </div>

                      {filteredCatalog.length === 0 ? (
                        <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-navy/15 text-sm text-muted-foreground">
                          {isKo ? "조건에 맞는 매체가 없습니다." : "No media matches your filters."}
                        </div>
                      ) : mediaLayout === "grid" ? (
                      <div className={MEDIA_CATALOG_GRID_CLASS}>
                        {pagedCatalog.map((media) => {
                          const checked = selectedIds.has(media.id);
                          const nwOpt = networkQuoteOptions[media.id];
                          const isNw = media.catalogSource === "network";
                          const poIdx = mediaPriceOptionIndex[media.id] ?? 0;
                          const displayPrice = isNw
                            ? computeNetworkMonthlyFromMediaItem(
                                media,
                                nwOpt?.units ??
                                  media.networkMinUnits ??
                                  1,
                              )
                            : media.priceOptions?.length
                              ? catalogPriceFieldToPriceMan(
                                  media.priceOptions[poIdx].price,
                                )
                              : media.price;
                          return (
                            <div key={media.id} className="space-y-2">
                              <MediaCatalogGridCard
                                variant="selectable"
                                media={media}
                                isKo={isKo}
                                imagePreparingLabel={tMedia("imagePreparing")}
                                selected={checked}
                                onToggleSelected={() => toggleMedia(media.id)}
                                selectionAriaLabel={
                                  isKo
                                    ? `${media.name} 선택`
                                    : `Select ${media.nameEn}`
                                }
                                priceMan={displayPrice}
                              />
                              {checked && isNw ? (
                                <div className="space-y-2 rounded-lg border border-navy/10 bg-slate-50 p-3 text-sm">
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-navy">
                                      {t("quote.networkUnits")}
                                    </label>
                                    <Input
                                      type="number"
                                      min={media.networkMinUnits ?? 1}
                                      max={media.networkTotalLocations ?? 99999}
                                      value={nwOpt?.units ?? media.networkMinUnits ?? 1}
                                      onChange={(e) => {
                                        const v = parseInt(e.target.value, 10);
                                        const lo = media.networkMinUnits ?? 1;
                                        const hi =
                                          media.networkTotalLocations ?? 99999;
                                        const u = Number.isFinite(v)
                                          ? Math.min(hi, Math.max(lo, v))
                                          : lo;
                                        setNetworkQuoteOptions((p) => ({
                                          ...p,
                                          [media.id]: {
                                            units: u,
                                            regionScope:
                                              p[media.id]?.regionScope ?? "all",
                                          },
                                        }));
                                      }}
                                      className="h-9"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-1 block text-xs font-semibold text-navy">
                                      {t("quote.networkRegion")}
                                    </label>
                                    <select
                                      className="w-full rounded-md border border-navy/15 bg-white px-2 py-1.5 text-sm"
                                      value={nwOpt?.regionScope ?? "all"}
                                      onChange={(e) =>
                                        setNetworkQuoteOptions((p) => ({
                                          ...p,
                                          [media.id]: {
                                            units:
                                              p[media.id]?.units ??
                                              media.networkMinUnits ??
                                              1,
                                            regionScope: e.target.value,
                                          },
                                        }))
                                      }
                                    >
                                      <option value="all">
                                        {t("quote.networkRegionAll")}
                                      </option>
                                      {(media.networkRegionLabels ?? []).map(
                                        (r) => (
                                          <option key={r} value={r}>
                                            {r}
                                          </option>
                                        ),
                                      )}
                                    </select>
                                  </div>
                                </div>
                              ) : null}
                              {checked &&
                              !isNw &&
                              (media.priceOptions?.length ?? 0) > 0 ? (
                                <div className="space-y-2 rounded-lg border border-navy/10 bg-slate-50 p-3 text-sm">
                                  <label className="mb-1 block text-xs font-semibold text-navy">
                                    {t("quote.priceOptionLabel")}
                                  </label>
                                  <select
                                    className="w-full rounded-md border border-navy/15 bg-white px-2 py-1.5 text-sm"
                                    value={poIdx}
                                    onChange={(e) => {
                                      const v = parseInt(e.target.value, 10);
                                      setMediaPriceOptionIndex((p) => ({
                                        ...p,
                                        [media.id]: Number.isFinite(v)
                                          ? v
                                          : 0,
                                      }));
                                    }}
                                  >
                                    {(media.priceOptions ?? []).map((o, i) => (
                                      <option key={`${o.label}-${i}`} value={i}>
                                        {o.label} —{" "}
                                        {formatCatalogPriceFieldWon(o.price)}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              ) : null}
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
                            const displayPrice = isNw
                              ? computeNetworkMonthlyFromMediaItem(
                                  media,
                                  nwOpt?.units ?? media.networkMinUnits ?? 1,
                                )
                              : media.priceOptions?.length
                                ? catalogPriceFieldToPriceMan(
                                    media.priceOptions[poIdxC].price,
                                  )
                                : media.price;
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
                                      "hover:shadow-md peer-checked:border-gold peer-checked:ring-2 peer-checked:ring-gold/20",
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
                                          "absolute right-1 top-1 z-20 flex size-7 items-center justify-center rounded-full border-2 bg-white/95 text-[10px] font-bold shadow-sm",
                                          checked
                                            ? "border-gold bg-gold text-navy"
                                            : "border-navy/20",
                                        )}
                                        aria-hidden
                                      >
                                        {checked ? "✓" : ""}
                                      </span>
                                    </MediaCatalogThumbnail>
                                    <div className="relative z-0 flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden sm:gap-1.5">
                                      <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
                                        <Badge
                                          variant="secondary"
                                          className="max-w-full shrink bg-navy/5 px-1.5 py-0 text-[9px] text-navy sm:text-[10px]"
                                        >
                                          {isKo
                                            ? (typeLabel?.ko ?? media.type)
                                            : (typeLabel?.en ?? media.type)}
                                        </Badge>
                                        {popularIds.has(media.id) ? (
                                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full bg-gold/90 px-1.5 py-0 text-[8px] font-bold text-navy sm:text-[9px]">
                                            <Flame className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                            {isKo ? "인기" : "Hot"}
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="line-clamp-2 min-w-0 break-words text-[13px] font-bold leading-snug text-navy sm:line-clamp-1 sm:text-sm sm:leading-relaxed">
                                        {isKo ? media.name : (media.nameEn || media.name)}
                                      </p>
                                      <p className="flex min-w-0 items-start gap-0.5 text-[10px] leading-snug text-muted-foreground sm:items-center sm:text-[11px] sm:leading-relaxed">
                                        <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0 sm:mt-0 sm:h-3 sm:w-3" />
                                        <span className="min-w-0 line-clamp-2 sm:line-clamp-1">
                                          {formatMediaLocationShort(media, isKo)}
                                        </span>
                                      </p>
                                      <p className="min-w-0 break-words text-[13px] font-bold tabular-nums leading-tight text-navy sm:text-sm sm:leading-none">
                                        {formatMediaPriceWonWithSymbol(displayPrice)}
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
                                  </div>
                                </label>
                                {checked && isNw ? (
                                  <div className="space-y-2 rounded-lg border border-navy/10 bg-slate-50 p-3 text-sm">
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold text-navy">
                                        {t("quote.networkUnits")}
                                      </label>
                                      <Input
                                        type="number"
                                        min={media.networkMinUnits ?? 1}
                                        max={media.networkTotalLocations ?? 99999}
                                        value={nwOpt?.units ?? media.networkMinUnits ?? 1}
                                        onChange={(e) => {
                                          const v = parseInt(e.target.value, 10);
                                          const lo = media.networkMinUnits ?? 1;
                                          const hi =
                                            media.networkTotalLocations ?? 99999;
                                          const u = Number.isFinite(v)
                                            ? Math.min(hi, Math.max(lo, v))
                                            : lo;
                                          setNetworkQuoteOptions((p) => ({
                                            ...p,
                                            [media.id]: {
                                              units: u,
                                              regionScope:
                                                p[media.id]?.regionScope ?? "all",
                                            },
                                          }));
                                        }}
                                        className="h-9"
                                      />
                                    </div>
                                    <div>
                                      <label className="mb-1 block text-xs font-semibold text-navy">
                                        {t("quote.networkRegion")}
                                      </label>
                                      <select
                                        className="w-full rounded-md border border-navy/15 bg-white px-2 py-1.5 text-sm"
                                        value={nwOpt?.regionScope ?? "all"}
                                        onChange={(e) =>
                                          setNetworkQuoteOptions((p) => ({
                                            ...p,
                                            [media.id]: {
                                              units:
                                                p[media.id]?.units ??
                                                media.networkMinUnits ??
                                                1,
                                              regionScope: e.target.value,
                                            },
                                          }))
                                        }
                                      >
                                        <option value="all">
                                          {isKo ? "전체" : "All"}
                                        </option>
                                        {(media.networkRegionLabels ?? []).map((label) => (
                                          <option key={label} value={label}>
                                            {label}
                                          </option>
                                        ))}
                                    </select>
                                  </div>
                                </div>
                              ) : null}
                                {checked &&
                                !isNw &&
                                (media.priceOptions?.length ?? 0) > 0 ? (
                                  <div className="space-y-2 rounded-lg border border-navy/10 bg-slate-50 p-3 text-sm">
                                    <label className="mb-1 block text-xs font-semibold text-navy">
                                      {t("quote.priceOptionLabel")}
                                    </label>
                                    <select
                                      className="w-full rounded-md border border-navy/15 bg-white px-2 py-1.5 text-sm"
                                      value={poIdxC}
                                      onChange={(e) => {
                                        const v = parseInt(e.target.value, 10);
                                        setMediaPriceOptionIndex((p) => ({
                                          ...p,
                                          [media.id]: Number.isFinite(v)
                                            ? v
                                            : 0,
                                        }));
                                      }}
                                    >
                                      {(media.priceOptions ?? []).map((o, i) => (
                                        <option
                                          key={`${o.label}-${i}`}
                                          value={i}
                                        >
                                          {o.label} —{" "}
                                          {formatCatalogPriceFieldWon(o.price)}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : null}
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {filteredCatalog.length > 0 && (
                        <div className="mt-4 flex flex-col gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center justify-center gap-3">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={mediaPage <= 1}
                              onClick={() =>
                                setMediaPage((p) => Math.max(1, p - 1))
                              }
                            >
                              <ChevronLeft className="mr-1 h-3.5 w-3.5" />
                              {t("media.pagePrev")}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              {t("media.pageSummary", {
                                from:
                                  filteredCatalog.length === 0
                                    ? 0
                                    : (mediaPage - 1) * mediaPageSize + 1,
                                to: Math.min(
                                  mediaPage * mediaPageSize,
                                  filteredCatalog.length,
                                ),
                                total: filteredCatalog.length,
                              })}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              disabled={mediaPage >= mediaPageCount}
                              onClick={() =>
                                setMediaPage((p) =>
                                  Math.min(mediaPageCount, p + 1),
                                )
                              }
                            >
                              {t("media.pageNext")}
                              <ChevronRight className="ml-1 h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                        </div>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <QuotePeriodStep
                      selectedMedia={selectedMedia}
                      priceOptionIndices={priceOptionIndicesStore}
                      networkOptions={networkOptionsStore}
                    />
                  )}

                  {step === 3 && (
                    <div className="space-y-8">
                      <QuoteCreativeStep selectedMedia={selectedMedia} />

                      {/* PDF 견적서 옵션 — 템플릿 + 헤더 로고. 추후 별도 PR 에서 step 4 로 이전 가능. */}
                      <details className="group rounded-xl border border-navy/10 bg-slate-50/60 p-4">
                        <summary className="cursor-pointer text-sm font-semibold text-navy">
                          {t("quote.pdfOptionsTitle")}
                        </summary>
                        <div className="mt-4 space-y-6">
                          <div>
                            <p className="mb-3 text-sm text-muted-foreground">
                              {t("quote.templateDesc")}
                            </p>
                            <div className="grid gap-4 sm:grid-cols-2">
                              <button
                                type="button"
                                onClick={() => setTemplate("default")}
                                className={cn(
                                  "rounded-xl border-2 p-4 text-left transition-all",
                                  template === "default"
                                    ? "border-gold bg-gold/5 ring-2 ring-gold/20"
                                    : "border-navy/10 hover:border-navy/25",
                                )}
                              >
                                <LayoutTemplate className="mb-2 h-8 w-8 text-navy" />
                                <p className="font-bold text-navy">
                                  {t("quote.templateDefault")}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {t("quote.templateDefaultDesc")}
                                </p>
                              </button>
                              <button
                                type="button"
                                onClick={() => setTemplate("premium")}
                                className={cn(
                                  "rounded-xl border-2 p-4 text-left transition-all",
                                  template === "premium"
                                    ? "border-gold bg-gold/5 ring-2 ring-gold/20"
                                    : "border-navy/10 hover:border-navy/25",
                                )}
                              >
                                <Sparkles className="mb-2 h-8 w-8 text-gold-dark" />
                                <p className="font-bold text-navy">
                                  {t("quote.templatePremium")}
                                </p>
                                <p className="mt-1 text-xs text-muted-foreground">
                                  {t("quote.templatePremiumDesc")}
                                </p>
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-navy">
                              {t("quote.logoLabel")}
                            </label>
                            <p className="mb-2 text-xs text-muted-foreground">
                              {t("quote.logoHint")}
                            </p>
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-navy/15 bg-white px-4 py-2 text-sm font-medium text-navy shadow-sm hover:bg-slate-50">
                                <ImagePlus className="h-4 w-4 text-gold" />
                                {isKo ? "파일 선택" : "Choose file"}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg"
                                  className="hidden"
                                  onChange={onLogoChange}
                                />
                              </label>
                              {logoDataUrl ? (
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setLogoDataUrl(null)}
                                >
                                  <Trash2 className="mr-1.5 h-4 w-4" />
                                  {t("quote.logoRemove")}
                                </Button>
                              ) : null}
                            </div>
                            {logoDataUrl ? (
                              <div className="mt-4 inline-block rounded-lg border border-navy/10 bg-slate-50 p-3">
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
                      </details>
                    </div>
                  )}

                  {step === 4 && !submitted && (
                    <div className="space-y-6">
                      {selectedMedia.length > 0 ? (
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-navy">
                            {t("quote.pdfPreviewTitle")}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {t("quote.pdfPreviewHint")}
                          </p>
                          <div className="overflow-x-auto rounded-xl border border-navy/10 bg-slate-100/90 p-4 md:p-6">
                            <div className="mx-auto w-fit max-w-full">
                              <QuotePdfPreview
                                ref={pdfPreviewRef}
                                template={template}
                                customerLogoSrc={logoDataUrl}
                                company={customer.company}
                                contactName={customer.name}
                                contactPhone={customer.phone}
                                contactEmail={customer.email}
                                periodLabel={periodLabel}
                                periodMonths={periodMonths}
                                rows={pdfPreviewRows}
                                subtotalMan={Math.round(totalCost)}
                                vatMan={Math.round(pdfVatMan)}
                                grandTotalMan={Math.round(pdfGrandTotalMan)}
                                issuedAt={quoteIssuedAt}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="rounded-xl border border-navy/10 bg-slate-50/80 p-4 text-sm">
                        <p className="font-semibold text-navy">
                          {t("quote.reviewTitle")}
                        </p>
                        <ul className="mt-3 space-y-2 text-muted-foreground">
                          <li>
                            <span className="font-medium text-navy">
                              {t("quote.reviewMediaCount")}:{" "}
                            </span>
                            {selectedMedia.length}
                            {isKo ? "건" : ""}
                          </li>
                          <li>
                            <span className="font-medium text-navy">
                              {t("quote.period")}:{" "}
                            </span>
                            {periodLabel}
                          </li>
                          <li>
                            <span className="font-medium text-navy">
                              {t("quote.budgetRange")}:{" "}
                            </span>
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
                          </li>
                          <li>
                            <span className="font-medium text-navy">
                              {t("quote.reviewTemplate")}:{" "}
                            </span>
                            {template === "premium"
                              ? t("quote.templatePremium")
                              : t("quote.templateDefault")}
                          </li>
                          <li>
                            <span className="font-medium text-navy">
                              {t("quote.reviewLogo")}:{" "}
                            </span>
                            {logoDataUrl
                              ? t("quote.reviewLogoYes")
                              : t("quote.reviewLogoNo")}
                          </li>
                        </ul>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Button
                          type="button"
                          onClick={handleDownloadPdf}
                          disabled={downloading || selectedMedia.length === 0}
                          className="flex-1 bg-navy text-white hover:bg-navy/90"
                        >
                          {downloading ? (
                            <>
                              <Spinner className="mr-2 h-4 w-4" />
                              {t("quote.generatingPdf")}
                            </>
                          ) : (
                            <>
                              <Download className="mr-2 h-4 w-4" />
                              {t("quote.downloadPdf")}
                            </>
                          )}
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCapture}
                          disabled={capturing || selectedMedia.length === 0}
                          variant="outline"
                          className="flex-1 border-navy/30 text-navy hover:bg-navy/5"
                        >
                          {capturing ? (
                            <Spinner className="mr-2 h-4 w-4" />
                          ) : (
                            <Camera className="mr-2 h-4 w-4" />
                          )}
                          {isKo ? "이미지 저장" : "Save as Image"}
                        </Button>
                      </div>

                      <div className="relative rounded-xl border border-gold/30 bg-gold/5 p-4">
                        <div className="mb-2 flex items-center gap-2 font-semibold text-navy">
                          <Mail className="h-4 w-4 text-gold-dark" />
                          {t("quote.emailPdfTitle")}
                        </div>
                        <p className="mb-3 text-xs text-muted-foreground">
                          {t("quote.emailPdfDesc")}
                        </p>
                        <div className="absolute -left-[9999px]" aria-hidden>
                          <input
                            value={emailHoneypot}
                            onChange={(e) => setEmailHoneypot(e.target.value)}
                            tabIndex={-1}
                            autoComplete="off"
                          />
                        </div>
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                          <div className="flex-1">
                            <label className="sr-only" htmlFor="quote-pdf-email">
                              {t("quote.email")}
                            </label>
                            <Input
                              id="quote-pdf-email"
                              type="email"
                              placeholder={t("quote.emailPlaceholder")}
                              value={customer.email}
                              onChange={(e) =>
                                useQuoteStore
                                  .getState()
                                  .updateCustomer({ email: e.target.value })
                              }
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            className="border-navy/25 font-semibold text-navy"
                            onClick={handleEmailPdf}
                            disabled={emailPdfLoading || selectedMedia.length === 0}
                          >
                            {emailPdfLoading ? (
                              <>
                                <Spinner className="mr-2 h-4 w-4" />
                                {t("quote.sendingPdf")}
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                {t("quote.sendPdfEmail")}
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="border-t border-navy/10 pt-6">
                        <h3 className="mb-4 text-lg font-bold text-navy">
                          {t("quote.getQuote")}
                        </h3>
                        <QuoteCustomerForm
                          onSubmit={handleQuoteSubmit}
                          loading={loading}
                          honeypot={emailHoneypot}
                          setHoneypot={setEmailHoneypot}
                        />
                      </div>
                    </div>
                  )}

                  {step === 4 && submitted ? (
                    <div className="flex flex-col items-center gap-4 py-12 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500" />
                      <p className="text-lg font-semibold text-navy">
                        {t("quote.successTitle")}
                      </p>
                      <p className="max-w-md text-muted-foreground">
                        {t("quote.successDesc")}
                      </p>
                    </div>
                  ) : null}

                  {step < 4 || (step === 4 && !submitted) ? (
                    !(step === 1 && selectedMedia.length > 0) ? (
                      <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-navy/10 pt-6">
                        <Button
                          type="button"
                          variant="floatingSecondary"
                          size="floating"
                          onClick={goPrev}
                          disabled={step === 1}
                          className="h-11 rounded-xl border-0 md:h-11"
                        >
                          <ChevronLeft className="mr-1 h-4 w-4" />
                          {t("quote.prevStep")}
                        </Button>
                        {step < 4 ? (
                          <Button
                            type="button"
                            variant="floatingPrimary"
                            size="floating"
                            onClick={goNext}
                            className="h-11 rounded-xl md:h-11"
                          >
                            {t("quote.nextStep")}
                            <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        ) : null}
                      </div>
                    ) : null
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="order-1">
              <div className="space-y-6">
                <Card className="border-gold/30 shadow-md">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-base text-navy">
                      <Calculator className="h-4 w-4 text-gold" />
                      {t("quote.estimatedCost")}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground">
                      {t("quote.estimatedCostDesc")}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    <div>
                      <div className="text-lg font-bold text-navy">
                        {isKo
                          ? `${monthlyCost.toLocaleString()}만원`
                          : `₩${(monthlyCost * 10_000).toLocaleString()}`}
                        <span className="text-xs font-normal text-muted-foreground">
                          {" "}{t("quote.perMonth")}
                        </span>
                      </div>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-semibold text-navy">
                          {t("quote.total")}
                        </span>
                        <span className="text-xl font-bold text-navy">
                          {isKo
                            ? `${totalCost.toLocaleString()}만원`
                            : `₩${(totalCost * 10_000).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    {step >= 3 ? (
                      <p className="text-xs text-muted-foreground">
                        {template === "premium"
                          ? t("quote.templatePremium")
                          : t("quote.templateDefault")}
                        {logoDataUrl
                          ? ` · ${t("quote.reviewLogoYes")}`
                          : ""}
                      </p>
                    ) : null}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>

      <FloatingSelectionBar
        open={quoteBarOpen}
        ariaLabel={isKo ? "선택한 매체 작업" : "Selected media actions"}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
          <div
            className="flex min-w-0 items-center gap-2 sm:gap-2.5"
            aria-live="polite"
            aria-atomic="true"
          >
            <span
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-base font-bold leading-none text-emerald-700"
              aria-hidden
            >
              ✓
            </span>
            <span className="min-w-0 truncate text-sm font-semibold tabular-nums text-navy sm:text-base">
              {t("quote.floatingSelectedCount", {
                count: displaySelectedForBar.length,
              })}
            </span>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:shrink-0 sm:items-center sm:justify-end sm:gap-3">
            <Button
              type="button"
              variant="floatingSecondary"
              size="floating"
              onClick={clearAllMediaSelection}
              className="min-w-0 px-2 text-xs sm:min-h-12 sm:px-5 sm:text-sm"
            >
              {t("quote.floatingClearSelection")}
            </Button>
            <Button
              type="button"
              variant="floatingPrimary"
              size="floating"
              onClick={goNext}
              className="min-w-0 px-2 text-xs sm:min-h-12 sm:px-5 sm:text-sm"
            >
              {t("quote.nextStep")}
            </Button>
          </div>
        </div>
      </FloatingSelectionBar>

      {quoteBarOpen ? (
        <div className={FLOATING_SELECTION_BAR_BOTTOM_SPACER_CLASS} aria-hidden />
      ) : null}

      <QuoteRestoreModal
        open={restoreModalOpen}
        selectedMediaCount={selectedMediaIds.length}
        draftSavedAt={draftSavedAt}
        onRestore={() => setRestoreModalOpen(false)}
        onDiscard={() => {
          storeResetAll();
          setRestoreModalOpen(false);
        }}
      />
    </>
  );
}
