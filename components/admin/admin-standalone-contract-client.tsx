"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import {
  Eye,
  FileDown,
  FileSignature,
  FileUp,
  Loader2,
  Mail,
  Plus,
  Search,
  Upload,
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
import { useAdminMediaPickerList } from "@/hooks/use-admin-media-picker-list";
import { catalogPriceFieldToWon } from "@/lib/pricing";
import { formatPricePeriodShortLabel } from "@/lib/media-price-format";
import { wonToManwon } from "@/lib/ooh-quote-amount";
import {
  newStandaloneContractDraftId,
  type StandaloneContractDraft,
  STANDALONE_CONTRACT_DRAFT_VERSION,
} from "@/lib/standalone-contract";
import {
  readAdminApiError,
  readAdminApiErrorDetail,
} from "@/lib/admin-api-error";
import { cn } from "@/lib/utils";

function uploadApiErrorMessage(code: string, t: (k: string) => string): string {
  switch (code) {
    case "contract_pdf_storage_not_configured":
      return t("uploadErrStorageNotConfigured");
    case "bunny_upload_failed":
      return t("uploadErrBunnyUpload");
    case "cloudinary_not_configured":
      return t("uploadErrCloudinaryNotConfigured");
    case "cloudinary_upload_failed":
      return t("uploadErrCloudinaryUpload");
    case "pdf_only":
    case "not_pdf":
      return t("uploadErrPdfOnly");
    case "invalid_pdf_size":
      return t("uploadErrPdfSize");
    case "missing_file":
      return t("uploadErrMissingFile");
    default:
      return code;
  }
}

function sendUploadApiErrorMessage(code: string, t: (k: string) => string): string {
  switch (code) {
    case "upload_fetch_failed":
    case "upload_pdf_unreachable":
      return t("sendUploadErrPdfFetch");
    case "upload_sha_mismatch":
      return t("sendUploadErrShaMismatch");
    case "MEDIA_REQUIRED":
      return t("sendEsignMediaRequired");
    case "DATES_REQUIRED":
      return t("sendUploadErrDatesRequired");
    case "validation_failed":
      return t("sendUploadErrValidation");
    default:
      return code;
  }
}

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
  const router = useRouter();
  const locale = useLocale();
  const isKo = locale === "ko";

  const [draftId] = useState(() => newStandaloneContractDraftId());
  const [clientCompany, setClientCompany] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientRepName, setClientRepName] = useState("");
  const [clientAddress, setClientAddress] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [productionCost, setProductionCost] = useState("자체제작");
  const [mediaCount, setMediaCount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("계산서 발행 후 선결제");
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

  const {
    medias,
    search,
    setSearch,
    listLoading,
    listError,
    filtered,
  } = useAdminMediaPickerList({ loadErrorMessage: t("loadError") });

  const [pageTab, setPageTab] = useState<"compose" | "upload">("compose");
  const [uploadMode, setUploadMode] = useState<
    "uploaded_esign" | "uploaded_attachment"
  >("uploaded_esign");
  const [uploadedPdf, setUploadedPdf] = useState<{
    uploadedPdfUrl: string;
    uploadedPdfSha256: string;
    uploadedPdfFileName: string;
  } | null>(null);
  const [uploadBusy, setUploadBusy] = useState(false);
  const [localPdfUrl, setLocalPdfUrl] = useState<string | null>(null);
  const localPdfUrlRef = useRef<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [sendBusy, setSendBusy] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  const periodLabel = useMemo(
    () => `${startDate} ~ ${endDate}`,
    [startDate, endDate],
  );

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
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StandaloneContractDraft;
      if (
        parsed.version !== STANDALONE_CONTRACT_DRAFT_VERSION &&
        parsed.version !== 1
      ) {
        return;
      }
      setClientCompany(parsed.clientCompany ?? "");
      setClientName(parsed.clientName ?? "");
      setClientRepName(parsed.clientRepName ?? "");
      setClientAddress(parsed.clientAddress ?? "");
      setClientPhone(parsed.clientPhone ?? "");
      setCampaignName(parsed.campaignName ?? "");
      setProductionCost(parsed.productionCost ?? "자체제작");
      setMediaCount(parsed.mediaCount ?? "");
      setPaymentMethod(parsed.paymentMethod ?? "계산서 발행 후 선결제");
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
      clientRepName,
      clientAddress,
      clientPhone,
      campaignName,
      productionCost,
      mediaCount,
      paymentMethod,
      clientEmail: clientEmail.trim() || "",
      mediaIds: selectedMedia.map((m) => m.id),
      mediaLines: selectedMedia.map((m) => m.label),
      period: periodLabel,
      startDate,
      endDate,
      totalAmountManwon: manwon,
      specialTerms: specialTerms.trim() || null,
      locale: isKo ? "ko" : "en",
      download: false,
      createdAt: new Date().toISOString(),
      linkedOoHQuoteId: null,
    };
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(draft));
  }, [
    campaignName,
    clientAddress,
    clientCompany,
    clientEmail,
    clientName,
    clientPhone,
    clientRepName,
    draftId,
    endDate,
    isKo,
    mediaCount,
    paymentMethod,
    periodLabel,
    productionCost,
    selectedMedia,
    specialTerms,
    startDate,
    totalAmountManwon,
  ]);

  const buildPayload = useCallback(() => {
    const manwon = Math.max(1, parseInt(totalAmountManwon, 10) || 0);
    return {
      draftId,
      clientCompany: clientCompany.trim(),
      clientName: clientName.trim(),
      clientRepName: clientRepName.trim(),
      clientAddress: clientAddress.trim(),
      clientPhone: clientPhone.trim(),
      campaignName: campaignName.trim(),
      productionCost: productionCost.trim(),
      mediaCount:
        mediaCount.trim() ||
        (selectedMedia.length > 0 ? `${selectedMedia.length}기` : ""),
      paymentMethod: paymentMethod.trim(),
      clientEmail: clientEmail.trim() || "",
      mediaLines: selectedMedia.map((m) => m.label),
      period: periodLabel,
      startDate,
      endDate,
      totalAmountManwon: manwon,
      specialTerms: specialTerms.trim() || null,
      locale: isKo ? "ko" : "en",
    };
  }, [
    campaignName,
    clientAddress,
    clientCompany,
    clientEmail,
    clientName,
    clientPhone,
    clientRepName,
    draftId,
    endDate,
    isKo,
    mediaCount,
    paymentMethod,
    periodLabel,
    productionCost,
    selectedMedia,
    specialTerms,
    startDate,
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

  const revokeLocalPdfUrl = useCallback(() => {
    if (localPdfUrlRef.current) {
      URL.revokeObjectURL(localPdfUrlRef.current);
      localPdfUrlRef.current = null;
    }
    setLocalPdfUrl(null);
  }, []);

  useEffect(() => () => revokeLocalPdfUrl(), [revokeLocalPdfUrl]);

  const onPickUploadPdf = useCallback(
    async (file: File) => {
      setUploadBusy(true);
      try {
        const fd = new FormData();
        fd.set("file", file);
        const res = await fetch("/api/admin/contracts/upload-pdf", {
          method: "POST",
          credentials: "include",
          body: fd,
        });
        const raw: unknown = await res.json().catch(() => ({}));
        if (!res.ok) {
          const code = readAdminApiError(raw, "upload_failed");
          const detail = readAdminApiErrorDetail(raw);
          let base = uploadApiErrorMessage(code, t);
          if (
            detail &&
            /cloud_name is disabled/i.test(detail)
          ) {
            base = t("uploadErrCloudinaryDisabled");
          }
          const showDetail =
            detail &&
            (code === "bunny_upload_failed" ||
              (code === "cloudinary_upload_failed" &&
                !/cloud_name is disabled/i.test(detail)));
          throw new Error(showDetail ? `${base} (${detail})` : base);
        }
        const url =
          typeof raw === "object" &&
          raw !== null &&
          "uploadedPdfUrl" in raw &&
          typeof (raw as { uploadedPdfUrl?: unknown }).uploadedPdfUrl ===
            "string"
            ? (raw as { uploadedPdfUrl: string }).uploadedPdfUrl
            : "";
        const sha =
          typeof raw === "object" &&
          raw !== null &&
          "uploadedPdfSha256" in raw &&
          typeof (raw as { uploadedPdfSha256?: unknown }).uploadedPdfSha256 ===
            "string"
            ? (raw as { uploadedPdfSha256: string }).uploadedPdfSha256
            : "";
        const name =
          typeof raw === "object" &&
          raw !== null &&
          "uploadedPdfFileName" in raw &&
          typeof (raw as { uploadedPdfFileName?: unknown })
            .uploadedPdfFileName === "string"
            ? (raw as { uploadedPdfFileName: string }).uploadedPdfFileName
            : file.name;
        if (!url || !sha) throw new Error(t("sendUploadFail"));
        setUploadedPdf({
          uploadedPdfUrl: url,
          uploadedPdfSha256: sha,
          uploadedPdfFileName: name,
        });
        revokeLocalPdfUrl();
        const blobUrl = URL.createObjectURL(file);
        localPdfUrlRef.current = blobUrl;
        setLocalPdfUrl(blobUrl);
        toast("success", t("uploadPdfReady", { name }));
      } catch (e) {
        toast("error", e instanceof Error ? e.message : t("sendUploadFail"));
      } finally {
        setUploadBusy(false);
      }
    },
    [revokeLocalPdfUrl, t, toast],
  );

  const postUploadSend = useCallback(
    async (force: boolean) => {
      setSubmitAttempted(true);
      if (!clientName.trim()) {
        toast("error", t("errClientName"));
        return;
      }
      if (!clientEmail.trim()) {
        toast("error", t("sendEsignEmailRequired"));
        return;
      }
      if (!isValidOptionalEmail(clientEmail)) {
        toast("error", t("errClientEmailFormat"));
        return;
      }
      if (!uploadedPdf) {
        toast("error", t("uploadPdfMissing"));
        return;
      }
      if (uploadMode === "uploaded_esign") {
        if (selectedMedia.length === 0) {
          toast("error", t("sendEsignMediaRequired"));
          return;
        }
        if (!startDate || !endDate) {
          toast("error", t("sendEsignFail"));
          return;
        }
      } else if (selectedMedia.length > 0 && (!startDate || !endDate)) {
        toast("error", t("sendEsignFail"));
        return;
      }

      const manwon = parseInt(totalAmountManwon, 10);
      setSendBusy(true);
      try {
        const res = await fetch("/api/admin/contracts/send-from-upload", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: uploadMode,
            ...uploadedPdf,
            clientName: clientName.trim(),
            clientCompany: clientCompany.trim(),
            clientPhone: clientPhone.trim(),
            clientEmail: clientEmail.trim(),
            locale: isKo ? "ko" : "en",
            mediaIds: selectedMedia.map((m) => m.id),
            startDate: startDate || undefined,
            endDate: endDate || undefined,
            totalAmountManwon:
              Number.isFinite(manwon) && manwon > 0 ? manwon : undefined,
            force,
          }),
        });
        const raw: unknown = await res.json().catch(() => ({}));
        if (res.status === 409) {
          const code =
            typeof raw === "object" &&
            raw !== null &&
            "code" in raw &&
            (raw as { code?: unknown }).code === "BOOKING_CONFLICT";
          if (code && !force && window.confirm(t("sendEsignConflictConfirm"))) {
            await postUploadSend(true);
            return;
          }
        }
        if (!res.ok) {
          const code = readAdminApiError(raw, "send_failed");
          const msg = sendUploadApiErrorMessage(code, t);
          throw new Error(msg === code ? t("sendUploadFail") : msg);
        }
        const emailed =
          typeof raw === "object" &&
          raw !== null &&
          "emailed" in raw &&
          (raw as { emailed?: unknown }).emailed === true;
        toast("success", t("sendUploadOk"));
        if (!emailed) toast("error", t("sendEsignEmailSkipped"));
        router.push("/admin/contracts");
      } catch (e) {
        toast("error", e instanceof Error ? e.message : t("sendUploadFail"));
      } finally {
        setSendBusy(false);
      }
    },
    [
      clientCompany,
      clientEmail,
      clientName,
      clientPhone,
      endDate,
      isKo,
      router,
      selectedMedia,
      startDate,
      t,
      toast,
      totalAmountManwon,
      uploadMode,
      uploadedPdf,
    ],
  );

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

  const postSend = useCallback(
    async (force: boolean) => {
      setSubmitAttempted(true);
      if (!clientName.trim()) {
        toast("error", t("errClientName"));
        return;
      }
      if (!totalAmountManwon.trim() || parseInt(totalAmountManwon, 10) <= 0) {
        toast("error", t("errAmount"));
        return;
      }
      if (!clientEmail.trim()) {
        toast("error", t("sendEsignEmailRequired"));
        return;
      }
      if (!isValidOptionalEmail(clientEmail)) {
        toast("error", t("errClientEmailFormat"));
        return;
      }
      if (selectedMedia.length === 0) {
        toast("error", t("sendEsignMediaRequired"));
        return;
      }

      setSendBusy(true);
      try {
        persistDraft();
        const res = await fetch("/api/admin/contracts/send-from-standalone", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...buildPayload(),
            mediaIds: selectedMedia.map((m) => m.id),
            force,
          }),
        });
        const raw: unknown = await res.json().catch(() => ({}));
        if (res.status === 409) {
          const code =
            typeof raw === "object" &&
            raw !== null &&
            "code" in raw &&
            (raw as { code?: unknown }).code === "BOOKING_CONFLICT";
          if (code && !force && window.confirm(t("sendEsignConflictConfirm"))) {
            await postSend(true);
            return;
          }
        }
        if (!res.ok) {
          const msg =
            typeof raw === "object" &&
            raw !== null &&
            "error" in raw &&
            typeof (raw as { error?: unknown }).error === "string"
              ? (raw as { error: string }).error
              : t("sendEsignFail");
          throw new Error(msg);
        }
        const emailed =
          typeof raw === "object" &&
          raw !== null &&
          "emailed" in raw &&
          (raw as { emailed?: unknown }).emailed === true;
        toast("success", t("sendEsignOk"));
        if (!emailed) {
          toast("error", t("sendEsignEmailSkipped"));
        }
        router.push("/admin/contracts");
      } catch (e) {
        toast("error", e instanceof Error ? e.message : t("sendEsignFail"));
      } finally {
        setSendBusy(false);
      }
    },
    [
      buildPayload,
      clientEmail,
      clientName,
      persistDraft,
      router,
      selectedMedia,
      t,
      toast,
      totalAmountManwon,
    ],
  );

  const onSendEsign = useCallback(() => void postSend(false), [postSend]);

  const addMedia = (m: AdminMediaDto) => {
    if (selectedMedia.some((s) => s.id === m.id)) return;
    const label = (isKo ? m.name : m.nameEn) || m.name;
    setSelectedMedia((prev) => {
      const next = [...prev, { id: m.id, label }];
      if (!mediaCount.trim()) {
        setMediaCount(`${next.length}기`);
      }
      return next;
    });
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
              className="text-[color:var(--qp-accent)] hover:underline dark:text-[color:var(--qp-accent)]"
            >
              {t("backToList")}
            </Link>
            <span className="font-mono text-muted-foreground">{draftId}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        <Button
          type="button"
          size="sm"
          variant={pageTab === "compose" ? "default" : "outline"}
          onClick={() => setPageTab("compose")}
        >
          {t("tabCompose")}
        </Button>
        <Button
          type="button"
          size="sm"
          variant={pageTab === "upload" ? "default" : "outline"}
          onClick={() => setPageTab("upload")}
        >
          <Upload className="mr-1 h-3.5 w-3.5" />
          {t("tabUpload")}
        </Button>
      </div>

      {pageTab === "upload" ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className={cn(adminQuoteSectionCard, "lg:col-span-2")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("tabUpload")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("uploadHint")}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={
                    uploadMode === "uploaded_esign" ? "default" : "outline"
                  }
                  onClick={() => setUploadMode("uploaded_esign")}
                >
                  {t("uploadModeEsign")}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={
                    uploadMode === "uploaded_attachment" ? "default" : "outline"
                  }
                  onClick={() => setUploadMode("uploaded_attachment")}
                >
                  {t("uploadModeAttachment")}
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {uploadMode === "uploaded_esign"
                  ? t("uploadModeEsignHint")
                  : t("uploadModeAttachmentHint")}
              </p>
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-input px-4 py-3 text-sm hover:bg-muted/30">
                <FileUp className="h-4 w-4" />
                {uploadBusy ? t("uploadBusy") : t("uploadPickPdf")}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="sr-only"
                  disabled={uploadBusy}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void onPickUploadPdf(f);
                    e.target.value = "";
                  }}
                />
              </label>
              {uploadedPdf ? (
                <p className="text-xs font-medium text-foreground">
                  {t("uploadPdfReady", {
                    name: uploadedPdf.uploadedPdfFileName,
                  })}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className={cn(adminQuoteSectionCard, "lg:col-span-2")}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("sectionParties")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("clientName")} *
                </span>
                <Input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder={t("clientNamePh")}
                />
              </label>
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
                  {t("clientEmail")} *
                </span>
                <Input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder={t("clientEmailPh")}
                />
              </label>
              {uploadMode === "uploaded_esign" ||
              selectedMedia.length > 0 ? (
                <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
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
              ) : null}
              <label className="space-y-1 text-sm sm:col-span-2">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("totalAmountManwon")}
                </span>
                <Input
                  type="number"
                  min={1}
                  value={totalAmountManwon}
                  onChange={(e) => setTotalAmountManwon(e.target.value)}
                  placeholder="5000"
                />
              </label>
            </CardContent>
          </Card>

          <Card className={adminQuoteSectionCard}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("sectionMedia")}</CardTitle>
              {uploadMode === "uploaded_esign" ? (
                <p className="text-xs text-red-600">{t("sendEsignMediaRequired")}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  {t("uploadModeAttachmentHint")}
                </p>
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
              ) : (
                <table className="w-full text-sm">
                  <tbody>
                    {filtered.slice(0, 80).map((m) => {
                      const picked = selectedMedia.some((s) => s.id === m.id);
                      return (
                        <tr key={m.id} className={adminQuoteTableRowClass}>
                          <td className="px-3 py-2 font-medium">{m.name}</td>
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

          {localPdfUrl ? (
            <Card className={adminQuoteSectionCard}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{t("uploadPreviewLocal")}</CardTitle>
              </CardHeader>
              <CardContent>
                <iframe
                  title={t("uploadPreviewLocal")}
                  src={localPdfUrl}
                  className="h-[min(480px,60vh)] w-full rounded-xl border border-gray-200 bg-white dark:border-white/10"
                />
              </CardContent>
            </Card>
          ) : null}
        </div>
      ) : null}

      {pageTab === "compose" ? (
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
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {t("clientRepName")}
              </span>
              <Input
                value={clientRepName}
                onChange={(e) => setClientRepName(e.target.value)}
                placeholder={t("clientRepNamePh")}
              />
            </label>
            <label className="space-y-1 text-sm sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">
                {t("clientAddress")}
              </span>
              <Input
                value={clientAddress}
                onChange={(e) => setClientAddress(e.target.value)}
                placeholder={t("clientAddressPh")}
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {t("clientPhone")}
              </span>
              <Input
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
                placeholder={t("clientPhonePh")}
              />
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
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {t("campaignName")}
              </span>
              <Input
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder={t("campaignNamePh")}
              />
            </label>
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
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("productionCost")}
                </span>
                <Input
                  value={productionCost}
                  onChange={(e) => setProductionCost(e.target.value)}
                  placeholder={t("productionCostPh")}
                />
              </label>
              <label className="space-y-1 text-sm">
                <span className="text-xs font-medium text-muted-foreground">
                  {t("mediaCount")}
                </span>
                <Input
                  value={mediaCount}
                  onChange={(e) => setMediaCount(e.target.value)}
                  placeholder={t("mediaCountPh")}
                />
              </label>
            </div>
            <label className="block space-y-1 text-sm">
              <span className="text-xs font-medium text-muted-foreground">
                {t("paymentMethod")}
              </span>
              <Input
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder={t("paymentMethodPh")}
              />
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
      ) : null}

      {pageTab === "compose" && previewOpen && previewUrl ? (
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
        <div
          className={cn(
            STICKY_ACTION_BAR_ROW,
            "max-w-4xl flex-wrap px-4 sm:px-6",
          )}
        >
          {pageTab === "compose" ? (
            <>
              <Button
                type="button"
                disabled={pdfBusy || sendBusy}
                className={cn(
                  STICKY_ACTION_BAR_BTN,
                  STICKY_ACTION_BAR_BTN_IDLE,
                  "min-w-[7rem] flex-1",
                )}
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
                disabled={pdfBusy || sendBusy}
                className={cn(
                  STICKY_ACTION_BAR_BTN,
                  STICKY_ACTION_BAR_BTN_IDLE,
                  "min-w-[7rem] flex-1",
                )}
                onClick={() => void onDownload()}
              >
                {pdfBusy ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <FileDown className="mr-1 h-3.5 w-3.5" />
                )}
                {t("downloadPdf")}
              </Button>
              <Button
                type="button"
                disabled={pdfBusy || sendBusy}
                className={cn(
                  STICKY_ACTION_BAR_BTN,
                  STICKY_ACTION_BAR_BTN_PRIMARY,
                  "min-w-[7rem] flex-1",
                )}
                onClick={onSendEsign}
              >
                {sendBusy ? (
                  <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Mail className="mr-1 h-3.5 w-3.5" />
                )}
                {t("sendEsign")}
              </Button>
            </>
          ) : (
            <Button
              type="button"
              disabled={sendBusy || uploadBusy}
              className={cn(
                STICKY_ACTION_BAR_BTN,
                STICKY_ACTION_BAR_BTN_PRIMARY,
                "min-w-[10rem] flex-1",
              )}
              onClick={() => void postUploadSend(false)}
            >
              {sendBusy ? (
                <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Mail className="mr-1 h-3.5 w-3.5" />
              )}
              {uploadMode === "uploaded_esign"
                ? t("sendUploadEsign")
                : t("sendUploadAttachment")}
            </Button>
          )}
        </div>
      </StickyActionBar>
    </AdminQuotePageShell>
  );
}
