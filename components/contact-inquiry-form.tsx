"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, type FieldPath } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { CheckCircle, MessageCircle } from "lucide-react";
import { useToast } from "@/components/toast-provider";
import Spinner from "@/components/spinner";
import { KAKAO_CHANNEL_PUBLIC_URL } from "@/lib/kakao-public";
import { getMediaById, type MediaItem } from "@/lib/media-data";
import { getMediaPackageBySlug } from "@/data/packages";
import {
  buildPlannerContactMessage,
  isSavedPlannerPlanId,
  normalizePlannerBudgetManwon,
  plannerBudgetToContactBudgetV2,
  plannerGoalToContactGoals,
  type SavedPlannerPlanJson,
} from "@/lib/planner/contact-prefill";
import { buildProposalContactMessage } from "@/lib/proposal/contact-prefill";
import {
  isSavedCampaignProposalId,
  type CampaignProposalOutput,
  type ProposalInput,
} from "@/lib/proposal/types";
import { cn } from "@/lib/utils";
import { Link } from "@/i18n/navigation";
import { formatRangeDate, parseYmdLocal } from "@/lib/calendar-date-range";
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
  const tPlanner = useTranslations("planner");
  const locale = useLocale();
  const isKo = locale === "ko";
  const searchParams = useSearchParams();
  const caseSlug = searchParams.get("case");
  const planIdParam = searchParams.get("plan");
  const proposalIdParam = searchParams.get("proposal");
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
  const typeParam = searchParams.get("type");
  const typePrefillDone = useRef(false);
  const [plannerPlanRef, setPlannerPlanRef] = useState<{
    id: string;
    expiresAt: string;
  } | null>(null);
  const planPrefillDone = useRef<string | null>(null);
  const [proposalRef, setProposalRef] = useState<{
    id: string;
    expiresAt: string;
  } | null>(null);
  const proposalPrefillDone = useRef<string | null>(null);
  const packageSlug = searchParams.get("package");
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const periodPrefillDone = useRef(false);
  const [packageRef, setPackageRef] = useState<
    ReturnType<typeof getMediaPackageBySlug> | undefined
  >(undefined);
  const packagePrefillDone = useRef<string | null>(null);


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
    periodPrefillDone.current = false;
  }, [fromParam, toParam]);

  useEffect(() => {
    if (periodPrefillDone.current) return;
    const start = parseYmdLocal(fromParam?.trim() ?? "");
    if (!start) return;
    periodPrefillDone.current = true;
    const end = parseYmdLocal(toParam?.trim() ?? "");
    setValue("startDate", fromParam!.trim(), { shouldDirty: true, shouldValidate: true });
    const periodSnippet = isKo
      ? end
        ? `[집행 희망 기간: ${formatRangeDate(start, locale)} ~ ${formatRangeDate(end, locale)}]\n`
        : `[집행 시작 희망일: ${formatRangeDate(start, locale)}]\n`
      : end
        ? `[Preferred flight: ${formatRangeDate(start, locale)} – ${formatRangeDate(end!, locale)}]\n`
        : `[Preferred start: ${formatRangeDate(start, locale)}]\n`;
    if (getValues("additionalNotes").trim() === "") {
      setValue("additionalNotes", periodSnippet, { shouldDirty: true });
    }
    if (!getValues("inquiryType")) {
      setValue("inquiryType", "media_quote", { shouldValidate: true, shouldDirty: true });
    }
  }, [fromParam, toParam, getValues, isKo, locale, setValue]);

  useEffect(() => {
    mediaPrefillDone.current = false;
  }, [mediaIdParam]);

  useEffect(() => {
    typePrefillDone.current = false;
  }, [typeParam]);

  useEffect(() => {
    if (typePrefillDone.current) return;
    const raw = typeParam?.trim().toLowerCase();
    if (raw === "media") {
      typePrefillDone.current = true;
      setValue("inquiryType", "media_quote", {
        shouldValidate: true,
        shouldDirty: true,
      });
    } else if (raw === "campaign") {
      typePrefillDone.current = true;
      setValue("inquiryType", "campaign_plan", {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [setValue, typeParam]);

  useEffect(() => {
    planPrefillDone.current = null;
    setPlannerPlanRef(null);
  }, [planIdParam]);

  useEffect(() => {
    packagePrefillDone.current = null;
    setPackageRef(undefined);
  }, [packageSlug]);

  useEffect(() => {
    if (!packageSlug?.trim()) return;
    const slug = packageSlug.trim();
    if (packagePrefillDone.current === slug) return;
    const pkg = getMediaPackageBySlug(slug);
    if (!pkg) return;
    packagePrefillDone.current = slug;
    setPackageRef(pkg);
    const title = isKo ? pkg.nameKo : pkg.nameEn;
    const mediaList = pkg.mediaIds.join(", ");
    const snippet = t("packageRefMessageTemplate", { title, mediaList });
    if (getValues("additionalNotes").trim() === "") {
      setValue("additionalNotes", snippet, { shouldDirty: true });
    }
    if (!getValues("inquiryType")) {
      setValue("inquiryType", "media_quote", {
        shouldValidate: true,
        shouldDirty: true,
      });
    }
  }, [getValues, isKo, packageSlug, setValue, t]);

  useEffect(() => {
    if (!planIdParam || !isSavedPlannerPlanId(planIdParam)) {
      return;
    }
    if (planPrefillDone.current === planIdParam) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/planner/shared/${planIdParam}`);
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as {
          id: string;
          expiresAt: string;
          planJson: SavedPlannerPlanJson;
        };
        if (cancelled) return;

        setPlannerPlanRef({ id: payload.id, expiresAt: payload.expiresAt });

        const plan = payload.planJson ?? {};
        const ids = Array.isArray(plan.campaignMediaIds)
          ? plan.campaignMediaIds.filter(
              (id): id is string => typeof id === "string" && id.length > 0,
            )
          : [];

        let catalog: MediaItem[] = [];
        try {
          const catRes = await fetch("/api/public/media-catalog");
          if (catRes.ok) {
            catalog = (await catRes.json()) as MediaItem[];
          }
        } catch {
          /* ignore */
        }

        const mediaItems = ids
          .map((id) => catalog.find((m) => m.id === id) ?? getMediaById(id))
          .filter((m): m is MediaItem => m != null);

        const goalKey = plan.campaignGoal;
        let goalLabel: string | null = null;
        if (typeof goalKey === "string" && goalKey.length > 0) {
          try {
            goalLabel = tPlanner(goalKey as "goalBrand");
          } catch {
            goalLabel = goalKey;
          }
        }

        const regionsText =
          Array.isArray(plan.regions) && plan.regions.length > 0
            ? plan.regions.join(", ")
            : null;

        const budgetManwon = normalizePlannerBudgetManwon(plan.budget);
        const months = Math.max(1, Number(plan.months) || 1);
        const budgetCode = plannerBudgetToContactBudgetV2(budgetManwon, months);
        const goals = plannerGoalToContactGoals(plan.campaignGoal);
        const message = buildPlannerContactMessage({
          isKo,
          plan,
          mediaItems,
          goalLabel,
          regionsText,
        });

        planPrefillDone.current = planIdParam;
        if (getValues("additionalNotes").trim() === "") {
          setValue("additionalNotes", message, { shouldDirty: true });
        }
        if (!getValues("inquiryType")) {
          setValue("inquiryType", "media_quote", {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
        if (!getValues("budget")) {
          setValue("budget", budgetCode, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
        const currentGoals = getValues("campaignGoals");
        if (currentGoals.length === 0 && goals.length > 0) {
          setValue("campaignGoals", goals, {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getValues, isKo, planIdParam, setValue, tPlanner]);

  useEffect(() => {
    proposalPrefillDone.current = null;
    setProposalRef(null);
  }, [proposalIdParam]);

  useEffect(() => {
    if (!proposalIdParam || !isSavedCampaignProposalId(proposalIdParam)) {
      return;
    }
    if (proposalPrefillDone.current === proposalIdParam) return;

    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/proposal/${proposalIdParam}`);
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as {
          id: string;
          expiresAt: string;
          inputJson: ProposalInput;
          proposalJson: CampaignProposalOutput;
        };
        if (cancelled) return;

        setProposalRef({ id: payload.id, expiresAt: payload.expiresAt });
        const message = buildProposalContactMessage({
          isKo,
          input: payload.inputJson,
          proposal: payload.proposalJson,
          proposalId: payload.id,
        });

        proposalPrefillDone.current = proposalIdParam;
        if (getValues("additionalNotes").trim() === "") {
          setValue("additionalNotes", message, { shouldDirty: true });
        }
        if (!getValues("inquiryType")) {
          setValue("inquiryType", "campaign_plan", {
            shouldValidate: true,
            shouldDirty: true,
          });
        }
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [getValues, isKo, proposalIdParam, setValue]);

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

  const labelClass = "mb-2 block text-sm text-white/70";
  const inputClass = cn(
    "h-11 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white",
    "placeholder:text-white/40 focus:border-violet-500/50 focus:outline-none focus:ring-1 focus:ring-violet-500/30",
  );
  const btnPrimary =
    "inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-500 to-cyan-400 px-6 text-sm font-bold text-white shadow-[0_12px_40px_rgba(139,92,246,0.35)] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[160px] sm:w-auto";
  const btnSecondary =
    "inline-flex h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 text-sm font-semibold text-white transition hover:bg-white/15 disabled:cursor-not-allowed disabled:opacity-50";
  const chipActive =
    "border-violet-500/50 bg-gradient-to-r from-violet-500/90 to-cyan-400/90 text-white shadow-[0_8px_28px_rgba(139,92,246,0.35)]";
  const chipIdle =
    "border-white/15 bg-white/5 text-white/80 hover:border-white/25 hover:bg-white/10";

  const fieldError = useCallback(
    (name: FieldPath<ContactLeadFormValues>) => {
      const e = errors[name];
      if (!e) return null;
      const msg = String(e.message ?? "");
      if (name === "phone" && msg === "phoneFormat") {
        return (
          <p className="mt-1 text-xs font-medium text-rose-400">
            {tForm("errors.phoneFormat")}
          </p>
        );
      }
      if (name === "email" && msg === "emailFormat") {
        return (
          <p className="mt-1 text-xs font-medium text-rose-400">
            {tForm("errors.emailFormat")}
          </p>
        );
      }
      if ((name === "phone" || name === "email") && msg === "contactRequired") {
        return (
          <p className="mt-1 text-xs font-medium text-rose-400">
            {tForm("errors.contactRequired")}
          </p>
        );
      }
      if (name === "startDate" && msg === "startDateInvalid") {
        return (
          <p className="mt-1 text-xs font-medium text-rose-400">
            {tForm("errors.startDateInvalid")}
          </p>
        );
      }
      const key = `errors.${String(name)}` as
        | "errors.name"
        | "errors.company"
        | "errors.email"
        | "errors.phone"
        | "errors.inquiryType"
        | "errors.industry"
        | "errors.campaignGoals"
        | "errors.regions"
        | "errors.budget"
        | "errors.startDate"
        | "errors.additionalNotes";
      return (
        <p className="mt-1 text-xs font-medium text-rose-400">{tForm(key)}</p>
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
    errors[name] ? "border-rose-400/60 ring-1 ring-rose-400/30" : "";

  const tabDefs: { value: ContactInquiryType; labelKey: "inquiryTypeMediaQuote" | "inquiryTypeCampaignPlan" | "inquiryTypeOther" }[] =
    [
      { value: "media_quote", labelKey: "inquiryTypeMediaQuote" },
      { value: "campaign_plan", labelKey: "inquiryTypeCampaignPlan" },
      { value: "other", labelKey: "inquiryTypeOther" },
    ];


  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/30 bg-gradient-to-br from-violet-500/20 to-cyan-400/20 text-cyan-300">
          <CheckCircle className="h-8 w-8" aria-hidden />
        </div>
        <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/90">
          [ SUCCESS ]
        </p>
        <p className="text-lg font-bold tracking-tight text-white">
          {tForm("successTitle")}
        </p>
        <p className="text-sm leading-relaxed text-white/65">
          {tForm("successBody")}
        </p>

        <div className="mt-4 w-full max-w-sm rounded-2xl border border-white/10 bg-white/5 p-5 backdrop-blur">
          <div className="flex items-center justify-center gap-2 text-sm font-semibold text-white/85">
            <MessageCircle className="h-4 w-4 text-cyan-400" aria-hidden />
            {tForm("kakaoLead")}
          </div>
          <p className="mt-2 text-center text-sm leading-relaxed text-white/60">
            {tForm("kakaoDesc")}
          </p>
          <a
            href={KAKAO_CHANNEL_PUBLIC_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-[#191600] transition hover:opacity-95"
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
      <p className="text-sm text-white/55">
        {tForm("stepLabel", { current: step + 1, total: 4 })}
      </p>

      {packageRef ? (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-white/85">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/90">
            [ PACKAGE REFERENCE ]
          </p>
          <p className="mt-2 font-medium leading-relaxed">{t("packageRefBanner")}</p>
          <p className="mt-1 text-xs text-white/50">
            {"// "}{isKo ? packageRef.nameKo : packageRef.nameEn}
          </p>
          <Link
            href="/media/packages"
            className="mt-3 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            {t("packageRefViewPackages")} →
          </Link>
        </div>
      ) : plannerPlanRef ? (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-white/85">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/90">
            [ PLANNER REFERENCE ]
          </p>
          <p className="mt-2 font-medium leading-relaxed">{t("plannerRefBanner")}</p>
          <p className="mt-1 text-xs text-white/50">
            {`// ID ${plannerPlanRef.id}`}
          </p>
          <Link
            href="/planner"
            className="mt-3 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            {t("plannerRefViewPlanner")} →
          </Link>
        </div>
      ) : publishedCaseRef ? (
        <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-white/85">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/90">
            [ CASE REFERENCE ]
          </p>
          <p className="mt-2 font-medium leading-relaxed">{t("caseRefBanner")}</p>
          <p className="mt-1 text-xs text-white/50">
            {"// "}
            {isKo
              ? publishedCaseRef.titleKo
              : publishedCaseRef.titleEn ?? publishedCaseRef.titleKo}
          </p>
          <Link
            href={`/cases/${publishedCaseRef.id}`}
            className="mt-3 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
          >
            {t("caseRefViewCase")} →
          </Link>
        </div>
      ) : academyTopic ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/85 backdrop-blur">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-400/90">
            [ ACADEMY REFERENCE ]
          </p>
          <p className="mt-2 font-medium leading-relaxed">{t("academyRefBanner")}</p>
          <Link
            href="/academy"
            className="mt-3 inline-flex text-sm font-semibold text-cyan-300 transition hover:text-cyan-200"
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
          <p className={labelClass}>
            {tForm("inquiryTypeLabel")}{" "}
            <span className="text-rose-400" aria-hidden>
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
                  "rounded-xl border px-3 py-3 text-sm font-semibold transition-all",
                  inquiryType === tab.value ? chipActive : chipIdle,
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
          <p className="text-sm leading-relaxed text-white/55">
            {tForm("contactHint")}
          </p>
          <div>
            <label
              htmlFor="contact-company"
              className={labelClass}
            >
              {tForm("companyLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
              className={labelClass}
            >
              {tForm("nameLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
              className={labelClass}
            >
              {tForm("phoneLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
              className={labelClass}
            >
              {tForm("emailLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
              className={labelClass}
            >
              {tForm("industryLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
            <p className={labelClass}>
              {tForm("campaignGoalsLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
                      on ? chipActive : chipIdle,
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
            <p className={labelClass}>
              {tForm("regionsLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
                      "rounded-xl border px-3 py-2 text-xs font-semibold transition-all",
                      on ? chipActive : chipIdle,
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
              className={labelClass}
            >
              {tForm("budgetLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
              className={labelClass}
            >
              {tForm("startDateLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
              className={labelClass}
            >
              {tForm("additionalNotesLabel")}{" "}
              <span className="text-rose-400" aria-hidden>
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
            <button
              type="button"
              className={btnSecondary}
              onClick={goBack}
              disabled={loading}
            >
              {tForm("back")}
            </button>
          ) : null}
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          {step < 3 ? (
            <button
              type="button"
              className={btnPrimary}
              disabled={loading}
              onClick={() => void goNext()}
            >
              {tForm("next")}
            </button>
          ) : (
            <button type="submit" className={cn(btnPrimary, "w-full")} disabled={loading}>
              {loading ? (
                <>
                  <Spinner className="mr-2" />
                  {tForm("submitting")}
                </>
              ) : (
                tForm("submitConsult")
              )}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
