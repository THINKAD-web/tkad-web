"use client";

import { useLocale, useTranslations } from "next-intl";
import { BtnBlock } from "@/components/brutalist";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
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
import { computeNetworkMonthlyFromMediaItem } from "@/lib/media-network-types";
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
import { PerPageSelect } from "@/components/per-page-select";
import { useMediaCatalogFilters } from "@/lib/use-media-catalog-filters";
import { cn } from "@/lib/utils";
import {
  computeCatalogBounds,
  defaultAdvancedFilterState,
  passesMediaAdvancedFilters,
} from "@/lib/media-filter-advanced";
import { formatMediaLocationShort } from "@/lib/media-location-format";
import {
  catalogPriceFieldToPriceMan,
  formatCatalogPriceFieldWon,
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
    const poRaw = params.get("po");
    const po = poRaw != null ? parseInt(poRaw, 10) : NaN;
    if (matchedIds.length === 1 && Number.isFinite(po) && po >= 0) {
      const m = catalog.find((x) => x.id === matchedIds[0]);
      const n = m?.priceOptions?.length ?? 0;
      if (n > 0) {
        setMediaPriceOptionIndex({ [matchedIds[0]]: Math.min(po, n - 1) });
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
    const q = mediaTextFilter.trim().toLowerCase();
    return catalog.filter((m) => {
      if (!passesMediaAdvancedFilters(m, filterState, bounds)) return false;
      if (q.length > 0 && !matchesMediaTextQuery(m, q)) return false;
      return true;
    });
  }, [catalog, mediaTextFilter, filterState, bounds]);

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
        ? catalogPriceFieldToPriceMan(computeNetworkMonthlyFromMediaItem(m, units))
        : priceOpt
          ? catalogPriceFieldToPriceMan(priceOpt.price)
          : catalogPriceFieldToPriceMan(m.price);
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
        unitPriceWon: Math.round(lineMonthly * 10_000),
        lineTotalWon: Math.round(lineMonthly * periodMonths * 10_000),
        size: m.size ?? undefined,
        dailyFootTraffic: m.dailyFootTraffic ?? undefined,
        operatingHours: m.operatingHours ?? undefined,
      };
    });
  }, [selectedMedia, networkQuoteOptions, mediaPriceOptionIndex, isKo, periodMonths]);

  /** 사용자 견적 PDF 미리보기는 원 단위로 모든 금액 전달 (만원 round 누적 손실 방지). */
  const pdfSubtotalWon = useMemo(() => Math.round(totalCost * 10_000), [totalCost]);
  const pdfVatWon = useMemo(() => Math.round(pdfSubtotalWon * 0.1), [pdfSubtotalWon]);
  const pdfGrandTotalWon = useMemo(
    () => pdfSubtotalWon + pdfVatWon,
    [pdfSubtotalWon, pdfVatWon],
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

  const [capturing, setCapturing] = useState(false);
  const handleCapture = async () => {
    const el = pdfPreviewRef.current;
    if (!el) return;
    setCapturing(true);
    try {
      const ymd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      await captureElementAsPng(el, isKo ? `싱커드_견적서_${ymd}.png` : `THINKAD_quote_${ymd}.png`);
      toast("success", t("quote.imageSaved"));
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
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-media-page min-h-[calc(100vh-72px)]">
      <section className="tkad-home-hero tkad-neon-surface relative overflow-hidden bg-[#05050a] py-20 text-white sm:py-24">
        <div aria-hidden className="absolute inset-0 tkad-neon-depth" />
        <div aria-hidden className="absolute inset-0 opacity-20 tkad-neon-grid" />
        <div
          aria-hidden
          className="absolute inset-0 tkad-hero-noise opacity-[0.07] mix-blend-overlay"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(0,0,0,0.14),rgba(0,0,0,0.58),rgba(0,0,0,0.92))]"
        />

        <div className="relative mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="font-mono text-[11px] font-bold uppercase tracking-[0.22em] text-white/60">
            {`// 07 / Quote`}
          </p>
          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-2">
            <h1 className="text-balance text-[clamp(40px,4.8vw,68px)] font-[950] leading-[0.95] tracking-[-0.06em] text-white [text-shadow:0_30px_160px_rgba(0,0,0,0.9)]">
              {t("quote.title")}
            </h1>
            <span className="tkad-neon-border rounded-2xl bg-white/5 px-3 py-1 font-mono text-[10px] font-black uppercase tracking-[0.22em] text-white/80 backdrop-blur">
              <span className="tkad-home-accent-text">BETA</span>
            </span>
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/82 sm:text-lg">
            {t("quote.subtitle")}
          </p>
          <p className="mx-auto mt-3 max-w-xl font-mono text-[11px] uppercase tracking-[0.18em] text-white/55">
            {`// `}{t("quote.wizardSubtitle")}
          </p>
        </div>
      </section>

      <section className="border-t border-border/60 bg-transparent py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-10">
            <p className="mb-4 text-center font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
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
                      "flex h-10 w-10 items-center justify-center rounded-2xl border border-white/12 bg-white/6 font-mono text-sm font-black backdrop-blur transition-colors",
                      step === n
                        ? "border-white/16 bg-white/12 text-white shadow-[0_0_0_1px_rgba(34,211,238,0.24),0_24px_80px_rgba(0,0,0,0.45)]"
                        : step > n
                          ? "text-white/80 hover:bg-white/10"
                          : "text-white/40",
                    )}
                  >
                    {step > n ? "✓" : n}
                  </button>
                  <span
                    className={cn(
                      "hidden max-w-[100px] font-mono text-[10px] font-bold uppercase tracking-[0.18em] sm:block",
                      step === n ? "text-foreground" : "text-muted-foreground",
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
            <p className="mt-3 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
              {`// `}{t("quote.stepOf", { current: step, total: 4 })}
            </p>
          </div>

          <div className="flex flex-col gap-6">
            <div className="order-2">
              <div className="tkad-glass-surface relative min-h-[320px] overflow-hidden rounded-[26px]">
                <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.08] tkad-neon-grid" />
                <div className="relative border-b border-white/10 p-5">
                  <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                    [ STEP {step} / 4 ]
                  </p>
                  <h3 className="mt-2 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
                    <StepHeaderIcon className="h-5 w-5 text-primary" aria-hidden />
                    {stepLabels[step - 1]}
                  </h3>
                </div>
                <div className="relative p-5">
                  {step === 1 && (
                    <>
                      {touched.media && errors.media ? (
                        <p className="mb-4 text-sm font-medium text-red-500">
                          {errors.media}
                        </p>
                      ) : null}
                      <p className="mb-4 font-mono text-[11px] tracking-tight text-muted-foreground">
                        {`// `}{t("quote.selectMediaDesc")}
                      </p>
                      <div className="flex flex-col gap-6">
                        <div>
                          <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                            [ {t("common.search")} ]
                          </label>
                          <MediaSearchAutocomplete
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
                        <div className="min-w-0">
                          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="text-sm text-muted-foreground">
                              {t("media.results")}: {sortedCatalog.length}
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="inline-flex items-center gap-2 border-2 border-border bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground">
                                <span className="text-muted-foreground">
                                  {t("media.sortLabel")}
                                </span>
                                <select
                                  className="max-w-[10rem] border-l-2 border-border bg-muted px-2 py-0.5 font-mono text-[11px] font-bold focus:border-accent focus:outline-none"
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
                              <div className="inline-flex border-2 border-border bg-card">
                                <button
                                  type="button"
                                  className={cn(
                                    "inline-flex items-center gap-1.5 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] transition-colors disabled:opacity-40",
                                    selectedIds.size > 0 ? "text-foreground hover:bg-muted" : "text-muted-foreground",
                                  )}
                                  onClick={() => {
                                    const ids = pagedCatalog.map((m) => m.id);
                                    setSelectedIds(new Set(ids));
                                  }}
                                  disabled={pagedCatalog.length === 0}
                                >
                                  {isKo ? "전체선택" : "Select all"}
                                </button>
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1.5 border-l-2 border-border px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:bg-muted disabled:opacity-40"
                                  onClick={() => setSelectedIds(new Set())}
                                  disabled={selectedIds.size === 0}
                                >
                                  {isKo ? "전체삭제" : "Clear all"}
                                </button>
                              </div>
                              <div className="inline-flex items-center gap-2 border-2 border-accent bg-card px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
                                <ShieldCheck className="h-4 w-4" aria-hidden />
                                <span>
                                  {tMedia("browseCatalogVerifiedBadge")}
                                </span>
                              </div>
                            </div>
                          </div>

                      {filteredCatalog.length === 0 ? (
                        <div className="flex h-64 items-center justify-center border-2 border-border bg-muted font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
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
                                <div className="space-y-3 border-2 border-border bg-muted p-3 text-sm">
                                  <div>
                                    <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                      [ {t("quote.networkUnits")} ]
                                    </label>
                                    <input
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
                                      className="h-9 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
                                    />
                                  </div>
                                  <div>
                                    <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                      [ {t("quote.networkRegion")} ]
                                    </label>
                                    <select
                                      className="w-full border-2 border-border bg-card px-2 py-1.5 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
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
                                <div className="space-y-3 border-2 border-border bg-muted p-3 text-sm">
                                  <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                    [ {t("quote.priceOptionLabel")} ]
                                  </label>
                                  <select
                                    className="w-full border-2 border-border bg-card px-2 py-1.5 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
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
                                            ? "border-accent bg-accent text-accent-foreground"
                                            : "border-border bg-card text-foreground",
                                        )}
                                        aria-hidden
                                      >
                                        {checked ? "✓" : ""}
                                      </span>
                                    </MediaCatalogThumbnail>
                                    <div className="relative z-0 flex min-w-0 flex-1 flex-col justify-center gap-1 overflow-hidden sm:gap-1.5">
                                      <div className="flex min-w-0 flex-wrap items-center gap-1 sm:gap-1.5">
                                        <span className="max-w-full shrink border-2 border-border bg-card px-1.5 py-0 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-foreground sm:text-[10px]">
                                          {isKo
                                            ? (typeLabel?.ko ?? media.type)
                                            : (typeLabel?.en ?? media.type)}
                                        </span>
                                        {popularIds.has(media.id) ? (
                                          <span className="inline-flex shrink-0 items-center gap-0.5 border-2 border-accent bg-accent px-1.5 py-0 font-mono text-[9px] font-bold uppercase tracking-[0.18em] text-accent-foreground">
                                            <Flame className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
                                            {isKo ? "인기" : "Hot"}
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="line-clamp-2 min-w-0 break-words text-[13px] font-bold leading-snug tracking-tight text-foreground sm:line-clamp-1 sm:text-sm">
                                        {isKo ? media.name : (media.nameEn || media.name)}
                                      </p>
                                      <p className="flex min-w-0 items-start gap-0.5 font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground sm:items-center sm:text-[11px]">
                                        <MapPin className="mt-0.5 h-2.5 w-2.5 shrink-0 sm:mt-0 sm:h-3 sm:w-3" />
                                        <span className="min-w-0 line-clamp-2 sm:line-clamp-1">
                                          {formatMediaLocationShort(media, isKo)}
                                        </span>
                                      </p>
                                      <p className="min-w-0 break-words font-mono text-[13px] font-bold tabular-nums leading-tight text-accent sm:text-sm sm:leading-none">
                                        {formatCatalogPriceFieldWon(displayPrice)}
                                        <span className="ml-1 font-normal text-[9px] uppercase tracking-[0.18em] text-muted-foreground sm:text-[10px]">
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
                                  <div className="space-y-3 border-2 border-border bg-muted p-3 text-sm">
                                    <div>
                                      <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                        [ {t("quote.networkUnits")} ]
                                      </label>
                                      <input
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
                                      <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                        {t("quote.networkRegion")}
                                      </label>
                                      <select
                                        className="w-full border-2 border-border bg-card px-2 py-1.5 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
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
                                  <div className="space-y-3 border-2 border-border bg-muted p-3 text-sm">
                                    <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                      [ {t("quote.priceOptionLabel")} ]
                                    </label>
                                    <select
                                      className="w-full border-2 border-border bg-card px-2 py-1.5 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
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
                        <div className="mt-4 flex flex-col gap-2 border-t-2 border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex items-center justify-center gap-3">
                            <BtnBlock
                              variant="secondary"
                              size="sm"
                              disabled={mediaPage <= 1}
                              onClick={() =>
                                setMediaPage((p) => Math.max(1, p - 1))
                              }
                            >
                              <ChevronLeft className="h-3.5 w-3.5" />
                              {t("media.pagePrev")}
                            </BtnBlock>
                            <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
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
                            <BtnBlock
                              variant="secondary"
                              size="sm"
                              disabled={mediaPage >= mediaPageCount}
                              onClick={() =>
                                setMediaPage((p) =>
                                  Math.min(mediaPageCount, p + 1),
                                )
                              }
                            >
                              {t("media.pageNext")}
                              <ChevronRight className="h-3.5 w-3.5" />
                            </BtnBlock>
                          </div>
                        </div>
                      )}
                        </div>
                      </div>
                    </>
                  )}

                  {step === 2 && (
                    <div className="space-y-6">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                        {`// `}{t("quote.periodBudgetPdfHint")}
                      </p>
                      <div>
                        <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                          [ {t("quote.period")} ]
                        </label>
                        <select
                          value={period}
                          onChange={(e) =>
                            setPeriod(e.target.value as PeriodKey)
                          }
                          className="h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground focus:border-accent focus:outline-none"
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
                        <p className="mb-4 font-mono text-[11px] tracking-tight text-muted-foreground">
                          {`// `}{t("quote.templateDesc")}
                        </p>
                        <div className="grid gap-0 sm:grid-cols-2">
                          <button
                            type="button"
                            onClick={() => setTemplate("default")}
                            className={cn(
                              "-mt-[2px] -ml-[2px] border-2 p-5 text-left transition-colors",
                              template === "default"
                                ? "border-accent bg-accent text-accent-foreground"
                                : "border-border bg-card text-foreground hover:bg-muted",
                            )}
                          >
                            <LayoutTemplate
                              className={cn(
                                "mb-3 h-8 w-8",
                                template === "default" ? "text-hero-fg" : "text-accent",
                              )}
                            />
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
                              [ DEFAULT ]
                            </p>
                            <p className="mt-1 font-bold tracking-tight">
                              {t("quote.templateDefault")}
                            </p>
                            <p
                              className={cn(
                                "mt-2 font-mono text-[11px] tracking-tight",
                                template === "default" ? "text-hero-fg/85" : "text-muted-foreground",
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
                                ? "border-accent bg-accent text-accent-foreground"
                                : "border-border bg-card text-foreground hover:bg-muted",
                            )}
                          >
                            <Sparkles
                              className={cn(
                                "mb-3 h-8 w-8",
                                template === "premium" ? "text-hero-fg" : "text-accent",
                              )}
                            />
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em]">
                              [ PREMIUM ]
                            </p>
                            <p className="mt-1 font-bold tracking-tight">
                              {t("quote.templatePremium")}
                            </p>
                            <p
                              className={cn(
                                "mt-2 font-mono text-[11px] tracking-tight",
                                template === "premium" ? "text-hero-fg/85" : "text-muted-foreground",
                              )}
                            >
                              {t("quote.templatePremiumDesc")}
                            </p>
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                          [ {t("quote.logoLabel")} ]
                        </label>
                        <p className="mb-3 font-mono text-[11px] tracking-tight text-muted-foreground">
                          {`// `}{t("quote.logoHint")}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <label className="inline-flex cursor-pointer items-center gap-2 border-2 border-border bg-card px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background">
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
                    <div className="space-y-6">
                      {selectedMedia.length > 0 ? (
                        <div className="space-y-3">
                          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                            {isKo ? "[ PDF 미리보기 ]" : "[ PDF PREVIEW ]"}
                          </p>
                          <h3 className="text-base font-bold tracking-tight text-foreground sm:text-lg">
                            {t("quote.pdfPreviewTitle")}
                          </h3>
                          <p className="font-mono text-[11px] tracking-tight text-muted-foreground">
                            {`// `}{t("quote.pdfPreviewHint")}
                          </p>
                          <div className="overflow-x-auto border-2 border-border bg-muted p-4 shadow-[4px_4px_0_0_rgba(0,0,0,0.1)] md:p-6">
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
                                subtotalWon={pdfSubtotalWon}
                                vatWon={pdfVatWon}
                                grandTotalWon={pdfGrandTotalWon}
                                issuedAt={quoteIssuedAt}
                              />
                            </div>
                          </div>
                        </div>
                      ) : null}

                      <div className="border-2 border-border bg-muted p-5 text-sm">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                          [ {t("quote.reviewTitle")} ]
                        </p>
                        <ul className="mt-3 space-y-2 text-foreground/80">
                          <li>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                              {t("quote.reviewMediaCount")}:{" "}
                            </span>
                            {selectedMedia.length}
                            {isKo ? "건" : ""}
                          </li>
                          <li>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                              {t("quote.period")}:{" "}
                            </span>
                            {periodLabel}
                          </li>
                          <li>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
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
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                              {t("quote.reviewTemplate")}:{" "}
                            </span>
                            {template === "premium"
                              ? t("quote.templatePremium")
                              : t("quote.templateDefault")}
                          </li>
                          <li>
                            <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
                              {t("quote.reviewLogo")}:{" "}
                            </span>
                            {logoDataUrl
                              ? t("quote.reviewLogoYes")
                              : t("quote.reviewLogoNo")}
                          </li>
                        </ul>
                      </div>

                      <div className="relative border-2 border-border bg-card">
                        <div className="absolute -left-[9999px]" aria-hidden>
                          <input
                            value={emailHoneypot}
                            onChange={(e) => setEmailHoneypot(e.target.value)}
                            tabIndex={-1}
                            autoComplete="off"
                          />
                        </div>
                        <div className="flex flex-col gap-4 border-b-2 border-border p-5 sm:flex-row sm:items-start sm:justify-between">
                          <div>
                            <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                              [ PDF DOCUMENT ]
                            </p>
                            <h3 className="mt-2 text-lg font-bold tracking-tight text-foreground">
                              {t("quote.pdfDocumentTitle")}
                            </h3>
                            <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
                              {t("quote.pdfDocumentDesc")}
                            </p>
                          </div>
                          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-wrap sm:items-center sm:justify-end md:flex-row">
                            <BtnBlock
                              variant="secondary"
                              size="md"
                              onClick={handleDownloadPdf}
                              disabled={
                                downloading || selectedMedia.length === 0
                              }
                              className="w-full sm:w-auto"
                            >
                              {downloading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <FileDown className="h-4 w-4" />
                              )}
                              {downloading
                                ? t("quote.generatingPdf")
                                : t("quote.downloadPdf")}
                            </BtnBlock>
                            <BtnBlock
                              variant="secondary"
                              size="md"
                              onClick={handleCapture}
                              disabled={
                                capturing || selectedMedia.length === 0
                              }
                              className="w-full sm:w-auto"
                            >
                              {capturing ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Camera className="h-4 w-4" />
                              )}
                              {t("quote.capturePng")}
                            </BtnBlock>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
                                className="h-10 w-full min-w-0 border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none sm:min-w-[14rem] sm:w-56"
                              />
                              <BtnBlock
                                variant="accent"
                                size="md"
                                onClick={handleEmailPdf}
                                disabled={
                                  emailPdfLoading ||
                                  selectedMedia.length === 0
                                }
                                className="w-full shrink-0 sm:w-auto"
                              >
                                {emailPdfLoading ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Mail className="h-4 w-4" />
                                )}
                                {emailPdfLoading
                                  ? t("quote.sendingPdf")
                                  : t("quote.sendPdfEmail")}
                              </BtnBlock>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="border-t-2 border-border pt-6">
                        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                          [ GET QUOTE ]
                        </p>
                        <h3 className="mt-2 mb-5 text-lg font-bold tracking-tight text-foreground">
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
                              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                [ {t("quote.company")} ]
                              </label>
                              <input
                                placeholder={t("quote.companyPlaceholder")}
                                value={form.company}
                                onChange={(e) =>
                                  updateField("company", e.target.value)
                                }
                                className="h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                [ {t("quote.name")} ] <span className="text-accent">*</span>
                              </label>
                              <input
                                placeholder={t("quote.namePlaceholder")}
                                value={form.name}
                                onChange={(e) =>
                                  updateField("name", e.target.value)
                                }
                                className={cn(
                                  "h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none",
                                  inputErrorClass("name"),
                                )}
                              />
                              {fieldError("name")}
                            </div>
                            <div>
                              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                [ {t("quote.phone")} ] <span className="text-accent">*</span>
                              </label>
                              <input
                                placeholder={t("quote.phonePlaceholder")}
                                value={form.phone}
                                onChange={(e) =>
                                  updateField("phone", e.target.value)
                                }
                                className={cn(
                                  "h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none",
                                  inputErrorClass("phone"),
                                )}
                              />
                              {fieldError("phone")}
                            </div>
                            <div>
                              <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                                [ {t("quote.email")} ]
                              </label>
                              <input
                                type="email"
                                placeholder={t("quote.emailPlaceholder")}
                                value={form.email}
                                onChange={(e) =>
                                  updateField("email", e.target.value)
                                }
                                className="h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                              [ {t("quote.message")} ]
                            </label>
                            <textarea
                              rows={4}
                              placeholder={t("quote.messagePlaceholder")}
                              value={form.message}
                              onChange={(e) =>
                                updateField("message", e.target.value)
                              }
                              className="w-full border-2 border-border bg-card px-3 py-2 font-mono text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none"
                            />
                          </div>

                          <BtnBlock
                            type="submit"
                            variant="accent"
                            size="lg"
                            disabled={loading}
                            className="w-full"
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
                    <div className="flex flex-col items-center gap-4 py-12 text-center">
                      <div className="flex h-14 w-14 items-center justify-center border-2 border-accent bg-accent text-accent-foreground">
                        <CheckCircle className="h-8 w-8" />
                      </div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                        [ SUCCESS ]
                      </p>
                      <p className="text-lg font-bold tracking-tight text-foreground">
                        {t("quote.successTitle")}
                      </p>
                      <p className="max-w-md font-mono text-[12px] tracking-tight text-muted-foreground">
                        {`// `}{t("quote.successDesc")}
                      </p>
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

            <div className="order-1">
              <div className="space-y-0">
                <div className="border-2 border-accent bg-card">
                  <div className="border-b-2 border-border p-5">
                    <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                      [ ESTIMATE ]
                    </p>
                    <h3 className="mt-2 flex items-center gap-2 text-base font-bold tracking-tight text-foreground">
                      <Calculator className="h-4 w-4 text-accent" />
                      {t("quote.estimatedCost")}
                    </h3>
                    <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
                      {`// `}{t("quote.estimatedCostDesc")}
                    </p>
                  </div>
                  <div className="space-y-4 p-5 text-sm">
                    <div>
                      <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-muted-foreground">
                        [ {t("quote.perMonth")} ]
                      </p>
                      <p className="mt-2 font-mono text-lg font-bold tabular-nums text-foreground">
                        {isKo
                          ? `${monthlyCost.toLocaleString()}만원`
                          : `₩${(monthlyCost * 10_000).toLocaleString()}`}
                      </p>
                    </div>
                    <div className="border-t-2 border-border pt-3">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-accent">
                          [ {t("quote.total")} ]
                        </span>
                        <span className="font-mono text-xl font-bold tabular-nums text-accent">
                          {isKo
                            ? `${totalCost.toLocaleString()}만원`
                            : `₩${(totalCost * 10_000).toLocaleString()}`}
                        </span>
                      </div>
                    </div>
                    {step >= 3 ? (
                      <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                        {`// `}{template === "premium"
                          ? t("quote.templatePremium")
                          : t("quote.templateDefault")}
                        {logoDataUrl
                          ? ` · ${t("quote.reviewLogoYes")}`
                          : ""}
                      </p>
                    ) : null}
                  </div>
                </div>
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
              className="flex h-8 w-8 shrink-0 items-center justify-center border-2 border-accent bg-accent text-base font-bold leading-none text-accent-foreground"
              aria-hidden
            >
              ✓
            </span>
            <span className="min-w-0 truncate font-mono text-sm font-bold tabular-nums text-foreground sm:text-base">
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
