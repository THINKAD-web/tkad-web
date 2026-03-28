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
import { CheckCircle, Monitor, MapPin, Calculator, Send, Download } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { mediaData, typeLabels } from "@/lib/media-data";
import Spinner from "@/components/spinner";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/toast-provider";
import jsPDF from "jspdf";

const PHONE_RE = /^[\d\-+() ]{8,}$/;

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

type FormErrors = Partial<
  Record<"name" | "phone" | "media", string>
>;

export default function QuotePage() {
  const t = useTranslations();
  const locale = useLocale();
  const isKo = locale === "ko";

  const [period, setPeriod] = useState<PeriodKey>("1month");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
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

  const selectedMedia = useMemo(
    () => mediaData.filter((m) => selectedIds.has(m.id)),
    [selectedIds]
  );

  const monthlyCost = useMemo(
    () => selectedMedia.reduce((sum, m) => sum + m.price, 0),
    [selectedMedia]
  );

  const periodMonths = PERIOD_MONTHS[period];
  const totalCost = monthlyCost * periodMonths;

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
    [isKo, t]
  );

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
      toast("warning", isKo ? "필수 항목을 모두 입력해 주세요." : "Please fill in all required fields.");
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
      toast("success", isKo ? "견적 요청이 접수되었습니다." : "Your quote request has been submitted.");
    } catch {
      toast("error", isKo ? "일시적 오류가 발생했습니다. 다시 시도해 주세요." : "An error occurred. Please try again.");
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
      const doc = new jsPDF();

      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("SINKERD 견적서", 20, 20);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(
        `발행일: ${new Date().toISOString().slice(0, 10)}`,
        20,
        30,
      );
      if (form.company || form.name) {
        doc.text(
          `고객사: ${form.company || "-"} / 담당자: ${
            form.name || "-"
          }`,
          20,
          36,
        );
      }

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("캠페인 개요", 20, 48);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const periodLabel = t(`quote.periods.${period}` as any);
      doc.text(`집행 기간: ${periodLabel}`, 20, 56);
      doc.text(
        `월 예상 집행비: ₩${monthlyCost.toLocaleString()}만원`,
        20,
        62,
      );
      doc.text(`총 예상 집행비: ₩${totalCost.toLocaleString()}만원`, 20, 68);

      let y = 80;
      doc.setFont("helvetica", "bold");
      doc.text("매체 상세", 20, y);
      y += 6;

      doc.setFontSize(10);
      doc.text("매체명", 20, y);
      doc.text("지역/위치", 90, y);
      doc.text("월 단가(만원)", 150, y, { align: "right" });
      y += 4;
      doc.setLineWidth(0.2);
      doc.line(20, y, 190, y);
      y += 5;

      doc.setFont("helvetica", "normal");
      selectedMedia.forEach((m) => {
        if (y > 270) {
          doc.addPage();
          y = 20;
        }
        const name = (isKo ? m.name : m.nameEn) || m.name;
        const loc = (isKo ? m.location : m.locationEn) || m.location;
        doc.text(name, 20, y);
        doc.text(loc, 90, y);
        doc.text(
          m.price.toLocaleString(),
          150,
          y,
          { align: "right" },
        );
        y += 6;
      });

      if (y + 16 > 280) {
        doc.addPage();
        y = 20;
      }

      y += 4;
      doc.setLineWidth(0.2);
      doc.line(20, y, 190, y);
      y += 8;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(
        `총 예상 집행비 (부가세 별도): ₩${totalCost.toLocaleString()}만원`,
        20,
        y,
      );
      y += 8;

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text(
        "※ 본 견적은 참고용으로, 실제 계약 시 매체 재고 및 세부 조건에 따라 변동될 수 있습니다.",
        20,
        y,
      );
      y += 5;
      doc.text(
        "문의: contact@sinkerd.com / 02-000-0000",
        20,
        y,
      );

      doc.save("sinkerd-quote.pdf");
      toast(
        "success",
        isKo ? "PDF 견적서를 다운로드했습니다." : "Downloaded quote PDF.",
      );
    } catch {
      toast(
        "error",
        isKo
          ? "PDF 생성 중 오류가 발생했습니다."
          : "Failed to generate PDF.",
      );
    } finally {
      setDownloading(false);
    }
  };

  return (
    <>
      <section className="bg-navy py-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold text-white sm:text-4xl">
            {t("quote.title")}
          </h1>
          <p className="mt-2 text-slate-300">{t("quote.subtitle")}</p>
        </div>
      </section>

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 lg:grid-cols-3 lg:items-start">
            <div className="lg:col-span-2">
              <Card className="shadow-md">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-xl text-navy">
                    <Monitor className="h-5 w-5 text-gold" />
                    {t("quote.selectMedia")}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {t("quote.selectMediaDesc")}
                  </p>
                </CardHeader>
                <CardContent>
                  {touched.media && errors.media ? (
                    <p className="mb-4 text-sm font-medium text-red-500">
                      {errors.media}
                    </p>
                  ) : null}
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
                                    : "border-navy/20"
                                )}
                                aria-hidden
                              >
                                {checked ? "✓" : ""}
                              </span>
                            </div>
                            <CardHeader className="pb-2">
                              <Badge
                                variant="secondary"
                                className="bg-navy/5 text-navy text-xs"
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
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-1">
              <div className="space-y-6 lg:sticky lg:top-24">
                <Card className="shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-navy">
                      {t("quote.period")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={period}
                      onChange={(e) =>
                        setPeriod(e.target.value as PeriodKey)
                      }
                      className="w-full rounded-md border px-3 py-2 text-sm"
                      aria-label={t("quote.period")}
                    >
                      <option value="1month">
                        {t("quote.periods.1month")}
                      </option>
                      <option value="3months">
                        {t("quote.periods.3months")}
                      </option>
                      <option value="6months">
                        {t("quote.periods.6months")}
                      </option>
                      <option value="12months">
                        {t("quote.periods.12months")}
                      </option>
                    </select>
                  </CardContent>
                </Card>

                <Card className="shadow-md">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-navy">
                      {t("quote.budgetRange")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
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
                  </CardContent>
                </Card>

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
                    <Button
                      type="button"
                      onClick={handleDownloadPdf}
                      disabled={downloading || selectedMedia.length === 0}
                      className="mt-4 flex w-full items-center justify-center gap-2 bg-navy text-white hover:bg-navy/90"
                    >
                      {downloading ? (
                        <>
                          <Spinner className="h-4 w-4" />
                          {isKo ? "PDF 생성 중..." : "Generating PDF..."}
                        </>
                      ) : (
                        <>
                          <Download className="h-4 w-4" />
                          {isKo
                            ? "견적서 PDF 다운로드"
                            : "Download quote PDF"}
                        </>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <Card className="shadow-md">
              <CardHeader>
                <CardTitle className="text-xl text-navy">
                  {t("quote.getQuote")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {submitted ? (
                  <div className="flex flex-col items-center gap-4 py-12 text-center">
                    <CheckCircle className="h-12 w-12 text-green-500" />
                    <p className="text-lg font-semibold text-navy">
                      {t("quote.successTitle")}
                    </p>
                    <p className="max-w-md text-muted-foreground">
                      {t("quote.successDesc")}
                    </p>
                  </div>
                ) : (
                  <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
                          onChange={(e) => updateField("name", e.target.value)}
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
                        rows={5}
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
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </>
  );
}
