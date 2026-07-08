"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Eye,
  FileDown,
  FileSignature,
  Loader2,
  Plus,
  Search,
  X,
} from "lucide-react";
import {
  AdminQuotePageShell,
  adminQuoteSectionCard,
  adminQuoteSurfaceMutedClass,
  adminQuoteTableRowClass,
} from "@/components/admin/admin-quote-page-shell";
import {
  STICKY_ACTION_BAR_BTN,
  STICKY_ACTION_BAR_BTN_IDLE,
  STICKY_ACTION_BAR_BTN_PRIMARY,
  STICKY_ACTION_BAR_DOCK_SPACER_CLASS,
  STICKY_ACTION_BAR_ROW,
  StickyActionBar,
} from "@/components/sticky-action-bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/toast-provider";
import {
  parseAdminMediaListFromApiJson,
  type AdminMediaDto,
} from "@/lib/admin-media-dto";
import { catalogPriceFieldToWon } from "@/lib/pricing";
import { formatPricePeriodShortLabel } from "@/lib/media-price-format";
import { wonToManwon } from "@/lib/ooh-quote-amount";
import {
  newStandaloneContractDraftId,
  type StandaloneContractDraft,
  STANDALONE_CONTRACT_DRAFT_VERSION,
} from "@/lib/standalone-contract";
import { cn } from "@/lib/utils";

const DRAFT_STORAGE_KEY = "tkad-admin-standalone-contract-draft-v1";

function isValidOptionalEmail(value: string): boolean {
  const v = value.trim();
  if (!v) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function fieldErrorClass(show: boolean) {
  return show
    ? "border-2 border-red-500 focus-visible:ring-red-500/40 dark:border-red-400"
    : undefined;
}

function todayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDaysISODate(iso: string, days: number): string {
  const [y, mo, da] = iso.split("-").map(Number);
  const d = new Date(y, mo - 1, da + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addMonthsISODate(iso: string, months: number): string {
  const [y, mo, da] = iso.split("-").map(Number);
  const d = new Date(y, mo - 1 + months, da);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function AdminStandaloneContractClient() {
  const t = useTranslations("adminStandaloneContract");
  const { toast } = useToast();
  const locale = useLocale();
  const isKo = locale === "ko";

  const [draftId] = useState(() => newStandaloneContractDraftId());
  const [clientCompany, setClientCompany] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [startDate, setStartDate] = useState(todayISODate);
  const [endDate, setEndDate] = useState(() =>
    addDaysISODate(addMonthsISODate(todayISODate(), 1), -1),
  );
  const [totalAmountManwon, setTotalAmountManwon] = useState("");
  const [specialTerms, setSpecialTerms] = useState("");
  const [selectedMedia, setSelectedMedia] = useState<
    { id: string; label: string }[]
  >([]);

  const [medias, setMedias] = useState<AdminMediaDto[]>([]);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const periodLabel = useMemo(
    () => `${startDate} ~ ${endDate}`,
    [startDate, endDate],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return medias;
    return medias.filter(
      (m) =>
        m.name.toLowerCase().includes(q) ||
        (m.nameEn?.toLowerCase().includes(q) ?? false) ||
        m.location.toLowerCase().includes(q) ||
        m.region.toLowerCase().includes(q),
    );
  }, [medias, search]);

  const mediaSumManwon = useMemo(() => {
    let sumWon = 0;
    for (const sel of selectedMedia) {
      const m = medias.find((x) => x.id === sel.id);
      if (!m) continue;
      const raw = m.priceOptions?.[0]?.price ?? m.price;
      sumWon += catalogPriceFieldToWon(raw);
    }
    return sumWon > 0 ? wonToManwon(sumWon) : 0;
  }, [selectedMedia, medias]);

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
          if (!cancelled) setListError(t("loadError"));
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
        if (!cancelled) setListError(t("loadError"));
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StandaloneContractDraft;
      if (parsed.version !== STANDALONE_CONTRACT_DRAFT_VERSION) return;
      setClientCompany(parsed.clientCompany ?? "");
      setClientName(parsed.clientName ?? "");
      setClientEmail(parsed.clientEmail ?? "");
      if (parsed.period?.includes("~")) {
        const [a, b] = parsed.period.split("~").map((s) => s.trim());
        if (a) setStartDate(a);
        if (b) setEndDate(b);
      }
      setTotalAmountManwon(String(parsed.totalAmountManwon ?? ""));
      setSpecialTerms(parsed.specialTerms ?? "");
      if (parsed.mediaIds?.length && parsed.mediaLines?.length) {
        setSelectedMedia(
          parsed.mediaIds.map((id, i) => ({
            id,
            label: parsed.mediaLines[i] ?? id,
          })),
        );
      }
    } catch {
      /* ignore corrupt draft */
    }
  }, []);

  const persistDraft = useCallback(() => {
    const manwon = Math.max(1, parseInt(totalAmountManwon, 10) || 0);
    const draft: StandaloneContractDraft = {
      version: STANDALONE_CONTRACT_DRAFT_VERSION,
      draftId,
      clientCompany,
      clientName,
      clientEmail: clientEmail.trim() || "",
      mediaIds: selectedMedia.map((m) => m.id),
      mediaLines: selectedMedia.map((m) => m.label),
      period: periodLabel,
      totalAmountManwon: manwon,
      specialTerms: specialTerms.trim() || null,
      locale: isKo ? "ko" : "en",
      download: false,
      createdAt: new Date().toISOString(),
      linkedOoHQuoteId: null,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [
    clientCompany,
    clientEmail,
    clientName,
    draftId,
    isKo,
    periodLabel,
    selectedMedia,
    specialTerms,
    totalAmountManwon,
  ]);

  const buildPayload = useCallback(() => {
    const manwon = Math.max(1, parseInt(totalAmountManwon, 10) || 0);
    return {
      draftId,
      clientCompany: clientCompany.trim(),
      clientName: clientName.trim(),
      clientEmail: clientEmail.trim() || "",
      mediaLines: selectedMedia.map((m) => m.label),
      period: periodLabel,
      totalAmountManwon: manwon,
      specialTerms: specialTerms.trim() || null,
      locale: isKo ? "ko" : "en",
    };
  }, [
    clientCompany,
    clientEmail,
    clientName,
    draftId,
    isKo,
    periodLabel,
    selectedMedia,
    specialTerms,
    totalAmountManwon,
  ]);

  const fieldErrors = useMemo(() => {
    const errors: {
      clientName?: string;
      clientEmail?: string;
      totalAmountManwon?: string;
    } = {};
    if (!clientName.trim()) {
      errors.clientName = t("errClientName");
    }
    if (clientEmail.trim() && !isValidOptionalEmail(clientEmail)) {
      errors.clientEmail = t("errClientEmailFormat");
    }
    if (!totalAmountManwon.trim() || parseInt(totalAmountManwon, 10) <= 0) {
      errors.totalAmountManwon = t("errAmount");
    }
    return errors;
  }, [clientEmail, clientName, totalAmountManwon, t]);

  const validationError = useMemo(() => {
    const first = Object.values(fieldErrors)[0];
    return first ?? null;
  }, [fieldErrors]);

  const showClientNameError = submitAttempted && Boolean(fieldErrors.clientName);
  const showClientEmailError = submitAttempted && Boolean(fieldErrors.clientEmail);
  const showAmountError = submitAttempted && Boolean(fieldErrors.totalAmountManwon);

  const revokePreviewUrl = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
  }, []);

  useEffect(() => () => revokePreviewUrl(), [revokePreviewUrl]);

  const fetchPdf = useCallback(
    async (download: boolean) => {
      setSubmitAttempted(true);
      if (validationError) {
        toast("error", validationError);
        return null;
      }
      setPdfBusy(true);
      try {
        persistDraft();
        const res = await fetch("/api/admin/contracts/preview", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...buildPayload(), download }),
        });
        if (!res.ok) {
          const raw: unknown = await res.json().catch(() => ({}));
          const msg =
            typeof raw === "object" &&
            raw !== null &&
            "error" in raw &&
            typeof (raw as { error?: unknown }).error === "string"
              ? (raw as { error: string }).error
              : t("pdfFailed");
          throw new Error(msg);
        }
        return await res.blob();
      } catch (e) {
        toast("error", e instanceof Error ? e.message : t("pdfFailed"));
        return null;
      } finally {
        setPdfBusy(false);
      }
    },
    [buildPayload, persistDraft, t, toast, validationError],
  );

  const onPreview = useCallback(async () => {
    const blob = await fetchPdf(false);
    if (!blob) return;
    revokePreviewUrl();
    const url = URL.createObjectURL(blob);
    previewUrlRef.current = url;
    setPreviewUrl(url);
    setPreviewOpen(true);
  }, [fetchPdf, revokePreviewUrl]);

  const onDownload = useCallback(async () => {
    const blob = await fetchPdf(true);
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `thinkad-contract-${draftId.slice(-8).toLowerCase()}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    toast("success", t("downloadOk"));
  }, [draftId, fetchPdf, t, toast]);

  const addMedia = (m: AdminMediaDto) => {
    if (selectedMedia.some((s) => s.id === m.id)) return;
    const label = (isKo ? m.name : m.nameEn) || m.name;
    setSelectedMedia((prev) => [...prev, { id: m.id, label }]);
    if (!totalAmountManwon.trim() && mediaSumManwon === 0) {
      const raw = m.priceOptions?.[0]?.price ?? m.price;
      setTotalAmountManwon(String(wonToManwon(catalogPriceFieldToWon(raw))));
    }
  };

  const applyMediaSum = () => {
    if (mediaSumManwon > 0) setTotalAmountManwon(String(mediaSumManwon));
  };

  return (
    <AdminQuotePageShell className="pb-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-foreground">
            <FileSignature className="h-7 w-7 text-accent" />
            <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("pipelineHint")}</p>
          <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
            <Link
              href="/admin/contracts"
              className="text-violet-700 hover:underline dark:text-violet-300"
            >
              {t("backToList")}
            </Link>
            <span className="font-mono text-muted-foreground">{draftId}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className={cn(adminQuoteSectionCard, "lg:col-span-2")}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("sectionParties")}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {t("clientCompany")}
              </span>
              <Input
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                placeholder={t("clientCompanyPh")}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {t("clientName")} *
              </span>
              <Input
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder={t("clientNamePh")}
                aria-invalid={showClientNameError || undefined}
                className={cn(fieldErrorClass(showClientNameError))}
              />
              {showClientNameError ? (
                <p className="text-xs font-medium text-red-600" role="alert">
                  {fieldErrors.clientName}
                </p>
              ) : null}
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("clientEmail")}
              </span>
              <Input
                type="email"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                placeholder={t("clientEmailPh")}
                aria-invalid={showClientEmailError || undefined}
                className={cn(fieldErrorClass(showClientEmailError))}
              />
              <p className="text-[11px] leading-snug text-muted-foreground">
                {t("clientEmailHint")}
              </p>
              {showClientEmailError ? (
                <p className="text-xs font-medium text-red-600" role="alert">
                  {fieldErrors.clientEmail}
                </p>
              ) : null}
            </label>
          </CardContent>
        </Card>

        <Card className={adminQuoteSectionCard}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("sectionPeriodAmount")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("startDate")}
                </span>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("endDate")}
                </span>
                <Input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </label>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("periodPreview")}: {periodLabel}
            </p>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {t("totalAmountManwon")} *
              </span>
              <Input
                type="number"
                min={1}
                value={totalAmountManwon}
                onChange={(e) => setTotalAmountManwon(e.target.value)}
                placeholder="5000"
                aria-invalid={showAmountError || undefined}
                className={cn(fieldErrorClass(showAmountError))}
              />
              {showAmountError ? (
                <p className="text-xs font-medium text-red-600" role="alert">
                  {fieldErrors.totalAmountManwon}
                </p>
              ) : null}
              {mediaSumManwon > 0 ? (
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="h-auto px-0 text-xs"
                  onClick={applyMediaSum}
                >
                  {t("useMediaSum", { amount: mediaSumManwon.toLocaleString("ko-KR") })}
                </Button>
              ) : null}
            </label>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {t("specialTerms")}
              </span>
              <textarea
                rows={4}
                value={specialTerms}
                onChange={(e) => setSpecialTerms(e.target.value)}
                placeholder={t("specialTermsPh")}
                className="w-full rounded-xl border border-input bg-white px-3 py-2 text-sm leading-relaxed text-foreground dark:bg-white/5 dark:text-hero-fg"
              />
            </label>
          </CardContent>
        </Card>

        <Card className={adminQuoteSectionCard}>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t("sectionMedia")}</CardTitle>
            {selectedMedia.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {selectedMedia.map((m) => (
                  <Badge
                    key={m.id}
                    variant="secondary"
                    className="gap-1 pr-1 font-normal"
                  >
                    {m.label}
                    <button
                      type="button"
                      className="rounded p-0.5 hover:bg-muted"
                      onClick={() =>
                        setSelectedMedia((prev) => prev.filter((x) => x.id !== m.id))
                      }
                      aria-label={t("removeMedia")}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">{t("mediaEmpty")}</p>
            )}
            <div className="relative mt-3">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("searchMedia")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className={`max-h-[min(360px,40vh)] overflow-auto p-0 ${adminQuoteSurfaceMutedClass}`}>
            {listLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("loading")}
              </div>
            ) : listError ? (
              <p className="p-4 text-sm text-red-600">{listError}</p>
            ) : (
              <table className="w-full text-sm">
                <tbody>
                  {filtered.slice(0, 80).map((m) => {
                    const picked = selectedMedia.some((s) => s.id === m.id);
                    const rawPrice = m.priceOptions?.[0]?.price ?? m.price;
                    const period = m.priceOptions?.[0]?.period ?? "month";
                    return (
                      <tr key={m.id} className={adminQuoteTableRowClass}>
                        <td className="px-3 py-2">
                          <div className="font-medium">{m.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {m.location}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-xs tabular-nums">
                          {new Intl.NumberFormat("ko-KR").format(
                            catalogPriceFieldToWon(rawPrice),
                          )}
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            {formatPricePeriodShortLabel(period, locale)}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right">
                          <Button
                            type="button"
                            size="sm"
                            variant={picked ? "secondary" : "outline"}
                            disabled={picked}
                            onClick={() => addMedia(m)}
                          >
                            <Plus className="mr-1 h-3 w-3" />
                            {picked ? t("added") : t("add")}
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
      </div>

      {previewOpen && previewUrl ? (
        <Card className={adminQuoteSectionCard}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">{t("previewTitle")}</CardTitle>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setPreviewOpen(false)}
            >
              {t("closePreview")}
            </Button>
          </CardHeader>
          <CardContent>
            <iframe
              title={t("previewTitle")}
              src={previewUrl}
              className="h-[min(640px,70vh)] w-full rounded-xl border border-gray-200 bg-white dark:border-white/10 dark:bg-white/5"
            />
          </CardContent>
        </Card>
      ) : null}

      <div className={STICKY_ACTION_BAR_DOCK_SPACER_CLASS} aria-hidden />

      <StickyActionBar open ariaLabel={t("stickyLabel")} layout="dock" portal>
        <div className={cn(STICKY_ACTION_BAR_ROW, "max-w-3xl px-4 sm:px-6")}>
          <Button
            type="button"
            disabled={pdfBusy}
            className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_IDLE, "flex-1")}
            onClick={() => void onPreview()}
          >
            {pdfBusy ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <Eye className="mr-1 h-3.5 w-3.5" />
            )}
            {t("previewPdf")}
          </Button>
          <Button
            type="button"
            disabled={pdfBusy}
            className={cn(STICKY_ACTION_BAR_BTN, STICKY_ACTION_BAR_BTN_PRIMARY, "flex-1")}
            onClick={() => void onDownload()}
          >
            {pdfBusy ? (
              <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
            ) : (
              <FileDown className="mr-1 h-3.5 w-3.5" />
            )}
            {t("downloadPdf")}
          </Button>
        </div>
      </StickyActionBar>
    </AdminQuotePageShell>
  );
}
