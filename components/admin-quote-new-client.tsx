"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Link } from "@/i18n/navigation";
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
import { formatPricePeriodShortLabel, normalizeMediaPricePeriod } from "@/lib/media-price-format";
import { QuotePdfPreview } from "@/components/quote-pdf-preview";
import { QuoteFormalPreview } from "@/components/quote/quote-formal-preview";
import { buildAdminFormalQuoteParamsFromDraft } from "@/lib/admin-sales-quote";
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
  Trash2,
  Sparkles,
} from "lucide-react";
import {
  inferVatIncludedFromQuote,
  parseCampaignPeriodLabel,
  parseStoredClientName,
  splitQuoteItemsForForm,
} from "@/lib/admin-quote-hydrate";
import type { QuoteApi } from "@/lib/admin-sales-quote";

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

function addMonthsISODate(iso: string, months: number): string {
  const [y, mo, da] = iso.split("-").map(Number);
  const d = new Date(y, mo - 1 + months, da);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function addDaysISODate(iso: string, days: number): string {
  const [y, mo, da] = iso.split("-").map(Number);
  const d = new Date(y, mo - 1, da + days);
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function mediaSpecLine(m: AdminMediaDto): string {
  const wh =
    m.width && m.height ? `${m.width}×${m.height}` : m.width || m.height || "";
  const bits = [m.resolution, wh].filter(Boolean);
  return bits.length > 0 ? bits.join(" · ") : "—";
}

export default function AdminQuoteNewClient({ quoteId }: { quoteId?: string }) {
  const t = useTranslations("adminQuoteNew");
  const tCommon = useTranslations("common");
  const { toast } = useToast();
  const locale = useLocale();
  const isKo = locale === "ko";
  const [medias, setMedias] = useState<AdminMediaDto[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  /** 커스텀 라인(제작비·디자인비·운영비 등 수기 입력) */
  type CustomLine = { id: string; name: string; quantity: number; unitPriceWon: number };
  const [customLines, setCustomLines] = useState<CustomLine[]>([]);

  const [startDate, setStartDate] = useState(todayISODate);
  // NOTE: 일수(포함) 기반으로 월 환산(days/30)을 쓰기 때문에,
  // 기본값을 "+1개월 동일 일자"로 두면 31일이 되어 1.03개월로 계산되는 경우가 잦습니다.
  // 기본은 "30일(포함)"이 되도록 종료일을 하루 당겨 설정합니다.
  const [endDate, setEndDate] = useState(() =>
    addDaysISODate(addMonthsISODate(todayISODate(), 1), -1),
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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setListLoading(true);
      setListError(null);
      try {
        const res = await fetch("/api/admin/medias?take=500", {
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

        const knownMediaIds = new Set(medias.map((m) => m.id));
        const split = splitQuoteItemsForForm(quote, knownMediaIds);

        if (!cancelled) {
          setQuoteNumber(quote.quoteNumber);
          setClientCompany(company);
          setClientName(contact);
          setClientPhone(quote.clientPhone ?? "");
          setClientEmail(quote.clientEmail ?? "");
          setValidUntilPdf(quote.validUntil.slice(0, 10));
          setIssueDatePdf(quote.createdAt.slice(0, 10));
          if (parsedPeriod) {
            setStartDate(parsedPeriod.startDate);
            setEndDate(parsedPeriod.endDate);
          }
          setDiscountPercent("0");
          setDiscountWon(String(quote.discount));
          setVatIncluded(inferVatIncludedFromQuote(quote));
          setSelected(new Set(split.selectedIds));
          setQuantities(split.quantities);
          setCustomLines(split.customLines);
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

  const start = useMemo(() => new Date(`${startDate}T12:00:00`), [startDate]);
  const end = useMemo(() => new Date(`${endDate}T12:00:00`), [endDate]);
  const days = useMemo(() => inclusiveCampaignDays(start, end), [start, end]);
  const monthFactor = useMemo(() => monthFactorFromDays(days), [days]);

  type PeriodKey = "month" | "biweekly" | "week" | "day";
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

  /** 매체별 priceOptions 선택 인덱스 (없으면 0) */
  const [mediaPriceOptionIndex, setMediaPriceOptionIndex] = useState<Record<string, number>>({});

  const selectedPrice = useCallback(
    (m: AdminMediaDto) => {
      const idx = mediaPriceOptionIndex[m.id] ?? 0;
      const opt = m.priceOptions?.[idx];
      const rawPrice = opt?.price ?? m.price;
      const period = normalizeMediaPricePeriod(opt?.period);
      return { rawPrice, period: period as PeriodKey, label: opt?.label ?? null };
    },
    [mediaPriceOptionIndex],
  );

  const lineWons = useMemo(() => {
    const out: number[] = [];
    for (const id of selected) {
      const m = medias.find((x) => x.id === id);
      if (!m) continue;
      const qty = quantities[id] ?? 1;
      const { rawPrice, period } = selectedPrice(m);
      const unitWon = catalogPriceFieldToWon(rawPrice);
      const factor = factorForPeriod(period, days);
      out.push(Math.round(unitWon * factor * Math.max(0, qty)));
    }
    for (const c of customLines) {
      const amount = Math.max(0, Math.round(c.unitPriceWon * Math.max(1, c.quantity)));
      if (amount > 0) out.push(amount);
    }
    return out;
  }, [selected, medias, quantities, days, factorForPeriod, selectedPrice, customLines]);

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

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setQuantities((q) => {
          return Object.fromEntries(
            Object.entries(q).filter(([key]) => key !== id),
          );
        });
      } else {
        next.add(id);
        setQuantities((q) => ({ ...q, [id]: q[id] ?? 1 }));
      }
      return next;
    });
  }, []);

  const setQty = useCallback((id: string, value: string) => {
    const n = Math.max(0, parseInt(value.replace(/\D/g, ""), 10) || 0);
    setQuantities((q) => ({ ...q, [id]: Math.max(1, n || 1) }));
  }, []);

  const selectAllVisible = useCallback(() => {
    setQuantities((q) => {
      const next = { ...q };
      for (const m of filtered) {
        next[m.id] = next[m.id] ?? 1;
      }
      return next;
    });
    setSelected((prev) => {
      const next = new Set(prev);
      for (const m of filtered) next.add(m.id);
      return next;
    });
  }, [filtered]);

  const clearSelection = useCallback(() => {
    setSelected(new Set());
    setQuantities({});
  }, []);

  const campaignPeriodLabel = useMemo(
    () => `${startDate} ~ ${endDate}`,
    [startDate, endDate],
  );

  const lineItems = useMemo(() => {
    const list: {
      mediaId: string;
      mediaName: string;
      spec: string;
      period: string;
      unitPrice: number;
      unitPeriod: PeriodKey;
      quantity: number;
      amount: number;
    }[] = [];
    for (const id of selected) {
      const m = medias.find((x) => x.id === id);
      if (!m) continue;
      const qty = quantities[id] ?? 1;
      const { rawPrice, period, label } = selectedPrice(m);
      const unitWon = catalogPriceFieldToWon(rawPrice);
      const factor = factorForPeriod(period, days);
      const nameBase = isKo ? m.name : (m.nameEn || m.name) || m.name;
      const name = label ? `${nameBase} (${label})` : nameBase;
      list.push({
        mediaId: m.id,
        mediaName: name,
        spec: mediaSpecLine(m),
        period: campaignPeriodLabel,
        unitPrice: unitWon,
        unitPeriod: period,
        quantity: qty,
        amount: Math.round(unitWon * factor * Math.max(0, qty)),
      });
    }
    for (const c of customLines) {
      const qty = Math.max(1, c.quantity);
      const unit = Math.max(0, Math.round(c.unitPriceWon));
      const amount = Math.round(unit * qty);
      if (amount <= 0 && !c.name.trim()) continue;
      list.push({
        mediaId: `custom-${c.id}`,
        mediaName: c.name.trim() || (isKo ? "기타 비용" : "Other cost"),
        spec: "—",
        period: campaignPeriodLabel,
        unitPrice: unit,
        unitPeriod: "month",
        quantity: qty,
        amount,
      });
    }
    return list;
  }, [
    selected,
    medias,
    quantities,
    campaignPeriodLabel,
    isKo,
    customLines,
    days,
    factorForPeriod,
    selectedPrice,
  ]);

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
          spec: it.spec,
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
    const periods = new Set<PeriodKey>();
    for (const it of lineItems) {
      if (!it.mediaId.startsWith("custom-")) periods.add(it.unitPeriod);
    }
    if (periods.size !== 1) return Math.max(1, Math.round(monthFactor));
    const only = [...periods][0];
    if (only === "month") return Math.max(1, Math.round(monthFactor));
    return Math.max(1, Math.round(factorForPeriod(only, days)));
  }, [lineItems, days, monthFactor, factorForPeriod]);

  const saveQuote = useCallback(async () => {
    setPdfError(null);
    if (selected.size === 0 && customLines.length === 0) {
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
      const saved = raw as { quote?: { quoteNumber?: string } };
      if (saved.quote?.quoteNumber) setQuoteNumber(saved.quote.quoteNumber);
      toast("success", isEditMode ? t("updateOk") : t("saveOk"));
    } catch (e) {
      toast("error", e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaveLoading(false);
    }
  }, [
    selected.size,
    customLines.length,
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
    t,
    toast,
  ]);

  const downloadPdf = useCallback(async (style: "basic" | "formal" = pdfStyle) => {
    setPdfError(null);
    if (selected.size === 0 && customLines.length === 0) {
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
              spec: it.spec,
              quantity: it.quantity,
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
    selected.size,
    customLines.length,
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
    <div className="mx-auto max-w-6xl space-y-6">
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
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-foreground dark:text-hero-fg">{t("mediaTitle")}</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="mt-2 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAllVisible}>
                {t("selectAllVisible")}
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={clearSelection}>
                {t("clearSelection")}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="max-h-[min(520px,55vh)] overflow-auto rounded-lg border bg-slate-50/50 p-0">
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
                <thead className="sticky top-0 z-10 bg-white shadow-sm">
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th className="w-10 px-3 py-2" />
                    <th className="px-2 py-2">{t("colMedia")}</th>
                    <th className="w-24 px-2 py-2">{t("colPrice")}</th>
                    <th className="w-28 px-2 py-2">{t("colQty")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((m) => {
                    const on = selected.has(m.id);
                    const qty = quantities[m.id] ?? 1;
                    const { rawPrice, period } = selectedPrice(m);
                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-slate-100 ${on ? "bg-accent/10 dark:bg-accent/20" : "bg-white dark:bg-hero-void"}`}
                      >
                        <td className="px-3 py-2 align-middle">
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() => toggle(m.id)}
                            className="h-4 w-4 rounded border-slate-300"
                          />
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <div className="font-medium text-foreground dark:text-hero-fg">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.location} · {m.type}
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle tabular-nums">
                          {on && (m.priceOptions?.length ?? 0) > 0 ? (
                            <div className="space-y-1">
                              <select
                                className="w-full rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                                value={mediaPriceOptionIndex[m.id] ?? 0}
                                onChange={(e) => {
                                  const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                                  setMediaPriceOptionIndex((prev) => ({
                                    ...prev,
                                    [m.id]: n,
                                  }));
                                }}
                              >
                                {(m.priceOptions ?? []).map((o, i) => (
                                  <option key={`${o.label}-${i}`} value={i}>
                                    {o.label} ·{" "}
                                    {new Intl.NumberFormat("ko-KR").format(
                                      catalogPriceFieldToWon(o.price),
                                    )}
                                    {formatPricePeriodShortLabel(o.period ?? "month", locale)}
                                  </option>
                                ))}
                              </select>
                              <div className="text-[11px] font-semibold text-foreground dark:text-hero-fg">
                                {new Intl.NumberFormat("ko-KR").format(
                                  catalogPriceFieldToWon(rawPrice),
                                )}
                                <span className="ml-1 text-[10px] text-muted-foreground">
                                  {formatPricePeriodShortLabel(period, locale)}
                                </span>
                              </div>
                            </div>
                          ) : (
                            <>
                              {new Intl.NumberFormat("ko-KR").format(
                                catalogPriceFieldToWon(rawPrice),
                              )}
                              <span className="text-xs text-muted-foreground">
                                {" "}
                                {formatPricePeriodShortLabel(period, locale)}
                              </span>
                            </>
                          )}
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <Input
                            className="h-8 w-20 text-right text-xs"
                            disabled={!on}
                            value={on ? String(qty) : ""}
                            onChange={(e) => setQty(m.id, e.target.value)}
                            inputMode="numeric"
                          />
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
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>
            <div className="rounded-2xl border bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground dark:text-hero-fg">{t("periodSummary")}</span>{" "}
              {t("daysCount", { days })}{" "}
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {t("monthFactor", { n: monthFactor.toFixed(2) })}
              </Badge>
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

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-foreground dark:text-hero-fg">
            <Sparkles className="h-5 w-5 text-accent" />
            추가 비용 항목 (제작비·디자인비·운영비 등)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            매체 광고비 외에 견적서에 포함할 비용을 자유롭게 추가하세요.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {customLines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-muted-foreground">
              아직 추가된 항목이 없습니다. 아래 ‘항목 추가’를 눌러 입력하세요.
            </p>
          ) : (
            <div className="space-y-2">
              {customLines.map((line) => (
                <div
                  key={line.id}
                  className="grid items-center gap-2 rounded-2xl border border-slate-200 bg-white p-2 sm:grid-cols-[1fr_120px_140px_auto] sm:p-3"
                >
                  <Input
                    value={line.name}
                    onChange={(e) =>
                      setCustomLines((arr) =>
                        arr.map((c) =>
                          c.id === line.id ? { ...c, name: e.target.value } : c,
                        ),
                      )
                    }
                    placeholder="예) 제작비, 디자인 시안비, 운영 관리비"
                    className="text-sm"
                  />
                  <div>
                    <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                      수량
                    </label>
                    <Input
                      type="number"
                      min={1}
                      value={String(line.quantity)}
                      onChange={(e) => {
                        const n = Math.max(1, parseInt(e.target.value, 10) || 1);
                        setCustomLines((arr) =>
                          arr.map((c) =>
                            c.id === line.id ? { ...c, quantity: n } : c,
                          ),
                        );
                      }}
                      className="h-9 text-right text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-0.5 block text-[10px] font-medium text-muted-foreground">
                      단가 (원)
                    </label>
                    <Input
                      type="number"
                      min={0}
                      value={String(line.unitPriceWon)}
                      onChange={(e) => {
                        const n = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setCustomLines((arr) =>
                          arr.map((c) =>
                            c.id === line.id ? { ...c, unitPriceWon: n } : c,
                          ),
                        );
                      }}
                      placeholder="0"
                      className="h-9 text-right text-sm tabular-nums"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2 sm:flex-col sm:items-end">
                    <span className="text-sm font-bold tabular-nums text-foreground dark:text-hero-fg">
                      {formatWon(
                        Math.round(
                          Math.max(0, line.unitPriceWon) *
                            Math.max(1, line.quantity),
                        ),
                      )}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-red-600"
                      onClick={() =>
                        setCustomLines((arr) =>
                          arr.filter((c) => c.id !== line.id),
                        )
                      }
                      aria-label="항목 삭제"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-dashed border-border/30 text-foreground hover:bg-muted dark:border-hero-fg/30 dark:text-hero-fg dark:hover:bg-card/10"
              onClick={() =>
                setCustomLines((arr) => [
                  ...arr,
                  {
                    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                    name: "",
                    quantity: 1,
                    unitPriceWon: 0,
                  },
                ])
              }
            >
              <Plus className="mr-1 h-3.5 w-3.5" />
              항목 추가
            </Button>
            {[
              { name: "제작비", price: 500000 },
              { name: "디자인 시안비", price: 300000 },
              { name: "운영·관리비", price: 200000 },
              { name: "출력·시공비", price: 800000 },
            ].map((preset) => (
              <Button
                key={preset.name}
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground hover:text-foreground dark:text-hero-fg"
                onClick={() =>
                  setCustomLines((arr) => [
                    ...arr,
                    {
                      id: `c-${Date.now()}-${Math.random()
                        .toString(36)
                        .slice(2, 6)}`,
                      name: preset.name,
                      quantity: 1,
                      unitPriceWon: preset.price,
                    },
                  ])
                }
              >
                + {preset.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
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
                className="bg-slate-50 text-xs"
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
              />
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
                  : "border-slate-200 bg-white text-muted-foreground"
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
                  : "border-slate-200 bg-white text-muted-foreground"
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
                (selected.size === 0 && customLines.length === 0) ||
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
            <Button
              type="button"
              variant="outline"
              className="border-border/20 text-foreground hover:bg-muted dark:border-hero-fg/25 dark:text-hero-fg dark:hover:bg-card/10"
              disabled={
                (selected.size === 0 && customLines.length === 0) ||
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
                (selected.size === 0 && customLines.length === 0) ||
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
          {selected.size === 0 && customLines.length === 0 ? (
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

      {showPreview && (selected.size > 0 || customLines.length > 0) && days > 0 && (
        <Card>
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
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-foreground dark:text-hero-fg hover:bg-slate-50"
                >
                  <Camera className="h-4 w-4" />
                  이미지 캡처
                </button>
                <button
                  type="button"
                  onClick={() => void downloadPdf()}
                  className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-foreground dark:text-hero-fg hover:bg-slate-50"
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
                    <QuoteFormalPreview {...formalPreviewParams} />
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
            <div className="mx-auto mt-4 max-w-md space-y-1 rounded-2xl border bg-white p-4 text-sm">
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
        </>
      )}
    </div>
  );
}
