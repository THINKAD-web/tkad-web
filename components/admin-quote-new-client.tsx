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
  computeAdminQuoteTotals,
  inclusiveCampaignDays,
  lineSupplyWon,
  monthFactorFromDays,
} from "@/lib/admin-quote-calc";
import { catalogPriceFieldToWon } from "@/lib/media-price-format";
import { QuotePdfPreview } from "@/components/quote-pdf-preview";
import {
  Calculator,
  Loader2,
  Search,
  Percent,
  Wallet,
  Receipt,
  FileDown,
  Save,
  Eye,
  Download,
} from "lucide-react";
import { useToast } from "@/components/toast-provider";

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

export default function AdminQuoteNewClient() {
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

  const [startDate, setStartDate] = useState(todayISODate);
  const [endDate, setEndDate] = useState(() => addMonthsISODate(todayISODate(), 1));

  const [discountPercent, setDiscountPercent] = useState("0");
  const [discountWon, setDiscountWon] = useState("0");
  const [vatIncluded, setVatIncluded] = useState(false);

  const [quoteNumber] = useState(() => {
    const ymd = todayISODate().replace(/-/g, "");
    const rnd = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `TKQ-${ymd}-${rnd}`;
  });
  const [issueDatePdf, setIssueDatePdf] = useState(todayISODate);
  const [validUntilPdf, setValidUntilPdf] = useState(() =>
    addDaysISODate(todayISODate(), 14),
  );
  const [clientCompany, setClientCompany] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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

  const lineWons = useMemo(() => {
    const out: number[] = [];
    for (const id of selected) {
      const m = medias.find((x) => x.id === id);
      if (!m) continue;
      const qty = quantities[id] ?? 1;
      out.push(lineSupplyWon(m.price, monthFactor, qty));
    }
    return out;
  }, [selected, medias, quantities, monthFactor]);

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

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setQuantities((q) => {
          const { [id]: _, ...rest } = q;
          return rest;
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

  const discountSummary = useMemo(() => {
    if (totals.discountTotalWon <= 0) return undefined;
    const parts: string[] = [];
    if (dpct > 0) parts.push(isKo ? `할인율 ${dpct}%` : `${dpct}% off`);
    if (dwon > 0) parts.push(formatWon(dwon));
    if (parts.length === 0) return undefined;
    return isKo ? `할인 (${parts.join(" · ")})` : `Discount (${parts.join(" · ")})`;
  }, [totals.discountTotalWon, dpct, dwon, isKo]);

  const lineItems = useMemo(() => {
    const list: {
      mediaId: string;
      mediaName: string;
      spec: string;
      period: string;
      unitPrice: number;
      quantity: number;
      amount: number;
    }[] = [];
    for (const id of selected) {
      const m = medias.find((x) => x.id === id);
      if (!m) continue;
      const qty = quantities[id] ?? 1;
      list.push({
        mediaId: m.id,
        mediaName: isKo ? m.name : m.nameEn || m.name,
        spec: mediaSpecLine(m),
        period: campaignPeriodLabel,
        unitPrice: catalogPriceFieldToWon(m.price),
        quantity: qty,
        amount: lineSupplyWon(m.price, monthFactor, qty),
      });
    }
    return list;
  }, [
    selected,
    medias,
    quantities,
    monthFactor,
    campaignPeriodLabel,
    isKo,
  ]);

  const pdfPostRows = useMemo(
    () =>
      lineItems.map((it) => ({
        name: it.mediaName,
        spec: it.spec,
        period: it.period,
        unitPriceWon: it.unitPrice,
        quantity: it.quantity,
        lineTotalWon: it.amount,
      })),
    [lineItems],
  );

  const saveQuote = useCallback(async () => {
    setPdfError(null);
    if (selected.size === 0) {
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
      const res = await fetch("/api/admin/quotes", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quoteNumber,
          clientName: clientNameStored,
          clientPhone: clientPhone.trim(),
          clientEmail: clientEmail.trim() || undefined,
          validUntil: validUntilPdf,
          subtotal: totals.linesSubtotalWon,
          discount: totals.discountTotalWon,
          tax: totals.vatWon,
          total: totals.totalWon,
          isKo,
          status: "draft",
          items: lineItems.map((it) => ({
            mediaId: it.mediaId,
            mediaName: it.mediaName,
            spec: it.spec === "—" ? null : it.spec,
            period: it.period,
            unitPrice: it.unitPrice,
            quantity: it.quantity,
            amount: it.amount,
          })),
        }),
      });
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
      toast("success", t("saveOk"));
    } catch (e) {
      toast("error", e instanceof Error ? e.message : t("saveFailed"));
    } finally {
      setSaveLoading(false);
    }
  }, [
    selected.size,
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
    t,
    toast,
  ]);

  const downloadPdf = useCallback(async () => {
    setPdfError(null);
    if (selected.size === 0) {
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
      // 먼저 서버 API 시도
      try {
        const res = await fetch("/api/admin/quotes/pdf", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteNumber,
            issueDate: issueDatePdf,
            validUntil: validUntilPdf,
            clientCompany: clientCompany.trim(),
            clientName: clientName.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim() || undefined,
            periodLabel: campaignPeriodLabel,
            vatIncluded,
            discountTotalWon: totals.discountTotalWon,
            discountSummary,
            rows: pdfPostRows,
            linesSubtotalWon: totals.linesSubtotalWon,
            supplyWon: totals.supplyWon,
            vatWon: totals.vatWon,
            totalWon: totals.totalWon,
            isKo,
          }),
        });
        if (res.ok) {
          const ct = res.headers.get("content-type") ?? "";
          if (ct.includes("application/pdf")) {
            const blob = await res.blob();
            if (blob.size >= 64) {
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `thinkad-quote-${quoteNumber}.pdf`;
              a.click();
              URL.revokeObjectURL(url);
              return; // 성공!
            }
          }
        }
      } catch {
        // 서버 API 실패, 클라이언트 방식 진행
      }

      // 클라이언트 사이드에서 미리보기 이미지로 PDF 생성
      const { default: html2canvas } = await import("html2canvas");
      const { jsPDF } = await import("jspdf");

      // 임시로 미리보기 표시
      setShowPreview(true);

      await new Promise((resolve) => setTimeout(resolve, 500));

      const element = document.getElementById("quote-preview");
      if (!element) throw new Error("미리보기를 찾을 수 없습니다");

      const canvas = await html2canvas(element, {
        backgroundColor: "#ffffff",
        scale: 2,
        allowTaint: true,
        useCORS: true,
      });

      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const imgWidth = 190;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

      pdf.save(`thinkad-quote-${quoteNumber}.pdf`);
      toast("success", "견적서 PDF가 다운로드되었습니다");
    } catch (e) {
      const msg = e instanceof Error ? e.message : t("pdfFailed");
      setPdfError(msg);
      toast("error", tCommon("pdfGenerationFailed"));
    } finally {
      setPdfLoading(false);
    }
  }, [
    selected.size,
    days,
    clientCompany,
    clientName,
    clientPhone,
    clientEmail,
    quoteNumber,
    issueDatePdf,
    validUntilPdf,
    campaignPeriodLabel,
    vatIncluded,
    totals,
    discountSummary,
    pdfPostRows,
    isKo,
    t,
    tCommon,
    toast,
  ]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-navy">
            <Calculator className="h-7 w-7 text-gold" />
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          <Link
            href="/admin/quotes"
            className="mt-2 inline-block text-xs font-semibold text-gold hover:text-gold-dark hover:underline"
          >
            {t("goToQuotesList")}
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg text-navy">{t("mediaTitle")}</CardTitle>
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
                {t("selectAllFiltered")}
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
                    return (
                      <tr
                        key={m.id}
                        className={`border-b border-slate-100 ${on ? "bg-gold/5" : "bg-white"}`}
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
                          <div className="font-medium text-navy">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.location} · {m.type}
                          </div>
                        </td>
                        <td className="px-2 py-2 align-middle tabular-nums">
                          {new Intl.NumberFormat("ko-KR").format(m.price)}
                          <span className="text-xs text-muted-foreground">
                            {t("perMonth")}
                          </span>
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
            <CardTitle className="flex items-center gap-2 text-lg text-navy">
              <Receipt className="h-5 w-5 text-gold" />
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
            <div className="rounded-lg border bg-slate-50 px-3 py-2 text-xs text-muted-foreground">
              <span className="font-medium text-navy">{t("periodSummary")}</span>{" "}
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
              <div className="flex rounded-lg border border-slate-200 p-1">
                <button
                  type="button"
                  onClick={() => setVatIncluded(false)}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
                    !vatIncluded
                      ? "bg-navy text-white"
                      : "text-muted-foreground hover:bg-slate-50"
                  }`}
                >
                  {t("vatExtra")}
                </button>
                <button
                  type="button"
                  onClick={() => setVatIncluded(true)}
                  className={`flex-1 rounded-md py-2 text-xs font-semibold transition-colors ${
                    vatIncluded
                      ? "bg-navy text-white"
                      : "text-muted-foreground hover:bg-slate-50"
                  }`}
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
          <CardTitle className="text-lg text-navy">{t("pdfSectionTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                {t("quoteNumberLabel")}
              </label>
              <Input value={quoteNumber} readOnly className="bg-slate-50 font-mono text-xs" />
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
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-navy text-navy hover:bg-navy/5"
              disabled={
                saveLoading ||
                pdfLoading ||
                selected.size === 0 ||
                days <= 0 ||
                !clientCompany.trim() ||
                !clientName.trim() ||
                !clientPhone.trim()
              }
              onClick={() => void saveQuote()}
            >
              {saveLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              {t("saveQuote")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="border-navy/20 text-navy hover:bg-navy/5"
              disabled={
                selected.size === 0 ||
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
              className="bg-navy text-white hover:bg-navy-light"
              disabled={
                pdfLoading ||
                saveLoading ||
                selected.size === 0 ||
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

      <Card className="border-gold/30 bg-gradient-to-br from-white to-gold/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg text-navy">{t("summaryTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          {selected.size === 0 ? (
            <p className="text-sm text-muted-foreground">{t("pickMedia")}</p>
          ) : days <= 0 ? (
            <p className="text-sm text-amber-700">{t("invalidPeriod")}</p>
          ) : (
            <dl className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex justify-between gap-4 rounded-lg border bg-white/80 px-3 py-2">
                <dt className="text-muted-foreground">{t("sumSubtotal")}</dt>
                <dd className="font-semibold tabular-nums text-navy">
                  {formatWon(totals.linesSubtotalWon)}
                </dd>
              </div>
              {totals.discountTotalWon > 0 ? (
                <div className="flex justify-between gap-4 rounded-lg border bg-white/80 px-3 py-2">
                  <dt className="text-muted-foreground">{t("sumDiscount")}</dt>
                  <dd className="font-semibold tabular-nums text-red-700">
                    −{formatWon(totals.discountTotalWon)}
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between gap-4 rounded-lg border bg-white/80 px-3 py-2">
                <dt className="text-muted-foreground">{t("sumAfterDiscount")}</dt>
                <dd className="font-semibold tabular-nums text-navy">
                  {formatWon(totals.afterDiscountWon)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-lg border bg-white/80 px-3 py-2">
                <dt className="text-muted-foreground">{t("sumSupply")}</dt>
                <dd className="font-semibold tabular-nums text-navy">
                  {formatWon(totals.supplyWon)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-lg border bg-white/80 px-3 py-2">
                <dt className="text-muted-foreground">{t("sumVat")}</dt>
                <dd className="font-semibold tabular-nums text-navy">
                  {formatWon(totals.vatWon)}
                </dd>
              </div>
              <div className="flex justify-between gap-4 rounded-lg border-2 border-gold/50 bg-gold/10 px-3 py-2 sm:col-span-2 lg:col-span-1">
                <dt className="font-semibold text-navy">{t("sumTotal")}</dt>
                <dd className="text-lg font-bold tabular-nums text-navy">
                  {formatWon(totals.totalWon)}
                </dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>

      {showPreview && selected.size > 0 && days > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-navy">견적서 미리보기</CardTitle>
              <button
                onClick={async () => {
                  try {
                    const el = document.getElementById("quote-preview");
                    if (!el) return;
                    const { downloadPdfFromHtmlElement } = await import(
                      "@/lib/html-to-pdf"
                    );
                    await downloadPdfFromHtmlElement(el, `quote-${quoteNumber}.pdf`);
                  } catch (e) {
                    console.error("[admin-quote-new] PDF download failed", e);
                    window.alert(
                      `PDF 생성 실패\n${e instanceof Error ? e.message : String(e)}`,
                    );
                  }
                }}
                className="inline-flex items-center gap-2 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-navy hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                PDF 저장
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-xl border border-navy/10 bg-slate-100/90 p-4 md:p-6">
              <div className="mx-auto w-fit max-w-full">
                <div id="quote-preview">
                  <QuotePdfPreview
                    template="default"
                    customerLogoSrc={null}
                    company={clientCompany}
                    contactName={clientName}
                    contactPhone={clientPhone}
                    contactEmail={clientEmail}
                    periodLabel={campaignPeriodLabel}
                    periodMonths={Math.max(1, Math.round(monthFactor))}
                    rows={lineItems.map((it) => {
                      const m = medias.find((x) => x.id === it.mediaId);
                      const size =
                        m?.width && m?.height
                          ? `${m.width}×${m.height}`
                          : m?.resolution ?? null;
                      return {
                        id: it.mediaId,
                        thumbUrl: m?.image ?? null,
                        name: it.mediaName,
                        location: m?.location ?? "—",
                        unitPriceMan: Math.round(it.unitPrice / 10_000),
                        lineTotalMan: Math.round(it.amount / 10_000),
                        size,
                        dailyFootTraffic: m?.dailyFootfall ?? null,
                        visibilityScore: m?.visibilityScore ?? null,
                        operatingHours: m?.operatingHours ?? null,
                      };
                    })}
                    subtotalMan={Math.round(totals.supplyWon / 10_000)}
                    vatMan={Math.round(totals.vatWon / 10_000)}
                    grandTotalMan={Math.round(totals.totalWon / 10_000)}
                    issuedAt={new Date(issueDatePdf)}
                  />
                </div>
              </div>
            </div>

            {/* 관리자용 세부 합계 (할인 포함) */}
            <div className="mx-auto mt-4 max-w-md space-y-1 rounded-lg border bg-white p-4 text-sm">
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
              <div className="flex justify-between border-t pt-2 text-base font-bold text-navy">
                <span>합계</span>
                <span className="tabular-nums">{formatWon(totals.totalWon)}</span>
              </div>
              <p className="pt-1 text-[11px] text-muted-foreground">
                견적번호 {quoteNumber} · 유효기간 {validUntilPdf}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
