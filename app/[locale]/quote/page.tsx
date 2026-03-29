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
  Monitor,
  MapPin,
  Calculator,
  Send,
  Download,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  LayoutTemplate,
  ImagePlus,
  Trash2,
  Mail,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { mediaData, typeLabels } from "@/lib/media-data";
import Spinner from "@/components/spinner";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import {
  saveQuotePdf,
  quotePdfToBase64,
  type QuoteTemplateId,
  type BuildQuotePdfParams,
} from "@/lib/build-quote-pdf";

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

export default function QuotePage() {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";

  const [step, setStep] = useState<WizardStep>(1);
  const [period, setPeriod] = useState<PeriodKey>("1month");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const mediaQueryApplied = useRef(false);
  const [template, setTemplate] = useState<QuoteTemplateId>("default");
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [emailHoneypot, setEmailHoneypot] = useState("");

  useEffect(() => {
    if (mediaQueryApplied.current) return;
    if (typeof window === "undefined") return;
    const raw = new URLSearchParams(window.location.search).get("media");
    if (!raw) return;
    mediaQueryApplied.current = true;
    const ids = raw
      .split(",")
      .map((x) => parseInt(x, 10))
      .filter((n) => Number.isFinite(n) && mediaData.some((m) => m.id === n));
    if (ids.length > 0) setSelectedIds(new Set(ids));
  }, []);

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
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [emailPdfLoading, setEmailPdfLoading] = useState(false);

  const selectedMedia = useMemo(
    () => mediaData.filter((m) => selectedIds.has(m.id)),
    [selectedIds],
  );

  const monthlyCost = useMemo(
    () => selectedMedia.reduce((sum, m) => sum + m.price, 0),
    [selectedMedia],
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

  const pdfParams: BuildQuotePdfParams = useMemo(
    () => ({
      template,
      logoDataUrl,
      isKo,
      company: form.company,
      name: form.name,
      periodLabel,
      budgetMin: budgetMinN,
      budgetMax: budgetMaxN,
      monthlyCost,
      totalCost,
      rows: selectedMedia.map((m) => ({
        name: (isKo ? m.name : m.nameEn) || m.name,
        location: (isKo ? m.location : m.locationEn) || m.location,
        price: m.price,
      })),
    }),
    [
      template,
      logoDataUrl,
      isKo,
      form.company,
      form.name,
      periodLabel,
      budgetMinN,
      budgetMaxN,
      monthlyCost,
      totalCost,
      selectedMedia,
    ],
  );

  const toggleMedia = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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
  };

  const goPrev = () => setStep((s) => (s > 1 ? ((s - 1) as WizardStep) : s));

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
        }),
      });
      if (!res.ok) throw new Error("submit failed");
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
      await saveQuotePdf(pdfParams, "thinkad-quote.pdf");
      toast("success", t("quote.pdfDownloaded"));
    } catch {
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
      const pdfBase64 = await quotePdfToBase64(pdfParams);
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
    } catch {
      toast("error", t("quote.pdfEmailFail"));
    } finally {
      setEmailPdfLoading(false);
    }
  };

  return (
    <>
      <section className="bg-navy py-28">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("quote.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("quote.subtitle")}</p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-400">
            {t("quote.wizardSubtitle")}
          </p>
        </div>
      </section>

      <section className="py-10">
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
                        return;
                      }
                      if (selectedMedia.length === 0) {
                        toast("warning", t("quote.noMediaSelected"));
                        return;
                      }
                      setStep(n);
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

          <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
            <div className="lg:col-span-2">
              <Card className="min-h-[320px] shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-navy">
                    <Monitor className="h-5 w-5 text-gold" />
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
                      <div className="grid gap-6 sm:grid-cols-2">
                        {mediaData.map((media) => {
                          const checked = selectedIds.has(media.id);
                          const typeLabel = typeLabels[media.type];
                          return (
                            <label
                              key={media.id}
                              className="block cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                className="peer sr-only"
                                checked={checked}
                                onChange={() => toggleMedia(media.id)}
                              />
                              <Card
                                className={cn(
                                  "h-full overflow-hidden border-2 transition-all hover:shadow-md",
                                  "peer-checked:border-gold peer-checked:ring-2 peer-checked:ring-gold/20",
                                )}
                              >
                                <div className="relative flex h-32 items-center justify-center bg-gradient-to-br from-navy/5 to-navy/10">
                                  <Monitor className="h-9 w-9 text-navy/20" />
                                  <span
                                    className={cn(
                                      "absolute right-2.5 top-2.5 flex h-5 w-5 items-center justify-center rounded border-2 bg-white text-xs",
                                      checked
                                        ? "border-gold bg-gold text-navy"
                                        : "border-navy/20",
                                    )}
                                    aria-hidden
                                  >
                                    {checked ? "✓" : ""}
                                  </span>
                                </div>
                                <CardHeader className="pb-2">
                                  <Badge
                                    variant="secondary"
                                    className="bg-navy/5 text-xs text-navy"
                                  >
                                    {isKo ? typeLabel.ko : typeLabel.en}
                                  </Badge>
                                  <CardTitle className="pt-1 text-base leading-snug">
                                    {isKo ? media.name : media.nameEn}
                                  </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                  <div className="flex items-start gap-1 text-sm text-muted-foreground">
                                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                                    <span>
                                      {isKo ? media.location : media.locationEn}
                                    </span>
                                  </div>
                                  <div className="text-lg font-bold text-navy">
                                    ₩{media.price.toLocaleString()}
                                    <span className="text-xs font-normal text-muted-foreground">
                                      만원 {t("quote.perMonth")}
                                    </span>
                                  </div>
                                </CardContent>
                              </Card>
                            </label>
                          );
                        })}
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
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-navy">
                            {t("quote.budgetMin")}
                          </label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            placeholder="0"
                            value={form.budgetMin}
                            onChange={(e) =>
                              updateField("budgetMin", e.target.value)
                            }
                          />
                        </div>
                        <div>
                          <label className="mb-1.5 block text-xs font-medium text-navy">
                            {t("quote.budgetMax")}
                          </label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            placeholder="0"
                            value={form.budgetMax}
                            onChange={(e) =>
                              updateField("budgetMax", e.target.value)
                            }
                          />
                        </div>
                      </div>
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
                    <div className="mt-8 flex flex-wrap justify-between gap-3 border-t border-navy/10 pt-6">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={goPrev}
                        disabled={step === 1}
                        className="border-navy/20"
                      >
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        {t("quote.prevStep")}
                      </Button>
                      {step < 4 ? (
                        <Button
                          type="button"
                          onClick={goNext}
                          className="bg-gold font-bold text-navy hover:bg-gold-dark"
                        >
                          {t("quote.nextStep")}
                          <ChevronRight className="ml-1 h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-6 lg:sticky lg:top-24">
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
                          만원 {t("quote.perMonth")}
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
                          <span className="text-xs font-normal text-muted-foreground">
                            만원
                          </span>
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
    </>
  );
}
