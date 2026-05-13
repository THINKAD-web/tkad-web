"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle, MessageCircle } from "lucide-react";
import { BtnBlock } from "@/components/brutalist";
import { useToast } from "@/components/toast-provider";
import Spinner from "@/components/spinner";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { getMediaById, type MediaItem } from "@/lib/media-data";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";

type InquiryTypeCode = "media" | "campaign" | "quote" | "other";
type BudgetCode = "under_10m" | "10m_50m" | "50m_100m" | "over_100m";

type FormFields = {
  name: string;
  phone: string;
  inquiryType: InquiryTypeCode | "";
  budget: BudgetCode | "";
  message: string;
  website: string;
};

type FormErrors = Partial<Record<keyof FormFields, string>>;

const PHONE_RE = /^[\d\-+() ]{8,}$/;
const CASE_CUID_RE = /^c[a-z0-9]{24,}$/i;

function validate(form: FormFields): FormErrors {
  const errors: FormErrors = {};
  if (!form.name.trim()) errors.name = "required";
  if (!form.phone.trim()) {
    errors.phone = "required";
  } else if (!PHONE_RE.test(form.phone)) {
    errors.phone = "format";
  }
  if (!form.inquiryType) errors.inquiryType = "required";
  if (!form.budget) errors.budget = "required";
  if (!form.message.trim()) errors.message = "required";
  return errors;
}

export default function ContactInquiryForm() {
  const t = useTranslations("contact");
  const tForm = useTranslations("contactForm");
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const caseSlug = searchParams.get("case");
  const [publishedCaseRef, setPublishedCaseRef] = useState<{
    id: string;
    titleKo: string;
    titleEn: string | null;
  } | null>(null);
  const casePrefillDone = useRef<string | null>(null);
  const academyTopic = searchParams.get("topic") === "academy";
  const academyPrefillDone = useRef(false);
  const mediaIdParam = searchParams.get("media");
  const mediaPrefillDone = useRef(false);

  const [form, setForm] = useState<FormFields>({
    name: "",
    phone: "",
    inquiryType: "",
    budget: "",
    message: "",
    website: "",
  });
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<
    Partial<Record<keyof FormFields, boolean>>
  >({});
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const isProductionDomain =
    typeof window !== "undefined" &&
    (window.location.hostname === "tkad.co.kr" ||
      window.location.hostname === "www.tkad.co.kr");
  const turnstileEnabled = isProductionDomain && !!siteKey;
  const showTurnstileHint = isProductionDomain && !turnstileEnabled;

  useEffect(() => {
    casePrefillDone.current = null;
  }, [caseSlug]);

  useEffect(() => {
    academyPrefillDone.current = false;
  }, [academyTopic]);

  useEffect(() => {
    mediaPrefillDone.current = false;
  }, [mediaIdParam]);

  useEffect(() => {
    if (!mediaIdParam || mediaPrefillDone.current) return;
    const idKey = mediaIdParam.trim();
    if (!idKey) return;

    const applySnippet = (refMedia: MediaItem) => {
      mediaPrefillDone.current = true;
      const title = isKo ? refMedia.name : (refMedia.nameEn || refMedia.name);
      const snippet = isKo
        ? `매체 "${title}" (ID ${refMedia.id}) 관련 문의드립니다.\n`
        : `Inquiry regarding media "${title}" (ID ${refMedia.id}).\n`;
      setForm((prev) => {
        if (prev.message.trim() !== "") return prev;
        return { ...prev, message: snippet };
      });
    };

    const fromStatic = getMediaById(idKey);
    if (fromStatic) {
      applySnippet(fromStatic);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/public/media-catalog");
        if (!res.ok || cancelled) return;
        const catalog = (await res.json()) as MediaItem[];
        const refMedia = catalog.find((m) => m.id === idKey);
        if (!refMedia || cancelled) return;
        applySnippet(refMedia);
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mediaIdParam, isKo]);

  useEffect(() => {
    if (!caseSlug || !CASE_CUID_RE.test(caseSlug)) {
      setPublishedCaseRef(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/public/success-cases/${caseSlug}`);
        if (!res.ok || cancelled) {
          if (!cancelled) setPublishedCaseRef(null);
          return;
        }
        const j = (await res.json()) as {
          id: string;
          titleKo: string;
          titleEn: string | null;
        };
        if (!cancelled) setPublishedCaseRef(j);
      } catch {
        if (!cancelled) setPublishedCaseRef(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseSlug]);

  useEffect(() => {
    if (!publishedCaseRef) return;
    if (casePrefillDone.current === publishedCaseRef.id) return;
    casePrefillDone.current = publishedCaseRef.id;
    const title = isKo
      ? publishedCaseRef.titleKo
      : publishedCaseRef.titleEn ?? publishedCaseRef.titleKo;
    const snippet = t("caseRefMessageTemplate", { title });
    setForm((prev) => {
      if (prev.message.trim() !== "") return prev;
      return { ...prev, message: snippet };
    });
  }, [publishedCaseRef, isKo, t]);

  useEffect(() => {
    if (caseSlug || !academyTopic || academyPrefillDone.current) return;
    academyPrefillDone.current = true;
    const snippet = t("academyRefMessageTemplate");
    setForm((prev) => {
      if (prev.message.trim() !== "") return prev;
      return { ...prev, message: snippet };
    });
  }, [caseSlug, academyTopic, t]);

  useEffect(() => {
    if (submitted || !turnstileEnabled || !turnstileRef.current) return;

    const mountEl = turnstileRef.current;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !mountEl || !window.turnstile) return;
      if (turnstileWidgetId.current) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch {
          /* ignore */
        }
        turnstileWidgetId.current = null;
      }
      mountEl.innerHTML = "";
      const id = window.turnstile.render(mountEl, {
        sitekey: siteKey,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
      turnstileWidgetId.current = id;
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const existing = document.querySelector(
        'script[src="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
      );
      if (existing) {
        existing.addEventListener("load", renderWidget, { once: true });
      } else {
        const script = document.createElement("script");
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
        script.async = true;
        script.defer = true;
        script.onload = renderWidget;
        document.body.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      if (turnstileWidgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch {
          /* ignore */
        }
        turnstileWidgetId.current = null;
      }
      if (mountEl) mountEl.innerHTML = "";
    };
  }, [siteKey, submitted, turnstileEnabled]);

  const updateField = useCallback((field: keyof FormFields, value: string) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      setErrors((prevErrors) => {
        const fieldErrors = validate(next);
        return { ...prevErrors, [field]: fieldErrors[field] };
      });
      return next;
    });
  }, []);

  const handleBlur = useCallback(
    (field: keyof FormFields) => {
      setTouched((prev) => ({ ...prev, [field]: true }));
      const fieldErrors = validate(form);
      setErrors((prev) => ({ ...prev, [field]: fieldErrors[field] }));
    },
    [form],
  );

  const fieldError = (field: keyof FormFields) => {
    if (!touched[field] || !errors[field]) return null;
    const key = errors[field];
    if (key === "format" && field === "phone") {
      return (
        <p className="mt-1 text-xs font-medium text-red-500">
          {tForm("errors.phoneFormat")}
        </p>
      );
    }
    return (
      <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">
        {`// `}{tForm(`errors.${field}` as "errors.name")}
      </p>
    );
  };

  const inputErrorClass = (field: keyof FormFields) =>
    touched[field] && errors[field] ? "border-destructive" : "";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const allTouched: Partial<Record<keyof FormFields, boolean>> = {};
    for (const key of Object.keys(form) as (keyof FormFields)[]) {
      allTouched[key] = true;
    }
    setTouched(allTouched);

    const validationErrors = validate(form);
    setErrors(validationErrors);

    if (Object.keys(validationErrors).length > 0) {
      toast("warning", tForm("toastValidation"));
      return;
    }

    if (turnstileEnabled && !turnstileToken) {
      toast("warning", tForm("toastTurnstile"));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          inquiryType: form.inquiryType,
          budget: form.budget,
          message: form.message,
          website: form.website,
          turnstileToken,
          locale,
        }),
      });
      if (!res.ok) {
        if (form.website) {
          setSubmitted(true);
          return;
        }
        let errMsg = tForm("toastError");
        try {
          const j = (await res.json()) as { error?: string };
          if (j.error === "save_failed") {
            errMsg = tForm("toastSaveFailed");
          } else if (j.error === "service_unavailable") {
            errMsg = tForm("toastServiceUnavailable");
          } else if (j.error === "turnstile_failed") {
            errMsg = tForm("toastTurnstileFailed");
          } else if (j.error === "validation_failed") {
            errMsg = tForm("toastValidation");
          }
        } catch {
          /* ignore */
        }
        toast("error", errMsg);
        return;
      }
      setSubmitted(true);
      toast("success", tForm("toastSuccess"));
      if (turnstileWidgetId.current && window.turnstile) {
        try {
          window.turnstile.remove(turnstileWidgetId.current);
        } catch {
          /* ignore */
        }
        turnstileWidgetId.current = null;
      }
      setTurnstileToken("");
    } catch {
      toast("error", tForm("toastNetworkError"));
    } finally {
      setLoading(false);
    }
  };

  const inputClass = cn(
    "h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground",
    "placeholder:text-muted-foreground focus:border-primary focus:outline-none",
  );

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center border-2 border-primary bg-primary text-primary-foreground">
          <CheckCircle className="h-8 w-8" aria-hidden />
        </div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
          [ SUCCESS ]
        </p>
        <p className="text-lg font-bold tracking-tight text-foreground">
          {tForm("successTitle")}
        </p>
        <p className="font-mono text-[12px] tracking-tight text-muted-foreground">
          {tForm("successBody")}
        </p>

        <div className="mt-4 w-full max-w-sm border-2 border-border bg-card p-5">
          <div className="flex items-center justify-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            <MessageCircle className="h-4 w-4" aria-hidden />
            [ {tForm("kakaoLead")} ]
          </div>
          <p className="mt-2 text-center font-mono text-[11px] leading-relaxed tracking-tight text-muted-foreground">
            {tForm("kakaoDesc")}
          </p>
          <a
            href={KAKAO_CHANNEL_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 border-2 border-border px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-foreground hover:text-background"
            style={{ backgroundColor: "#FEE500" }}
          >
            <MessageCircle className="h-4 w-4" aria-hidden />
            {tForm("kakaoCta")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <form className="relative space-y-5" onSubmit={handleSubmit} noValidate>
      {publishedCaseRef ? (
        <div className="border-2 border-primary bg-card p-4 text-sm text-foreground">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ CASE REFERENCE ]
          </p>
          <p className="mt-2 font-medium leading-relaxed">{t("caseRefBanner")}</p>
          <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
            {`// `}{isKo
              ? publishedCaseRef.titleKo
              : publishedCaseRef.titleEn ?? publishedCaseRef.titleKo}
          </p>
          <Link
            href={`/cases/${publishedCaseRef.id}`}
            className="mt-3 inline-flex border-b-2 border-foreground/30 pb-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {t("caseRefViewCase")} →
          </Link>
        </div>
      ) : academyTopic ? (
        <div className="border-2 border-border bg-muted p-4 text-sm text-foreground">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ ACADEMY REFERENCE ]
          </p>
          <p className="mt-2 font-medium leading-relaxed">{t("academyRefBanner")}</p>
          <Link
            href="/academy"
            className="mt-3 inline-flex border-b-2 border-foreground/30 pb-1 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-foreground transition-colors hover:border-primary hover:text-primary"
          >
            {t("academyRefBack")} →
          </Link>
        </div>
      ) : null}

      <div className="absolute -left-[9999px]" aria-hidden="true" tabIndex={-1}>
        <label htmlFor="website">Website</label>
        <input
          type="text"
          id="website"
          name="website"
          value={form.website}
          onChange={(e) => updateField("website", e.target.value)}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div>
        <label
          htmlFor="contact-name"
          className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
        >
          {tForm("nameLabel")}{" "}
          <span className="text-primary" aria-hidden>
            *
          </span>
        </label>
        <input
          id="contact-name"
          name="name"
          className={cn(inputClass, inputErrorClass("name"))}
          placeholder={tForm("namePlaceholder")}
          value={form.name}
          onChange={(e) => updateField("name", e.target.value)}
          onBlur={() => handleBlur("name")}
          autoComplete="name"
        />
        {fieldError("name")}
      </div>

      <div>
        <label
          htmlFor="contact-phone"
          className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
        >
          {tForm("phoneLabel")}{" "}
          <span className="text-primary" aria-hidden>
            *
          </span>
        </label>
        <input
          id="contact-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          className={cn(inputClass, inputErrorClass("phone"))}
          placeholder={tForm("phonePlaceholder")}
          value={form.phone}
          onChange={(e) => updateField("phone", e.target.value)}
          onBlur={() => handleBlur("phone")}
          autoComplete="tel"
        />
        {fieldError("phone")}
      </div>

      <div>
        <label
          htmlFor="contact-inquiry-type"
          className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
        >
          {tForm("inquiryTypeLabel")}{" "}
          <span className="text-primary" aria-hidden>
            *
          </span>
        </label>
        <select
          id="contact-inquiry-type"
          name="inquiryType"
          className={cn(inputClass, inputErrorClass("inquiryType"))}
          value={form.inquiryType}
          onChange={(e) =>
            updateField("inquiryType", e.target.value as FormFields["inquiryType"])
          }
          onBlur={() => handleBlur("inquiryType")}
        >
          <option value="">{tForm("inquiryTypePlaceholder")}</option>
          <option value="media">{tForm("inquiryTypeMedia")}</option>
          <option value="campaign">{tForm("inquiryTypeCampaign")}</option>
          <option value="quote">{tForm("inquiryTypeQuote")}</option>
          <option value="other">{tForm("inquiryTypeOther")}</option>
        </select>
        {fieldError("inquiryType")}
      </div>

      <div>
        <label
          htmlFor="contact-budget"
          className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
        >
          {tForm("budgetLabel")}{" "}
          <span className="text-primary" aria-hidden>
            *
          </span>
        </label>
        <select
          id="contact-budget"
          name="budget"
          className={cn(inputClass, inputErrorClass("budget"))}
          value={form.budget}
          onChange={(e) =>
            updateField("budget", e.target.value as FormFields["budget"])
          }
          onBlur={() => handleBlur("budget")}
        >
          <option value="">{tForm("budgetPlaceholder")}</option>
          <option value="under_10m">{tForm("budgetUnder10m")}</option>
          <option value="10m_50m">{tForm("budget10to50m")}</option>
          <option value="50m_100m">{tForm("budget50to100m")}</option>
          <option value="over_100m">{tForm("budgetOver100m")}</option>
        </select>
        {fieldError("budget")}
      </div>

      <div>
        <label
          htmlFor="contact-message"
          className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
        >
          {tForm("messageLabel")}{" "}
          <span className="text-primary" aria-hidden>
            *
          </span>
        </label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          className={cn(
            inputClass,
            "min-h-[120px] resize-y",
            inputErrorClass("message"),
          )}
          placeholder={tForm("messagePlaceholder")}
          value={form.message}
          onChange={(e) => updateField("message", e.target.value)}
          onBlur={() => handleBlur("message")}
        />
        {fieldError("message")}
      </div>

      {showTurnstileHint ? (
        <p className="border-2 border-primary bg-card px-3 py-2 font-mono text-[11px] tracking-tight text-primary">
          {`// `}{tForm("turnstileConfigHint")}
        </p>
      ) : turnstileEnabled ? (
        <div ref={turnstileRef} className="flex justify-center" />
      ) : null}

      <BtnBlock
        type="submit"
        variant="accent"
        size="lg"
        disabled={loading}
        className="w-full"
      >
        {loading ? (
          <>
            <Spinner className="mr-2" />
            {tForm("submitting")}
          </>
        ) : (
          tForm("submitConsult")
        )}
      </BtnBlock>
    </form>
  );
}
