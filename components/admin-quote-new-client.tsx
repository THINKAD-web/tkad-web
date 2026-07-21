"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link, useRouter } from "@/i18n/navigation";
import {
  parseAdminMediaListFromApiJson,
  type AdminMediaDto,
} from "@/lib/admin-media-dto";
import {
  ADMIN_QUOTE_VALIDITY_DAYS,
  catalogPriceFieldToWon,
  computeAdminQuoteTotals,
  formatAdminQuoteDiscountSummary,
  inclusiveCampaignDays,
  monthFactorFromDays,
} from "@/lib/pricing";
import {
  ADMIN_DAY_PRESET_OPTIONS,
  defaultAdminQuoteBillingDates,
  inferCalendarMonthsFromRange,
  syncBillingEndDate,
  type AdminQuoteBillingMode,
} from "@/lib/admin-quote-billing";
import { formatPricePeriodShortLabel } from "@/lib/media-price-format";
import { QuotePdfPreview } from "@/components/quote-pdf-preview";
import { QuoteFormalPreview } from "@/components/quote/quote-formal-preview";
import { buildAdminFormalQuoteParamsFromDraft } from "@/lib/admin-sales-quote";
import { AdminQuoteLinesEditor } from "@/components/admin/admin-quote-lines-editor";
import {
  buildAdminQuoteLineItems,
  createCatalogQuoteLine,
  adminQuoteLineAmounts,
  type AdminQuoteLine,
  type AdminQuotePeriodKey,
} from "@/lib/admin-quote-lines";
import { decodeAdminQuoteItemSpec } from "@/lib/admin-quote-line-spec";
import {
  Calculator,
  Camera,
  Loader2,
  Search,
  Percent,
  Wallet,
  Receipt,
  FileDown,
  Save,
  Eye,
  Download,
  Plus,
  ListOrdered,
  Trash2,
  FileSignature,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";
import {
  inferVatIncludedFromQuote,
  parseCampaignPeriodLabel,
  parseStoredClientName,
  splitQuoteItemsForForm,
} from "@/lib/admin-quote-hydrate";
import type { QuoteApi } from "@/lib/admin-sales-quote";
import { AdminQuoteContractActions } from "@/components/admin/admin-quote-contract-actions";
import {
  AdminQuotePageShell,
  adminQuoteSectionCard,
  adminQuoteSurfaceMutedClass,
  adminQuoteTableRowClass,
  adminQuoteTableTheadClass,
} from "@/components/admin/admin-quote-page-shell";
import { AdminQuoteTopSticky } from "@/components/admin/admin-quote-top-sticky";
import {
  STICKY_ACTION_BAR_BTN,
  STICKY_ACTION_BAR_BTN_IDLE,
  STICKY_ACTION_BAR_BTN_PRIMARY,
  STICKY_ACTION_BAR_DOCK_SPACER_CLASS,
  STICKY_ACTION_BAR_ROW,
  StickyActionBar,
} from "@/components/sticky-action-bar";
import { cn } from "@/lib/utils";
import type { FormalQuoteIssuer } from "@/lib/formal-quote-issuer";

function formatWon(n: number) {
  return `${new Intl.NumberFormat("ko-KR").format(Math.round(n))}원`;
}

function todayISODate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysISODate(iso: string, days: number): string {
  const [y, mo, da] = iso.split("-").map(Number);
  const d = new Date(y, mo - 1, da + days);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export default function AdminQuoteNewClient({
  quoteId,
  formalQuoteIssuer,
}: {
  quoteId?: string;
  formalQuoteIssuer: FormalQuoteIssuer;
}) {
  const t = useTranslations("adminQuoteNew");
  const tList = useTranslations("adminQuotesList");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const contractPrompt = searchParams.get("contract") === "1";
  const locale = useLocale();
  const isKo = locale === "ko";
  const [medias, setMedias] = useState<AdminMediaDto[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [lines, setLines] = useState<AdminQuoteLine[]>([]);

  const [billingMode, setBillingMode] =
    useState<AdminQuoteBillingMode>("calendar_months");
  const [calendarMonths, setCalendarMonths] = useState(1);
  const [presetDays, setPresetDays] = useState(15);
  const [startDate, setStartDate] = useState(todayISODate);
  // 기본: 온전한 1개월 (달력 일수와 무관하게 단가×1 청구)
  const [endDate, setEndDate] = useState(
    () => defaultAdminQuoteBillingDates(todayISODate()).endDate,
  );

  const [discountPercent, setDiscountPercent] = useState("0");
  const [discountWon, setDiscountWon] = useState("0");
  const [vatIncluded, setVatIncluded] = useState(false);

  const [quoteNumber, setQuoteNumber] = useState("");
  const draftQuoteLabel = `DRAFT-${todayISODate().replace(/-/g, "")}`;
  const displayQuoteNumber = quoteNumber.trim() || draftQuoteLabel;
  const [issueDatePdf, setIssueDatePdf] = useState(todayISODate);
  const [validUntilPdf, setValidUntilPdf] = useState(() =>
    addDaysISODate(todayISODate(), ADMIN_QUOTE_VALIDITY_DAYS),
  );
  const [clientCompany, setClientCompany] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [pdfStyle, setPdfStyle] = useState<"basic" | "formal">("basic");
  const isEditMode = Boolean(quoteId);
  const [editLoading, setEditLoading] = useState(isEditMode);
  const [editError, setEditError] = useState<string | null>(null);
  const [editHydrated, setEditHydrated] = useState(false);
  const [bridgeModalOpen, setBridgeModalOpen] = useState(false);
  const [bridgeLoading, setBridgeLoading] = useState(false);
  const [existingOohQuoteId, setExistingOohQuoteId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError(null);
      try {
        // 전체 카탈로그 필요 — take=500 이면 updatedAt 하위 매체는 검색·라인 hydrate 누락
        const res = await fetch("/api/admin/medias?take=5000", {
          credentials: "include",
          cache: "no-store",
        });
        const raw: unknown = await res.json();
        if (!res.ok) {
          const err =
            typeof raw === "object" &&
            raw !== null &&
            "error" in raw &&
            typeof (raw as { error?: unknown }).error === "string"
              ? (raw as { error: string }).error
              : t("loadError");
          if (!cancelled) setListError(err);
          return;
        }
        const { medias: next, error: parseErr } =
          parseAdminMediaListFromApiJson(raw);
        if (parseErr) {
          if (!cancelled) setListError(parseErr);
          return;
        }
        if (!cancelled) setMedias(next);
      } catch {
        if (!cancelled) setListError(t("networkError"));
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!quoteId || editHydrated || listLoading) return;
    let cancelled = false;
    (async () => {
      setEditLoading(true);
      setEditError(null);
      try {
        const res = await fetch(`/api/admin/quotes/${quoteId}`, {
          credentials: "include",
          cache: "no-store",
        });
        const raw: unknown = await res.json();
        if (!res.ok) {
          const err =
            typeof raw === "object" &&
            raw !== null &&
            "error" in raw &&
            typeof (raw as { error?: unknown }).error === "string"
              ? (raw as { error: string }).error
              : t("editLoadError");
          if (!cancelled) setEditError(err);
          return;
        }
        const quote =
          typeof raw === "object" &&
          raw !== null &&
          "quote" in raw &&
          typeof (raw as { quote?: unknown }).quote === "object"
            ? (raw as { quote: QuoteApi }).quote
            : null;
        if (!quote) {
          if (!cancelled) setEditError(t("editLoadError"));
          return;
        }

        const { company, contact } = parseStoredClientName(quote.clientName);
        const period = quote.items[0]?.period ?? "";
        const parsedPeriod = parseCampaignPeriodLabel(period);

        // 목록 take 밖 매체가 견적에 있으면 ids 로 보강 (개월×단가 청구용 catalog 유지)
        const have = new Set(medias.map((m) => m.id));
        const missingIds = [
          ...new Set(
            quote.items
              .map((it) => it.mediaId?.trim() ?? "")
              .filter(
                (id) => id.length > 0 && !id.startsWith("custom-") && !have.has(id),
              ),
          ),
        ];
        let mediasForHydrate = medias;
        if (missingIds.length > 0) {
          const missRes = await fetch(
            `/api/admin/medias?ids=${encodeURIComponent(missingIds.join(","))}`,
            { credentials: "include", cache: "no-store" },
          );
          if (missRes.ok) {
            const missRaw: unknown = await missRes.json();
            const { medias: extra } = parseAdminMediaListFromApiJson(missRaw);
            if (extra.length > 0) {
              const byId = new Map(medias.map((m) => [m.id, m]));
              for (const m of extra) byId.set(m.id, m);
              mediasForHydrate = [...byId.values()];
              if (!cancelled) setMedias(mediasForHydrate);
            }
          }
        }

        const split = splitQuoteItemsForForm(quote, mediasForHydrate);

        if (!cancelled) {
          setQuoteNumber(quote.quoteNumber);
          setClientCompany(company);
          setClientName(contact);
          setClientPhone(quote.clientPhone ?? "");
          setClientEmail(quote.clientEmail ?? "");
          setValidUntilPdf(quote.validUntil.slice(0, 10));
          setIssueDatePdf(quote.createdAt.slice(0, 10));
          if (parsedPeriod) {
            // 저장된 견적은 자유 날짜로 복원 (개월 모드 sync가 endDate를 덮지 않도록)
            setBillingMode("custom_dates");
            setStartDate(parsedPeriod.startDate);
            setEndDate(parsedPeriod.endDate);
          }
          setDiscountPercent("0");
          setDiscountWon(String(quote.discount));
          setVatIncluded(inferVatIncludedFromQuote(quote));
          setLines(split.lines);
          setEditHydrated(true);
        }
      } catch {
        if (!cancelled) setEditError(t("networkError"));
      } finally {
        if (!cancelled) setEditLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [quoteId, editHydrated, listLoading, medias, t]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return medias;
    return medias.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.nameEn?.toLowerCase().includes(q) ?? false) ||
        m.location.toLowerCase().includes(q) ||
        m.region.toLowerCase().includes(q) ||
        m.type.toLowerCase().includes(q),
    );
  }, [medias, search]);

  // 개월·일 프리셋 모드에서는 종료일을 모드에 맞게 동기화
  useEffect(() => {
    if (billingMode === "custom_dates") return;
    const synced = syncBillingEndDate({
      mode: billingMode,
      calendarMonths,
      presetDays,
      startDate,
      endDate,
    });
    if (synced.endDate !== endDate) setEndDate(synced.endDate);
  }, [billingMode, calendarMonths, presetDays, startDate, endDate]);

  const start = useMemo(() => new Date(`${startDate}T12:00:00`), [startDate]);
  const end = useMemo(() => new Date(`${endDate}T12:00:00`), [endDate]);
  const days = useMemo(() => inclusiveCampaignDays(start, end), [start, end]);
  const monthFactor = useMemo(() => monthFactorFromDays(days), [days]);

  type PeriodKey = AdminQuotePeriodKey;
  const factorForPeriod = useCallback((p: PeriodKey, d: number): number => {
    const dd = Math.max(0, d);
    switch (p) {
      case "biweekly":
        return dd / 14;
      case "week":
        return dd / 7;
      case "day":
        return dd;
      default:
        return monthFactorFromDays(dd);
    }
  }, []);

  const billing = useMemo(
    () => ({
      mode: billingMode,
      calendarMonths: Math.max(1, calendarMonths),
      presetDays: Math.max(1, presetDays),
      days,
      startDate,
      endDate,
    }),
    [billingMode, calendarMonths, presetDays, days, startDate, endDate],
  );

  const campaignPeriodLabel = useMemo(
    () => `${startDate} ~ ${endDate}`,
    [startDate, endDate],
  );

  const lineItems = useMemo(
    () =>
      buildAdminQuoteLineItems({
        lines,
        medias,
        isKo,
        campaignPeriodLabel,
        days,
        factorForPeriod,
        billing,
      }),
    [lines, medias, isKo, campaignPeriodLabel, days, factorForPeriod, billing],
  );

  const lineWons = useMemo(
    () => adminQuoteLineAmounts(lineItems),
    [lineItems],
  );

  const hasLines = lines.length > 0;

  const dpct = Math.min(100, Math.max(0, parseFloat(discountPercent) || 0));
  const dwon = Math.max(0, parseFloat(discountWon.replace(/,/g, "")) || 0);

  const totals = useMemo(
    () =>
      computeAdminQuoteTotals({
        lineWons,
        discountPercent: dpct,
        discountWon: dwon,
        vatIncluded,
      }),
    [lineWons, dpct, dwon, vatIncluded],
  );

  const discountSummary = useMemo(
    () =>
      formatAdminQuoteDiscountSummary({
        isKo,
        discountPercent: dpct,
        discountWon: dwon,
      }),
    [isKo, dpct, dwon],
  );

  const addCatalogLine = useCallback((mediaId: string) => {
    setLines((prev) => [...prev, createCatalogQuoteLine(mediaId)]);
  }, []);

  const formalPreviewParams = useMemo(
    () =>
      buildAdminFormalQuoteParamsFromDraft({
        isKo,
        quoteNumber: displayQuoteNumber,
        issueDate: issueDatePdf,
        validUntil: validUntilPdf,
        clientCompany: clientCompany.trim(),
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        periodLabel: campaignPeriodLabel,
        discountPercent: dpct,
        discountWon: dwon,
        vatIncluded,
        totals,
        rows: lineItems.map((it) => ({
          name: it.mediaName,
          spec: decodeAdminQuoteItemSpec(it.spec).displaySpec,
          period: it.period,
          unitPriceWon: it.unitPrice,
          quantity: it.quantity,
          lineTotalWon: it.amount,
        })),
      }),
    [
      isKo,
      displayQuoteNumber,
      issueDatePdf,
      validUntilPdf,
      clientCompany,
      clientName,
      clientPhone,
      clientEmail,
      campaignPeriodLabel,
      dpct,
      dwon,
      vatIncluded,
      totals,
      lineItems,
    ],
  );

  const pdfPeriodUnit = useMemo(() => {
    const periods = new Set<PeriodKey>();
    for (const it of lineItems) {
      if (!it.mediaId.startsWith("custom-")) periods.add(it.unitPeriod);
    }
    if (periods.size !== 1) return null;
    const only = [...periods][0];
    if (only === "month") return null;
    return formatPricePeriodShortLabel(only, locale);
  }, [lineItems, locale]);

  const pdfPeriodMultiplier = useMemo(() => {
    if (billingMode === "calendar_months") {
      return Math.max(1, Math.round(calendarMonths));
    }
    const periods = new Set<PeriodKey>();
    for (const it of lineItems) {
      if (!it.mediaId.startsWith("custom-")) periods.add(it.unitPeriod);
    }
    if (periods.size !== 1) return Math.max(1, Math.round(monthFactor));
    const only = [...periods][0];
    if (only === "month") return Math.max(1, Math.round(monthFactor));
    return Math.max(1, Math.round(factorForPeriod(only, days)));
  }, [
    billingMode,
    calendarMonths,
    lineItems,
    days,
    monthFactor,
    factorForPeriod,
  ]);

  const saveQuote = useCallback(async () => {
    setPdfError(null);
    if (!hasLines) {
      const msg = t("saveFailNeedLines");
      setPdfError(msg);
      toast("error", msg);
      return;
    }
    if (days <= 0) {
      const msg = t("invalidPeriod");
      setPdfError(msg);
      toast("error", msg);
      return;
    }
    if (!clientCompany.trim()) {
      const msg = t("saveFailNeedCompany");
      setPdfError(msg);
      toast("error", msg);
      return;
    }
    if (!clientName.trim()) {
      const msg = t("saveFailNeedName");
      setPdfError(msg);
      toast("error", msg);
      return;
    }
    if (!clientPhone.trim()) {
      const msg = t("saveFailNeedPhone");
      setPdfError(msg);
      toast("error", msg);
      return;
    }
    setSaveLoading(true);
    try {
      const clientNameStored = [clientCompany.trim(), clientName.trim()]
        .filter(Boolean)
        .join(" · ");
      const payload = {
        clientName: clientNameStored,
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail.trim() || undefined,
        validUntil: validUntilPdf,
        subtotal: totals.linesSubtotalWon,
        discount: totals.discountTotalWon,
        tax: totals.vatWon,
        total: totals.totalWon,
        isKo,
        items: lineItems.map((it) => ({
          mediaId: it.mediaId,
          mediaName: it.mediaName,
          spec: it.spec === "—" ? null : it.spec,
          period: it.period,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          amount: it.amount,
        })),
      };
      const res = await fetch(
        isEditMode && quoteId
          ? `/api/admin/quotes/${quoteId}`
          : "/api/admin/quotes",
        {
          method: isEditMode && quoteId ? "PATCH" : "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEditMode
              ? payload
              : {
                  ...payload,
                  ...(quoteNumber.trim() ? { quoteNumber: quoteNumber.trim() } : {}),
                  status: "draft",
                },
          ),
        },
      );
      const raw: unknown = await res.json();
      if (!res.ok) {
        const msg =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : t("saveFailed");
        throw new Error(msg);
      }
      const saved = raw as { quote?: QuoteApi };
      if (saved.quote?.quoteNumber) setQuoteNumber(saved.quote.quoteNumber);
      if (!isEditMode && saved.quote?.id) {
        toast("success", t("saveOkWithContract"));
        router.push(`/admin/quotes/${saved.quote.id}/edit`);
        return;
      }
      toast("success", isEditMode ? t("updateOk") : t("saveOk"));
    } catch (e) {
      toast("error", e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaveLoading(false);
    }
  }, [
    hasLines,
    days,
    clientCompany,
    clientName,
    clientPhone,
    clientEmail,
    quoteNumber,
    validUntilPdf,
    totals,
    lineItems,
    isKo,
    isEditMode,
    quoteId,
    router,
    t,
    toast,
  ]);

  const canCreateContract =
    Boolean(quoteId) &&
    hasLines &&
    days > 0 &&
    clientCompany.trim() &&
    clientName.trim() &&
    clientPhone.trim() &&
    clientEmail.trim();

  const contractBlockReason = useMemo(() => {
    if (!quoteId) return t("createContractNeedSaveFirst");
    if (!clientEmail.trim()) return t("createContractEmailInline");
    if (!hasLines || days <= 0) return t("createContractNeedLines");
    if (!clientCompany.trim() || !clientName.trim() || !clientPhone.trim()) {
      return t("createContractNeedClientInline");
    }
    return null;
  }, [
    quoteId,
    clientEmail,
    hasLines,
    days,
    clientCompany,
    clientName,
    clientPhone,
    t,
  ]);

  const contractBusy = bridgeLoading || saveLoading || pdfLoading;
  const showEmailFieldError = Boolean(quoteId) && !clientEmail.trim();
  const emailBannerText = showEmailFieldError ? t("createContractEmailBanner") : null;
  const stickySummary = quoteId
    ? `${displayQuoteNumber} · ${formatWon(totals.totalWon)}`
    : isEditMode
      ? t("editSubtitle")
      : t("subtitle");

  const openBridgeModal = useCallback(async () => {
    if (!quoteId) return;
    setBridgeModalOpen(true);
    setExistingOohQuoteId(null);
    try {
      const res = await fetch(
        `/api/admin/quotes/${quoteId}/create-ooh-quote`,
        { credentials: "include", cache: "no-store" },
      );
      const raw = (await res.json()) as { existingOohQuoteId?: string | null };
      if (res.ok) {
        setExistingOohQuoteId(raw.existingOohQuoteId ?? null);
      }
    } catch {
      /* preview optional */
    }
  }, [quoteId]);

  useEffect(() => {
    if (!contractPrompt || !quoteId || editLoading || !editHydrated) return;
    if (canCreateContract) void openBridgeModal();
  }, [
    contractPrompt,
    quoteId,
    editLoading,
    editHydrated,
    canCreateContract,
    openBridgeModal,
  ]);

  const confirmCreateContract = useCallback(async () => {
    if (!quoteId) return;
    setBridgeLoading(true);
    try {
      const res = await fetch(
        `/api/admin/quotes/${quoteId}/create-ooh-quote`,
        {
          method: "POST",
          credentials: "include",
          cache: "no-store",
        },
      );
      const raw = (await res.json()) as {
        oohQuoteId?: string;
        error?: string;
        created?: boolean;
      };
      if (!res.ok) {
        throw new Error(raw.error ?? t("createContractFailed"));
      }
      if (!raw.oohQuoteId) throw new Error(t("createContractFailed"));
      toast(
        "success",
        raw.created ? t("createContractOk") : t("createContractExists"),
      );
      setBridgeModalOpen(false);
      router.push(
        `/admin/quotes?tab=booking&highlight=${encodeURIComponent(raw.oohQuoteId)}`,
      );
    } catch (e) {
      toast(
        "error",
        e instanceof Error ? e.message : t("createContractFailed"),
      );
    } finally {
      setBridgeLoading(false);
    }
  }, [quoteId, router, t, toast]);

  const deleteQuote = useCallback(async () => {
    if (!quoteId) return;
    if (
      !window.confirm(
        tList("deleteConfirm", {
          number: quoteNumber || quoteId,
          name: clientCompany.trim() || clientName.trim() || "—",
        }),
      )
    ) {
      return;
    }
    setSaveLoading(true);
    try {
      const res = await fetch(`/api/admin/quotes/${quoteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        toast("error", tList("deleteFailed"));
        return;
      }
      toast("success", tList("deleteOk"));
      router.push("/admin/quotes");
    } catch {
      toast("error", tList("deleteFailed"));
    } finally {
      setSaveLoading(false);
    }
  }, [
    quoteId,
    quoteNumber,
    clientCompany,
    clientName,
    tList,
    toast,
    router,
  ]);

  const downloadPdf = useCallback(async (style: "basic" | "formal" = pdfStyle) => {
    setPdfError(null);
    if (!hasLines) {
      setPdfError(t("pdfNeedMedia"));
      return;
    }
    if (days <= 0) {
      setPdfError(t("invalidPeriod"));
      return;
    }
    if (!clientCompany.trim() || !clientName.trim() || !clientPhone.trim()) {
      setPdfError(t("pdfNeedClient"));
      return;
    }
    setPdfLoading(true);
    try {
      const res = await fetch("/api/admin/quotes/pdf", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteNumber: displayQuoteNumber,
          issueDate: issueDatePdf,
          validUntil: validUntilPdf,
          clientCompany: clientCompany.trim(),
          clientName: clientName.trim(),
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim() || undefined,
          periodLabel: campaignPeriodLabel,
          isKo,
          supplyWon: totals.supplyWon,
          vatWon: totals.vatWon,
          totalWon: totals.totalWon,
          linesSubtotalWon: totals.linesSubtotalWon,
          discountTotalWon:
            totals.discountTotalWon > 0 ? totals.discountTotalWon : undefined,
          discountSummary: discountSummary,
          vatIncluded,
          discountPercent: dpct,
          discountWon: dwon,
          pdfStyle: style,
          rows: lineItems.map((it) => {
            const m = medias.find((x) => x.id === it.mediaId);
            return {
              mediaId: it.mediaId.startsWith("custom-") ? null : it.mediaId,
              name: it.mediaName,
              period: it.period,
              unitPriceWon: it.unitPrice,
              lineTotalWon: it.amount,
              location: m?.location,
              spec: decodeAdminQuoteItemSpec(it.spec).displaySpec,
              quantity: it.quantity,
              quantityLabel: it.quantityLabel,
            };
          }),
        }),
      });
      if (!res.ok) {
        const raw: unknown = await res.json().catch(() => null);
        const msg =
          typeof raw === "object" &&
          raw !== null &&
          "error" in raw &&
          typeof (raw as { error?: unknown }).error === "string"
            ? (raw as { error: string }).error
            : t("pdfFailed");
        throw new Error(msg);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        style === "formal"
          ? `thinkad-formal-quote-${displayQuoteNumber}.pdf`
          : `thinkad-quote-${displayQuoteNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast("success", isKo ? "견적서 PDF가 다운로드되었습니다" : "Quote PDF downloaded");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("pdfFailed");
      setPdfError(msg);
      toast("error", tCommon("pdfGenerationFailed"));
    } finally {
      setPdfLoading(false);
    }
  }, [
    hasLines,
    days,
    clientCompany,
    clientName,
    clientPhone,
    clientEmail,
    displayQuoteNumber,
    issueDatePdf,
    validUntilPdf,
    campaignPeriodLabel,
    totals,
    discountSummary,
    vatIncluded,
    dpct,
    dwon,
    pdfStyle,
    lineItems,
    medias,
    isKo,
    t,
    tCommon,
    toast,
  ]);

  return (
    <AdminQuotePageShell>
      {editLoading ? (
        <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin" />
          {t("editLoading")}
        </div>
      ) : editError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-700">
          <p>{editError}</p>
          <Link
            href="/admin/quotes"
            className="mt-3 inline-block text-xs font-semibold text-accent hover:underline"
          >
            {t("goToQuotesList")}
          </Link>
        </div>
      ) : (
        <>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-foreground dark:text-hero-fg">
            <Calculator className="h-7 w-7 text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditMode ? t("editTitle") : t("title")}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {isEditMode ? t("editSubtitle") : t("subtitle")}
          </p>
          <Link
            href="/admin/quotes"
            className="mt-2 inline-block text-xs font-semibold text-accent hover:opacity-90 hover:underline"
          >
            {t("goToQuotesList")}
          </Link>
        </div>
        {isEditMode ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="text-red-600 hover:bg-red-50 hover:text-red-700"
            disabled={saveLoading}
            onClick={() => void deleteQuote()}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {tList("delete")}
          </Button>
        ) : null}
      </div>

      <AdminQuoteTopSticky
        title={t("createContractStickyTitle")}
        summary={stickySummary}
        contractLabel={t("createContract")}
        blockReason={canCreateContract ? null : contractBlockReason}
        canCreate={canCreateContract}
        busy={contractBusy}
        onContractClick={() => void openBridgeModal()}
        emailBanner={emailBannerText}
      />

      {contractPrompt && contractBlockReason ? (
        <div
          className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-100"
          role="status"
        >
          {contractBlockReason}
        </div>
      ) : null}

      <Card className="rounded-2xl border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-hero-fg">
            <ListOrdered className="h-5 w-5 text-accent" />
            견적 라인
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            같은 매체를 등급·수량별로 여러 라인에 넣을 수 있습니다.
          </p>
        </CardHeader>
        <CardContent>
          <AdminQuoteLinesEditor
            lines={lines}
            onChange={setLines}
            medias={medias}
            isKo={isKo}
            locale={locale}
            billing={billing}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-foreground dark:text-hero-fg">
              매체에서 라인 추가
            </CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className={`max-h-[min(420px,45vh)] overflow-auto p-0 ${adminQuoteSurfaceMutedClass}`}>
            {listLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("loading")}
              </div>
            ) : listError ? (
              <p className="p-6 text-sm text-red-600">{listError}</p>
            ) : filtered.length === 0 ? (
              <p className="p-6 text-sm text-muted-foreground">{t("empty")}</p>
            ) : (
              <table className="w-full text-sm">
                <thead className={`sticky top-0 z-10 shadow-sm ${adminQuoteTableTheadClass}`}>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="px-3 py-2">{t("colMedia")}</th>
                    <th className="w-28 px-2 py-2">{t("colPrice")}</th>
                    <th className="w-28 px-2 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const rawPrice = m.priceOptions?.[0]?.price ?? m.price;
                    const period = m.priceOptions?.[0]?.period ?? "month";
                    return (
                      <tr
                        key={m.id}
                        className={adminQuoteTableRowClass}
                      >
                        <td className="px-3 py-2 align-middle">
                          <div className="font-medium text-foreground dark:text-hero-fg">
                            {m.name}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {m.location} · {m.type}
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle tabular-nums text-xs">
                          {new Intl.NumberFormat("ko-KR").format(
                            catalogPriceFieldToWon(rawPrice),
                          )}
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            {formatPricePeriodShortLabel(period, locale)}
                          </span>
                          {(m.priceOptions?.length ?? 0) > 1 ? (
                            <div className="text-[10px] text-muted-foreground">
                              +{(m.priceOptions?.length ?? 1) - 1} 등급
                            </div>
                          ) : null}
                        </td>
                        <td className="px-2 py-2 align-middle text-right">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => addCatalogLine(m.id)}
                          >
                            <Plus className="mr-1 h-3.5 w-3.5" />
                            라인 추가
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-hero-fg">
              <Receipt className="h-5 w-5 text-accent" />
              {t("termsTitle")}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="mb-2 block text-xs font-medium text-muted-foreground">
                청구 기간 방식
              </span>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    { id: "calendar_months" as const, label: "개월 단위" },
                    { id: "day_preset" as const, label: "일 프리셋" },
                    { id: "custom_dates" as const, label: "직접 날짜" },
                  ] as const
                ).map((opt) => (
                  <Button
                    key={opt.id}
                    type="button"
                    size="sm"
                    variant={billingMode === opt.id ? "default" : "outline"}
                    className="h-8 text-xs"
                    onClick={() => {
                      if (opt.id === "calendar_months") {
                        const inferred = inferCalendarMonthsFromRange(
                          startDate,
                          endDate,
                        );
                        if (inferred != null) setCalendarMonths(inferred);
                      }
                      setBillingMode(opt.id);
                    }}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </div>

            {billingMode === "calendar_months" ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  개월 수 (온전한 N개월 · 단가×N)
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  {[1, 2, 3, 6, 12].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      size="sm"
                      variant={calendarMonths === n ? "default" : "outline"}
                      className="h-8 min-w-12 text-xs"
                      onClick={() => setCalendarMonths(n)}
                    >
                      {n}개월
                    </Button>
                  ))}
                  <Input
                    type="number"
                    min={1}
                    max={36}
                    value={String(calendarMonths)}
                    onChange={(e) =>
                      setCalendarMonths(
                        Math.max(1, Math.min(36, parseInt(e.target.value, 10) || 1)),
                      )
                    }
                    className="h-8 w-20 text-sm tabular-nums"
                    aria-label="개월 수 직접 입력"
                  />
                </div>
              </div>
            ) : null}

            {billingMode === "day_preset" ? (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  부분기간 프리셋 (매체 등록 요율 우선)
                </label>
                <div className="flex flex-wrap gap-2">
                  {ADMIN_DAY_PRESET_OPTIONS.map((opt) => (
                    <Button
                      key={opt.key}
                      type="button"
                      size="sm"
                      variant={presetDays === opt.days ? "default" : "outline"}
                      className="h-8 text-xs"
                      onClick={() => setPresetDays(opt.days)}
                    >
                      {opt.labelKo}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("startDate")}
                </label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">
                  {t("endDate")}
                </label>
                <Input
                  type="date"
                  value={endDate}
                  disabled={billingMode !== "custom_dates"}
                  onChange={(e) => {
                    setBillingMode("custom_dates");
                    setEndDate(e.target.value);
                  }}
                />
              </div>
            </div>
            <div className={`${adminQuoteSurfaceMutedClass} px-3 py-2 text-xs text-muted-foreground`}>
              <span className="font-medium text-foreground dark:text-hero-fg">{t("periodSummary")}</span>{" "}
              {t("daysCount", { days })}{" "}
              {billingMode === "calendar_months" ? (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  온전한 {calendarMonths}개월 · 단가×{calendarMonths}
                </Badge>
              ) : billingMode === "day_preset" ? (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {presetDays}일 프리셋
                </Badge>
              ) : (
                <Badge variant="secondary" className="ml-1 text-[10px]">
                  {t("monthFactor", { n: monthFactor.toFixed(2) })}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Percent className="h-3 w-3" />
                  {t("discountPercent")}
                </label>
                <Input
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  inputMode="decimal"
                  placeholder="0"
                />
              </div>
              <div>
                <label className="mb-1 flex items-center gap-1 text-xs font-medium text-muted-foreground">
                  <Wallet className="h-3 w-3" />
                  {t("discountWon")}
                </label>
                <Input
                  value={discountWon}
                  onChange={(e) => setDiscountWon(e.target.value)}
                  inputMode="numeric"
                  placeholder="0"
                />
              </div>
            </div>

            <div>
              <span className="mb-2 block text-xs font-medium text-muted-foreground">
                {t("vatMode")}
              </span>
              <div className="flex rounded-2xl border border-slate-200 p-1">
                <button
                  type="button"
                  onClick={() => setVatIncluded(false)}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${ !vatIncluded ? "bg-hero-void text-hero-fg dark:bg-card dark:text-foreground" : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-card/10" }`}
                >
                  {t("vatExtra")}
                </button>
                <button
                  type="button"
                  onClick={() => setVatIncluded(true)}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${ vatIncluded ? "bg-hero-void text-hero-fg dark:bg-card dark:text-foreground" : "text-muted-foreground hover:bg-slate-50 dark:hover:bg-card/10" }`}
                >
                  {t("vatIncluded")}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">
                {vatIncluded ? t("vatIncludedHint") : t("vatExtraHint")}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-2xl border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-foreground dark:text-hero-fg">{t("pdfSectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("quoteNumberLabel")}
              </label>
              <Input
                value={displayQuoteNumber}
                readOnly
                className="bg-muted/40 text-xs dark:bg-card/10"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("quoteIssueDate")}
              </label>
              <Input
                type="date"
                value={issueDatePdf}
                onChange={(e) => setIssueDatePdf(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("quoteValidUntil")}
              </label>
              <Input
                type="date"
                value={validUntilPdf}
                onChange={(e) => setValidUntilPdf(e.target.value)}
              />
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("clientCompany")}
              </label>
              <Input
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder={t("clientCompanyPh")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("clientName")}
              </label>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t("clientNamePh")}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("clientPhone")}
              </label>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder={t("clientPhonePh")}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("clientEmail")}
              </label>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder={t("clientEmailPh")}
                className={cn(
                  showEmailFieldError &&
                    "border-2 border-red-500 focus-visible:ring-red-500/40 dark:border-red-400",
                )}
              />
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                {t("clientEmailHint")}
              </p>
            </div>
          </div>
          {pdfError ? (
            <p className="text-sm text-red-600">{pdfError}</p>
          ) : null}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">PDF 형식</span>
            <button
              type="button"
              onClick={() => setPdfStyle("basic")}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                pdfStyle === "basic"
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-slate-200 bg-white text-muted-foreground dark:border-white/10 dark:bg-white/5"
              }`}
            >
              카드형
            </button>
            <button
              type="button"
              onClick={() => setPdfStyle("formal")}
              className={`rounded-md border px-2.5 py-1.5 text-xs font-semibold ${
                pdfStyle === "formal"
                  ? "border-accent bg-accent/15 text-foreground"
                  : "border-slate-200 bg-white text-muted-foreground dark:border-white/10 dark:bg-white/5"
              }`}
            >
              공식 견적서 (6열·계좌)
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-border text-foreground hover:bg-muted dark:border-hero-fg dark:text-hero-fg dark:hover:bg-card/10"
              disabled={
                saveLoading ||
                pdfLoading ||
                !hasLines ||
                days <= 0 ||
                !clientCompany.trim() ||
                !clientName.trim() ||
                !clientPhone.trim()
              }
              onClick={() => {
                void saveQuote();
              }}
            >
              {saveLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {isEditMode ? t("updateQuote") : t("saveQuote")}
            </Button>
            <AdminQuoteContractActions
              label={t("createContract")}
              blockReason={canCreateContract ? null : contractBlockReason}
              canCreate={canCreateContract}
              busy={contractBusy}
              onClick={() => void openBridgeModal()}
            />
            <Button
              type="button"
              variant="outline"
              className="border-border/20 text-foreground hover:bg-muted dark:border-hero-fg/25 dark:text-hero-fg dark:hover:bg-card/10"
              disabled={
                !hasLines ||
                days <= 0 ||
                !clientCompany.trim() ||
                !clientName.trim() ||
                !clientPhone.trim()
              }
              onClick={() => setShowPreview((v) => !v)}
            >
              <Eye className="mr-2 h-4 w-4" />
              {showPreview ? "미리보기 닫기" : "미리보기"}
            </Button>
            <Button
              type="button"
              className="bg-hero-void text-hero-fg hover:bg-muted dark:border dark:border-hero-fg/20"
              disabled={
                pdfLoading ||
                saveLoading ||
                !hasLines ||
                days <= 0 ||
                !clientCompany.trim() ||
                !clientName.trim() ||
                !clientPhone.trim()
              }
              onClick={() => void downloadPdf()}
            >
              {pdfLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("pdfGenerating")}
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  {t("pdfDownload")}
                </>
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">{t("pdfFontHint")}</p>
        </CardContent>
      </Card>

      <Card className="border-accent/40 bg-gradient-to-br from-white to-accent/5 dark:from-hero-void dark:to-accent/10">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-foreground dark:text-hero-fg">{t("summaryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {!hasLines ? (
            <p className="text-sm text-muted-foreground">{t("pickMedia")}</p>
          ) : days <= 0 ? (
            <p className="text-sm text-amber-700">{t("invalidPeriod")}</p>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex justify-between gap-4 rounded-2xl border dark:bg-white/8 bg-gray-100 px-3 py-2">
                <dt className="text-muted-foreground">{t("sumSubtotal")}</dt>
                <dd className="font-semibold tabular-nums text-foreground dark:text-hero-fg">
                  {formatWon(totals.linesSubtotalWon)}
                </dd>
              </div>
              {totals.discountTotalWon > 0 ? (
                <div className="flex justify-between gap-4 rounded-2xl border dark:bg-white/8 bg-gray-100 px-3 py-2">
                  <dt className="text-muted-foreground">{t("sumDiscount")}</dt>
                  <dd className="font-semibold tabular-nums text-red-700">
                    −{formatWon(totals.discountTotalWon)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 rounded-2xl border dark:bg-white/8 bg-gray-100 px-3 py-2">
                <dt className="text-muted-foreground">{t("sumAfterDiscount")}</dt>
                <dd className="font-semibold tabular-nums text-foreground dark:text-hero-fg">
                  {formatWon(totals.afterDiscountWon)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-2xl border dark:bg-white/8 bg-gray-100 px-3 py-2">
                <dt className="text-muted-foreground">{t("sumSupply")}</dt>
                <dd className="font-semibold tabular-nums text-foreground dark:text-hero-fg">
                  {formatWon(totals.supplyWon)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-2xl border dark:bg-white/8 bg-gray-100 px-3 py-2">
                <dt className="text-muted-foreground">{t("sumVat")}</dt>
                <dd className="font-semibold tabular-nums text-foreground dark:text-hero-fg">
                  {formatWon(totals.vatWon)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-2xl border-2 border-accent/50 bg-accent/10 px-3 py-2 sm:col-span-2 lg:col-span-1 dark:bg-accent/15">
                <dt className="font-semibold text-foreground dark:text-hero-fg">{t("sumTotal")}</dt>
                <dd className="text-lg font-bold tabular-nums text-foreground dark:text-hero-fg">
                  {formatWon(totals.totalWon)}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {showPreview && hasLines && days > 0 && (
        <Card className="rounded-2xl border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg text-foreground dark:text-hero-fg">
                견적서 미리보기
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({pdfStyle === "formal" ? "공식 견적서" : "카드형"})
                </span>
              </CardTitle>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const el = document.getElementById("quote-preview");
                      if (!el) return;
                      const { captureElementAsPng } = await import(
                        "@/lib/html-to-pdf"
                      );
                      const { runWithQuotePdfExport } = await import(
                        "@/lib/quote-html-pdf"
                      );
                      await runWithQuotePdfExport(el, async () => {
                        const prefix =
                          pdfStyle === "formal" ? "formal-quote" : "quote";
                        await captureElementAsPng(el, `${prefix}-${displayQuoteNumber}.png`);
                      });
                    } catch (e) {
                      console.error("[admin-quote-new] PNG capture failed", e);
                      window.alert(
                        `이미지 캡처 실패\n${e instanceof Error ? e.message : String(e)}`,
                      );
                    }
                  }}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 dark:border-white/10 dark:bg-white/5 dark:text-hero-fg dark:hover:bg-card/10"
                >
                  <Camera className="h-4 w-4" />
                  이미지 캡처
                </button>
                <button
                  type="button"
                  onClick={() => void downloadPdf()}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted/50 dark:border-white/10 dark:bg-white/5 dark:text-hero-fg dark:hover:bg-card/10"
                >
                  <Download className="h-4 w-4" />
                  PDF 저장
                </button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-border/10 bg-slate-100/90 p-4 dark:border-hero-fg/15 dark:bg-card/5 md:p-6">
              <div className="mx-auto w-fit max-w-full" data-quote-pdf-scale-wrap>
                <div id="quote-preview">
                  {pdfStyle === "formal" ? (
                    <QuoteFormalPreview
                      {...formalPreviewParams}
                      issuer={formalQuoteIssuer}
                    />
                  ) : (
                    <QuotePdfPreview
                      template="default"
                      customerLogoSrc={null}
                      company={clientCompany}
                      contactName={clientName}
                      contactPhone={clientPhone}
                      contactEmail={clientEmail}
                      periodLabel={campaignPeriodLabel}
                      periodMonths={pdfPeriodMultiplier}
                      periodUnitLabel={pdfPeriodUnit}
                      amountUnit="won"
                      rows={lineItems.map((it) => {
                        const m = medias.find((x) => x.id === it.mediaId);
                        const size =
                          m?.width && m?.height
                            ? `${m.width}×${m.height}`
                            : m?.resolution ?? null;
                        const thumb =
                          (m?.extractedImages ?? []).find((u) => !!u?.trim()) ||
                          m?.image ||
                          null;
                        return {
                          rowKey: it.lineId,
                          id: it.mediaId,
                          thumbUrl: thumb,
                          name: it.mediaName,
                          location: m?.location ?? "—",
                          unitPriceWon: it.unitPrice,
                          lineTotalWon: it.amount,
                          size,
                          dailyFootTraffic: m?.dailyFootfall ?? null,
                          visibilityScore: m?.visibilityScore ?? null,
                          operatingHours: m?.operatingHours ?? null,
                        };
                      })}
                      subtotalWon={totals.supplyWon}
                      vatWon={totals.vatWon}
                      grandTotalWon={totals.totalWon}
                      issuedAt={new Date(issueDatePdf)}
                      quoteNumber={displayQuoteNumber}
                      validUntil={validUntilPdf}
                      linesSubtotalWon={totals.linesSubtotalWon}
                      discountTotalWon={
                        totals.discountTotalWon > 0 ? totals.discountTotalWon : undefined
                      }
                      discountSummary={discountSummary}
                      vatIncluded={vatIncluded}
                    />
                  )}
                </div>
              </div>
            </div>

            {/* 관리자용 세부 합계 (할인 포함) */}
            <div className="mx-auto mt-4 max-w-md space-y-1 rounded-2xl border bg-card p-4 text-sm dark:bg-white/5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">소계</span>
                <span className="font-semibold tabular-nums">
                  {formatWon(totals.linesSubtotalWon)}
                </span>
              </div>
              {totals.discountTotalWon > 0 && (
                <div className="flex justify-between text-red-700">
                  <span>할인</span>
                  <span className="font-semibold tabular-nums">
                    −{formatWon(totals.discountTotalWon)}
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">공급가</span>
                <span className="font-semibold tabular-nums">
                  {formatWon(totals.supplyWon)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">부가세</span>
                <span className="font-semibold tabular-nums">
                  {formatWon(totals.vatWon)}
                </span>
              </div>
              <div className="flex justify-between border-t pt-2 text-base font-bold text-foreground dark:text-hero-fg">
                <span>합계</span>
                <span className="tabular-nums">{formatWon(totals.totalWon)}</span>
              </div>
              <p className="pt-1 text-[11px] text-muted-foreground">
                견적번호 {displayQuoteNumber} · 유효기간 {validUntilPdf}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className={STICKY_ACTION_BAR_DOCK_SPACER_CLASS} aria-hidden />
      <StickyActionBar
        open
        layout="dock"
        variant="neon"
        compact
        aboveMobileChrome
        portal
        ariaLabel={isEditMode ? t("updateQuote") : t("saveQuote")}
      >
        <div className={cn(STICKY_ACTION_BAR_ROW, "max-w-4xl sm:max-w-full")}>
          <span
            className="min-w-0 flex-1 truncate text-[10px] font-medium tabular-nums text-gray-600 dark:text-white/55"
            aria-live="polite"
          >
            {hasLines ? formatWon(totals.totalWon) : t("subtitle")}
          </span>
          <button
            type="button"
            disabled={!canCreateContract || contractBusy}
            onClick={() => void openBridgeModal()}
            className={cn(
              STICKY_ACTION_BAR_BTN,
              canCreateContract && !contractBusy
                ? "border-[color:var(--qp-accent)]/50 bg-white font-bold text-[color:var(--qp-accent)] dark:border-[color:var(--qp-accent)]/50 dark:bg-white/10 dark:text-[color:var(--qp-accent)]"
                : STICKY_ACTION_BAR_BTN_IDLE,
              "font-bold",
            )}
          >
            <FileSignature className="h-3 w-3 shrink-0" aria-hidden />
            {t("createContract")}
          </button>
          <button
            type="button"
            disabled={
              saveLoading ||
              pdfLoading ||
              !hasLines ||
              days <= 0 ||
              !clientCompany.trim() ||
              !clientName.trim() ||
              !clientPhone.trim()
            }
            onClick={() => void saveQuote()}
            className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_PRIMARY, "min-w-[5.5rem]")}
          >
            {saveLoading ? (
              <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
            ) : (
              <Save className="h-3 w-3 shrink-0" aria-hidden />
            )}
            {isEditMode ? t("updateQuote") : t("saveQuote")}
          </button>
        </div>
      </StickyActionBar>
        </>
      )}

      {bridgeModalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bridge-modal-title"
        >
          <div className="w-full max-w-md rounded-2xl border bg-white p-5 shadow-xl dark:bg-hero-void">
            <h2
              id="bridge-modal-title"
              className="text-lg font-semibold text-foreground dark:text-hero-fg"
            >
              {t("createContractModalTitle")}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t("createContractModalBody")}
            </p>
            <dl className="mt-4 space-y-2 rounded-xl border bg-muted/30 p-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("clientCompany")}</dt>
                <dd className="text-right font-medium">
                  {[clientCompany.trim(), clientName.trim()]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("periodSummary")}</dt>
                <dd className="text-right font-medium">{campaignPeriodLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("sumTotal")}</dt>
                <dd className="text-right font-semibold tabular-nums">
                  {formatWon(totals.totalWon)}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    ({Math.round(totals.totalWon / 10_000).toLocaleString("ko-KR")}
                    만원)
                  </span>
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">{t("quoteNumberLabel")}</dt>
                <dd className="font-mono text-xs">{displayQuoteNumber}</dd>
              </div>
            </dl>
            {existingOohQuoteId ? (
              <p className="mt-3 text-sm text-amber-800">{t("createContractAlready")}</p>
            ) : null}
            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={bridgeLoading}
                onClick={() => setBridgeModalOpen(false)}
              >
                {t("createContractCancel")}
              </Button>
              <Button
                type="button"
                className="bg-navy text-white hover:bg-navy/90"
                disabled={bridgeLoading}
                onClick={() => void confirmCreateContract()}
              >
                {bridgeLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <FileSignature className="mr-2 h-4 w-4" />
                )}
                {existingOohQuoteId
                  ? t("createContractGoExisting")
                  : t("createContractConfirm")}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </AdminQuotePageShell>
  );
}
