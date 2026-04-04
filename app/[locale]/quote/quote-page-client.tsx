"use client";

import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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

const PHONE_RE = /^[\d\-+() ]{8,}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LOGO_MAX_BYTES = 600 * 1024;

type PeriodKey = "1month" | "3months" | "6months" | "12months";

const PERIOD_MONTHS: Record<PeriodKey, number> = {
  "1month": 1,
  "3months": 3,
  "6months": 6,
  "12months": 12,
};

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
  const tMedia = useTranslations("media");
  const locale = useLocale();
  const isKo = locale === "ko";

  const [step, setStep] = useState<WizardStep>(1);
  const [period, setPeriod] = useState<PeriodKey>("1month");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [mediaLayout, setMediaLayout] = useState<"grid" | "compact">("grid");
  const [mediaPage, setMediaPage] = useState(1);
  const [mediaPageSize, setMediaPageSize] = useState(12);
  const [mediaTextFilter, setMediaTextFilter] = useState("");
  const [mediaTypeFilter, setMediaTypeFilter] = useState("all");
  const [mediaRegionFilter, setMediaRegionFilter] = useState("all");
  const [quoteSearchFieldKey, setQuoteSearchFieldKey] = useState(0);
  const [networkQuoteOptions, setNetworkQuoteOptions] = useState<
    Record<string, { units: number; regionScope: string }>
  >({});
  /** 매체별 `priceOptions` 선택 인덱스 (견적 월 단가 반영) */
  const [mediaPriceOptionIndex, setMediaPriceOptionIndex] = useState<
    Record<string, number>
  >({});
  const mediaQueryApplied = useRef(false);
  const [template, setTemplate] = useState<QuoteTemplateId>("default");
  const [sortBy, setSortBy] = useState<
    "default" | "priceAsc" | "priceDesc" | "trafficDesc"
  >("default");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [emailHoneypot, setEmailHoneypot] = useState("");

  useEffect(() => {
    if (mediaQueryApplied.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const raw = params.get("media");
    if (!raw) return;
    mediaQueryApplied.current = true;
    const ids = raw
      .split(",")
      .map((x) => x.trim())
      .filter((id) => catalog.some((m) => m.id === id));
    if (ids.length === 0) return;
    setSelectedIds(new Set(ids));
    const poRaw = params.get("po");
    const po = poRaw != null ? parseInt(poRaw, 10) : NaN;
    if (ids.length === 1 && Number.isFinite(po) && po >= 0) {
      const m = catalog.find((x) => x.id === ids[0]);
      const n = m?.priceOptions?.length ?? 0;
      if (n > 0) {
        setMediaPriceOptionIndex({ [ids[0]]: Math.min(po, n - 1) });
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
          return sum + computeNetworkMonthlyFromMediaItem(m, u);
        }
        const opts = m.priceOptions;
        const idx = mediaPriceOptionIndex[m.id] ?? 0;
        if (opts?.length && opts[idx]) {
          return sum + catalogPriceFieldToPriceMan(opts[idx].price);
        }
        return sum + m.price;
      }, 0),
    [selectedMedia, networkQuoteOptions, mediaPriceOptionIndex],
  );

  const periodMonths = PERIOD_MONTHS[period];
  const totalCost = monthlyCost * periodMonths;

  const periodLabel = t(`quote.periods.${period}` as `quote.periods.${PeriodKey}`);

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
    return selectedMedia.map((m) => {
      const isNw = m.catalogSource === "network";
      const opt = networkQuoteOptions[m.id];
      const units = isNw ? opt?.units ?? m.networkMinUnits ?? 1 : 0;
      const poIdx = mediaPriceOptionIndex[m.id] ?? 0;
      const priceOpt = !isNw ? m.priceOptions?.[poIdx] : undefined;
      const lineMonthly = isNw
        ? computeNetworkMonthlyFromMediaItem(m, units)
        : priceOpt
          ? catalogPriceFieldToPriceMan(priceOpt.price)
          : m.price;
      const baseName = (isKo ? m.name : m.nameEn) || m.name;
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
          : (isKo ? m.location : m.locationEn) || m.location;
      return {
        id: m.id,
        thumbUrl: getPrimaryMediaImageUrl(m),
        name,
        location,
        unitPriceMan: lineMonthly,
        lineTotalMan: lineMonthly * periodMonths,
      };
    });
  }, [selectedMedia, networkQuoteOptions, mediaPriceOptionIndex, isKo, periodMonths]);

  const pdfVatMan = useMemo(() => Math.round(totalCost * 0.1), [totalCost]);
  const pdfGrandTotalMan = useMemo(
    () => totalCost + pdfVatMan,
    [totalCost, pdfVatMan],
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
    () => new Set(["1", "2", "3", "8", "9"]),
    [],
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
                      {touched.media && errors.media ? (
                        <p className="mb-4 text-sm font-medium text-red-500">
                          {errors.media}
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
                                        {isKo ? media.name : media.nameEn}
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
                    <div className="space-y-6">
                      <p className="text-xs text-muted-foreground">
                        {t("quote.periodBudgetPdfHint")}
                      </p>
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-navy">
                          {t("quote.period")}
                        </label>
                        <select
                          value={period}
                          onChange={(e) =>
                            setPeriod(e.target.value as PeriodKey)
                          }
                          className="w-full rounded-md border px-3 py-2 text-sm"
                          aria-label={t("quote.period")}
                        >
                          <option value="1month">{t("quote.periods.1month")}</option>
                          <option value="3months">{t("quote.periods.3months")}</option>
                          <option value="6months">{t("quote.periods.6months")}</option>
                          <option value="12months">{t("quote.periods.12months")}</option>
                        </select>
                      </div>
                      {/* 예산 입력 제거 — 매체를 이미 선택했으므로 불필요 */}
                    </div>
                  )}

                  {step === 3 && (
                    <div className="space-y-6">
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
                                company={form.company}
                                contactName={form.name}
                                contactPhone={form.phone}
                                contactEmail={form.email}
                                periodLabel={periodLabel}
                                periodMonths={periodMonths}
                                rows={pdfPreviewRows}
                                subtotalMan={Math.round(totalCost / 10000)}
                                vatMan={Math.round(pdfVatMan / 10000)}
                                grandTotalMan={pdfGrandTotalMan}
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
                              value={form.email}
                              onChange={(e) =>
                                updateField("email", e.target.value)
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
                        <form
                          className="relative space-y-5"
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
                              <label className="mb-1.5 block text-sm font-medium text-navy">
                                {t("quote.company")}
                              </label>
                              <Input
                                placeholder={t("quote.companyPlaceholder")}
                                value={form.company}
                                onChange={(e) =>
                                  updateField("company", e.target.value)
                                }
                              />
                            </div>
                            <div>
                              <label className="mb-1.5 block text-sm font-medium text-navy">
                                {t("quote.name")}{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <Input
                                placeholder={t("quote.namePlaceholder")}
                                value={form.name}
                                onChange={(e) =>
                                  updateField("name", e.target.value)
                                }
                                className={inputErrorClass("name")}
                              />
                              {fieldError("name")}
                            </div>
                            <div>
                              <label className="mb-1.5 block text-sm font-medium text-navy">
                                {t("quote.phone")}{" "}
                                <span className="text-red-500">*</span>
                              </label>
                              <Input
                                placeholder={t("quote.phonePlaceholder")}
                                value={form.phone}
                                onChange={(e) =>
                                  updateField("phone", e.target.value)
                                }
                                className={inputErrorClass("phone")}
                              />
                              {fieldError("phone")}
                            </div>
                            <div>
                              <label className="mb-1.5 block text-sm font-medium text-navy">
                                {t("quote.email")}
                              </label>
                              <Input
                                type="email"
                                placeholder={t("quote.emailPlaceholder")}
                                value={form.email}
                                onChange={(e) =>
                                  updateField("email", e.target.value)
                                }
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-1.5 block text-sm font-medium text-navy">
                              {t("quote.message")}
                            </label>
                            <Textarea
                              rows={4}
                              placeholder={t("quote.messagePlaceholder")}
                              value={form.message}
                              onChange={(e) =>
                                updateField("message", e.target.value)
                              }
                            />
                          </div>

                          <Button
                            type="submit"
                            className="w-full bg-gold font-semibold text-navy hover:bg-gold-dark"
                            size="lg"
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Spinner className="mr-2" />
                                {t("quote.submitting")}
                              </>
                            ) : (
                              <>
                                <Send className="mr-2 h-4 w-4" />
                                {t("quote.submit")}
                              </>
                            )}
                          </Button>
                        </form>
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
                        ₩{monthlyCost.toLocaleString()}
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
                          ₩{totalCost.toLocaleString()}
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
    </>
  );
}
