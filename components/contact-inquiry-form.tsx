"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  CONTACT_BUDGET_V2,
  CONTACT_CAMPAIGN_GOALS,
  CONTACT_INDUSTRIES,
  CONTACT_REGIONS,
  contactLeadClientSchema,
  contactLeadDefaultValues,
  type ContactBudgetV2,
  type ContactCampaignGoal,
  type ContactIndustry,
  type ContactInquiryType,
  type ContactLeadFormValues,
  type ContactRegion,
  budgetLabelV2,
  campaignGoalLabel,
  industryLabel,
  regionLabel,
} from "@/lib/contact-lead-schema";

const CASE_CUID_RE = /^c[a-z0-9]{24,}$/i;

const STEP_FIELDS: Record<
  number,
  (keyof ContactLeadFormValues)[]
> = {
  0: ["inquiryType"],
  1: ["company", "name", "phone", "email"],
  2: ["industry", "campaignGoals", "regions"],
  3: ["budget", "startDate", "additionalNotes"],
};


type TurnstileWindow = Window &
  typeof globalThis & {
    turnstile?: {
      render: (
        el: HTMLElement,
        opts: Record<string, unknown>,
      ) => string;
      remove: (widgetId: string) => void;
    };
  };

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

  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);

  const turnstileRef = useRef<HTMLDivElement | null>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState("");
  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const isProductionDomain =
    typeof window !== "undefined" &&
    (window.location.hostname === "tkad.co.kr" ||
      window.location.hostname === "www.tkad.co.kr");
  const turnstileEnabled = isProductionDomain && !!siteKey;

  const {
    register,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
    setValue,
    getValues,
  } = useForm<ContactLeadFormValues>({
    resolver: zodResolver(contactLeadClientSchema),
    defaultValues: contactLeadDefaultValues,
    mode: "onTouched",
  });

  const inquiryType = watch("inquiryType");
  const campaignGoals = watch("campaignGoals");
  const regions = watch("regions");

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
      const title = isKo ? refMedia.name : refMedia.nameEn || refMedia.name;
      const snippet = isKo
        ? `매체 "${title}" (ID ${refMedia.id}) 관련 문의드립니다.\n`
        : `Inquiry regarding media "${title}" (ID ${refMedia.id}).\n`;
      if (getValues("additionalNotes").trim() !== "") return;
      setValue("additionalNotes", snippet, { shouldDirty: true });
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
  }, [getValues, isKo, mediaIdParam, setValue]);

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
    if (getValues("additionalNotes").trim() !== "") return;
    setValue("additionalNotes", snippet, { shouldDirty: true });
  }, [getValues, publishedCaseRef, isKo, setValue, t]);

  useEffect(() => {
    if (caseSlug || !academyTopic || academyPrefillDone.current) return;
    academyPrefillDone.current = true;
    const snippet = t("academyRefMessageTemplate");
    if (getValues("additionalNotes").trim() !== "") return;
    setValue("additionalNotes", snippet, { shouldDirty: true });
  }, [caseSlug, academyTopic, getValues, setValue, t]);

  useEffect(() => {
    if (submitted || !turnstileEnabled || !turnstileRef.current) return;

    const mountEl = turnstileRef.current;
    let cancelled = false;

    const renderWidget = () => {
      const w = window as TurnstileWindow;
      if (cancelled || !mountEl || !w.turnstile) return;
      if (turnstileWidgetId.current) {
        try {
          w.turnstile.remove(turnstileWidgetId.current);
        } catch {
          /* ignore */
        }
        turnstileWidgetId.current = null;
      }
      mountEl.innerHTML = "";
      const id = w.turnstile.render(mountEl, {
        sitekey: siteKey,
        callback: (token: string) => setTurnstileToken(token),
        "expired-callback": () => setTurnstileToken(""),
        "error-callback": () => setTurnstileToken(""),
      });
      turnstileWidgetId.current = id;
    };

    const w = window as TurnstileWindow;
    if (w.turnstile) {
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
      const wn = window as TurnstileWindow;
      if (turnstileWidgetId.current && wn.turnstile) {
        try {
          wn.turnstile.remove(turnstileWidgetId.current);
        } catch {
          /* ignore */
        }
        turnstileWidgetId.current = null;
      }
      if (mountEl) mountEl.innerHTML = "";
    };
  }, [siteKey, submitted, turnstileEnabled]);

  const inputClass = cn(
    "h-11 w-full border-2 border-border bg-card px-3 font-mono text-sm text-foreground",
    "placeholder:text-muted-foreground focus:border-primary focus:outline-none",
  );

  const fieldError = useCallback(
    (name: FieldPath<ContactLeadFormValues>) => {
      const e = errors[name];
      if (!e) return null;
      if (name === "phone" && e.message === "phoneFormat") {
        return (
          <p className="mt-1 text-xs font-medium text-red-500">
            {tForm("errors.phoneFormat")}
          </p>
        );
      }
      if (name === "startDate" && e.message === "startDateInvalid") {
        return (
          <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">
            {"// "}
            {tForm("errors.startDateInvalid")}
          </p>
        );
      }
      return (
        <p className="mt-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-destructive">
          {"// "}
          {tForm(`errors.${String(name)}` as "errors.name")}
        </p>
      );
    },
    [errors, tForm],
  );

  const toggleGoal = (code: ContactCampaignGoal) => {
    const cur = getValues("campaignGoals");
    const next: ContactCampaignGoal[] = cur.includes(code)
      ? cur.filter((c: ContactCampaignGoal) => c !== code)
      : [...cur, code];
    setValue("campaignGoals", next, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const toggleRegion = (code: ContactRegion) => {
    const cur = getValues("regions");
    const next: ContactRegion[] = cur.includes(code)
      ? cur.filter((c: ContactRegion) => c !== code)
      : [...cur, code];
    setValue("regions", next, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  const goNext = async () => {
    const ok = await trigger(STEP_FIELDS[step] as FieldPath<ContactLeadFormValues>[]);
    if (!ok) {
      toast("warning", tForm("toastValidation"));
      return;
    }
    setStep((s) => Math.min(3, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(0, s - 1));

  const onSubmit = async (data: ContactLeadFormValues) => {
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
          ...data,
          locale,
          turnstileToken,
        }),
      });
      if (!res.ok) {
        if (data.website) {
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
      const w = window as TurnstileWindow;
      if (turnstileWidgetId.current && w.turnstile) {
        try {
          w.turnstile.remove(turnstileWidgetId.current);
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

  const inputErrorBorder = (name: FieldPath<ContactLeadFormValues>) =>
    errors[name] ? "border-destructive" : "";

  const tabDefs: { value: ContactInquiryType; labelKey: "inquiryTypeMediaQuote" | "inquiryTypeCampaignPlan" | "inquiryTypeOther" }[] =
    [
      { value: "media_quote", labelKey: "inquiryTypeMediaQuote" },
      { value: "campaign_plan", labelKey: "inquiryTypeCampaignPlan" },
      { value: "other", labelKey: "inquiryTypeOther" },
    ];


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
    <form
      className="relative space-y-5"
      onSubmit={handleSubmit(onSubmit)}
      noValidate
    >
      <p className="font-mono text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {tForm("stepLabel", { current: step + 1, total: 4 })}
      </p>

      {publishedCaseRef ? (
        <div className="border-2 border-primary bg-card p-4 text-sm text-foreground">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ CASE REFERENCE ]
          </p>
          <p className="mt-2 font-medium leading-relaxed">{t("caseRefBanner")}</p>
          <p className="mt-1 font-mono text-[11px] tracking-tight text-muted-foreground">
            {"// "}
            {isKo
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
          {...register("website")}
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      {step === 0 ? (
        <div className="space-y-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            {tForm("inquiryTypeLabel")}{" "}
            <span className="text-primary" aria-hidden>
              *
            </span>
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {tabDefs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() =>
                  setValue("inquiryType", tab.value, {
                    shouldValidate: true,
                    shouldDirty: true,
                  })
                }
                className={cn(
                  "border-2 border-border px-3 py-3 font-mono text-[11px] font-bold uppercase tracking-[0.14em] transition-colors",
                  inquiryType === tab.value
                    ? "bg-[#FF6600] text-black border-[#FF6600]"
                    : "bg-card text-foreground hover:border-primary/50",
                )}
              >
                {tForm(tab.labelKey)}
              </button>
            ))}
          </div>
          <input type="hidden" {...register("inquiryType")} />
          {fieldError("inquiryType")}
        </div>
      ) : null}

      {step === 1 ? (
        <div className="space-y-4">
          <p className="font-mono text-[11px] leading-relaxed text-muted-foreground">
            {tForm("contactHint")}
          </p>
          <div>
            <label
              htmlFor="contact-company"
              className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
            >
              {tForm("companyLabel")}{" "}
              <span className="text-primary" aria-hidden>
                *
              </span>
            </label>
            <input
              id="contact-company"
              autoComplete="organization"
              className={cn(inputClass, inputErrorBorder("company"))}
              placeholder={tForm("companyPlaceholder")}
              {...register("company")}
            />
            {fieldError("company")}
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
              className={cn(inputClass, inputErrorBorder("name"))}
              placeholder={tForm("namePlaceholder")}
              {...register("name")}
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
              type="tel"
              inputMode="tel"
              className={cn(inputClass, inputErrorBorder("phone"))}
              placeholder={tForm("phonePlaceholder")}
              {...register("phone")}
              autoComplete="tel"
            />
            {fieldError("phone")}
          </div>
          <div>
            <label
              htmlFor="contact-email"
              className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
            >
              {tForm("emailLabel")}{" "}
              <span className="text-primary" aria-hidden>
                *
              </span>
            </label>
            <input
              id="contact-email"
              type="email"
              className={cn(inputClass, inputErrorBorder("email"))}
              placeholder={tForm("emailPlaceholder")}
              {...register("email")}
              autoComplete="email"
            />
            {fieldError("email")}
          </div>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="space-y-6">
          <div>
            <label
              htmlFor="contact-industry"
              className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
            >
              {tForm("industryLabel")}{" "}
              <span className="text-primary" aria-hidden>
                *
              </span>
            </label>
            <select
              id="contact-industry"
              className={cn(inputClass, inputErrorBorder("industry"))}
              {...register("industry")}
            >
              {CONTACT_INDUSTRIES.map((ind: ContactIndustry) => (
                <option key={ind} value={ind}>
                  {industryLabel(ind, locale)}
                </option>
              ))}
            </select>
            {fieldError("industry")}
          </div>

          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              {tForm("campaignGoalsLabel")}{" "}
              <span className="text-primary" aria-hidden>
                *
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CONTACT_CAMPAIGN_GOALS.map((g: ContactCampaignGoal) => {
                const on = campaignGoals.includes(g);
                return (
                  <button
                    key={g}
                    type="button"
                    onClick={() => toggleGoal(g)}
                    className={cn(
                      "border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                      on
                        ? "border-[#FF6600] bg-[#FF6600] text-black"
                        : "border-border bg-card text-foreground hover:border-primary/50",
                    )}
                  >
                    {campaignGoalLabel(g, locale)}
                  </button>
                );
              })}
            </div>
            {fieldError("campaignGoals")}
          </div>

          <div>
            <p className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
              {tForm("regionsLabel")}{" "}
              <span className="text-primary" aria-hidden>
                *
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              {CONTACT_REGIONS.map((r: ContactRegion) => {
                const on = regions.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
                    onClick={() => toggleRegion(r)}
                    className={cn(
                      "border-2 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                      on
                        ? "border-[#FF6600] bg-[#FF6600] text-black"
                        : "border-border bg-card text-foreground hover:border-primary/50",
                    )}
                  >
                    {regionLabel(r, locale)}
                  </button>
                );
              })}
            </div>
            {fieldError("regions")}
          </div>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="space-y-4">
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
              className={cn(inputClass, inputErrorBorder("budget"))}
              {...register("budget")}
            >
              <option value="">{tForm("budgetPlaceholder")}</option>
              {CONTACT_BUDGET_V2.map((b: ContactBudgetV2) => (
                <option key={b} value={b}>
                  {budgetLabelV2(b, locale)}
                </option>
              ))}
            </select>
            {fieldError("budget")}
          </div>

          <div>
            <label
              htmlFor="contact-start"
              className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
            >
              {tForm("startDateLabel")}{" "}
              <span className="text-primary" aria-hidden>
                *
              </span>
            </label>
            <input
              id="contact-start"
              type="date"
              className={cn(inputClass, inputErrorBorder("startDate"))}
              {...register("startDate")}
            />
            {fieldError("startDate")}
          </div>

          <div>
            <label
              htmlFor="contact-notes"
              className="mb-2 block font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary"
            >
              {tForm("additionalNotesLabel")}{" "}
              <span className="text-primary" aria-hidden>
                *
              </span>
            </label>
            <textarea
              id="contact-notes"
              rows={5}
              className={cn(
                inputClass,
                "min-h-[120px] resize-y",
                inputErrorBorder("additionalNotes"),
              )}
              placeholder={tForm("additionalNotesPlaceholder")}
              {...register("additionalNotes")}
            />
            {fieldError("additionalNotes")}
          </div>

          {turnstileEnabled ? (
            <div ref={turnstileRef} className="flex justify-center" />
          ) : null}
        </div>
      ) : null}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {step > 0 ? (
            <BtnBlock
              type="button"
              variant="secondary"
              size="lg"
              onClick={goBack}
              disabled={loading}
            >
              {tForm("back")}
            </BtnBlock>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {step < 3 ? (
            <BtnBlock
              type="button"
              variant="accent"
              size="lg"
              className="w-full sm:min-w-[160px]"
              disabled={loading}
              onClick={() => void goNext()}
            >
              {tForm("next")}
            </BtnBlock>
          ) : (
            <BtnBlock
              type="submit"
              variant="accent"
              size="lg"
              className="w-full"
              disabled={loading}
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
          )}
        </div>
      </div>
    </form>
  );
}
