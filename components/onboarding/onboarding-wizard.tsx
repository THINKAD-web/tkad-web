"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { MediaCard } from "@/components/media/media-card";
import { mediaCardStaticHandlers } from "@/lib/media-card-static-handlers";
import type { HomeCatalogMediaItem } from "@/types/media";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { cn } from "@/lib/utils";
import {
  needsIndustrySteps,
  type OnboardingBudgetRange,
  type OnboardingIndustry,
  type OnboardingRole,
} from "@/lib/onboarding-types";
import {
  resolveOnboardingWizardInitialState,
  wizardDisplayStep,
  wizardProgressPct,
  type OnboardingInitialPreference,
  type WizardPhase,
} from "@/lib/onboarding-wizard-state";
import {
  authAlertClass,
  authCardClass,
  authEyebrowClass,
  authSubmitClass,
  authTitleClass,
} from "@/lib/auth/auth-ui-classes";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { markOnboardingCompletedForPush } from "@/lib/pwa-push-client";

type PreviewItem = {
  id: string;
  href: string;
  name: string;
  location?: string;
  type?: string;
  price?: string;
  imageSrc?: string | null;
  isVerified?: boolean;
};

function previewToCatalog(m: PreviewItem): HomeCatalogMediaItem {
  return {
    id: m.id,
    name: m.name,
    type: m.type ?? "",
    location: m.location,
    thumbnailUrl: m.imageSrc ?? undefined,
    isVerified: m.isVerified,
  };
}

const roleOptionIdle =
  "tkad-qp-auth-role dark:border-white/10 border-gray-200 bg-white dark:bg-black/20 hover:border-[color:var(--qp-accent)]/25";

const chipIdle =
  "dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 tkad-qp-text-muted hover:border-[color:var(--qp-accent)]/35";

const chipSelected =
  "border-[color:var(--qp-accent)]/50 bg-[color:var(--qp-accent-soft)] tkad-qp-text-primary";

const btnSecondary =
  "tkad-qp-auth-btn inline-flex h-12 w-full items-center justify-center border dark:border-white/15 border-gray-300 dark:bg-white/5 bg-white/70 px-6 tkad-type-title tkad-qp-text-primary transition-colors hover:dark:bg-white/10 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50";

type Props = {
  initialCompleted: boolean;
  initialPreference?: OnboardingInitialPreference | null;
};

export function OnboardingWizard({ initialCompleted, initialPreference }: Props) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const router = useRouter();

  const boot = useMemo(
    () => resolveOnboardingWizardInitialState(initialPreference),
    [initialPreference],
  );

  const [phase, setPhase] = useState<WizardPhase>(boot.phase);
  const [role, setRole] = useState<OnboardingRole | null>(boot.role);
  const [showRolePicker, setShowRolePicker] = useState(!boot.roleLocked);
  const [industries, setIndustries] = useState<OnboardingIndustry[]>(
    boot.industries,
  );
  const [budgetRange, setBudgetRange] = useState<OnboardingBudgetRange | null>(
    boot.budgetRange,
  );
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = boot.totalSteps;
  const displayStep = wizardDisplayStep(phase, totalSteps);
  const progressPct = wizardProgressPct(phase, totalSteps);
  const industryRequired = role ? needsIndustrySteps(role) : false;

  const loadPreview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/onboarding/preview?locale=${locale}`, {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = (await res.json()) as { items: PreviewItem[] };
      setPreview(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    if (phase === "preview") void loadPreview();
  }, [phase, loadPreview]);

  useEffect(() => {
    if (initialCompleted) {
      router.replace("/");
    }
  }, [initialCompleted, router]);

  async function savePartial(body: Record<string, unknown>) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        setError(t("saveError"));
        return false;
      }
      return true;
    } catch {
      setError(t("saveError"));
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    const ok = await savePartial({ skip: true });
    if (ok) {
      router.push("/media");
      router.refresh();
    }
  }

  async function handlePrefsNext() {
    if (!role) return;
    if (industryRequired && industries.length === 0) {
      setError(t("industryRequired"));
      return;
    }
    if (industryRequired && !budgetRange) return;

    const body: Record<string, unknown> = { onboardingRole: role };
    if (industryRequired) {
      body.industries = industries;
      body.budgetRange = budgetRange;
    }
    const ok = await savePartial(body);
    if (ok) setPhase("preview");
  }

  async function handleComplete() {
    const ok = await savePartial({ complete: true });
    if (ok) {
      markOnboardingCompletedForPush();
      router.push("/");
      router.refresh();
    }
  }

  function toggleIndustry(ind: OnboardingIndustry) {
    setIndustries((prev) =>
      prev.includes(ind) ? prev.filter((x) => x !== ind) : [...prev, ind],
    );
    setError(null);
  }

  const roleOptions: { value: OnboardingRole; label: string; desc: string }[] = [
    { value: "ADVERTISER", label: t("roleAdvertiser"), desc: t("roleAdvertiserDesc") },
    { value: "AGENCY", label: t("roleAgency"), desc: t("roleAgencyDesc") },
    { value: "MEDIA", label: t("roleMedia"), desc: t("roleMediaDesc") },
    { value: "BROWSER", label: t("roleBrowser"), desc: t("roleBrowserDesc") },
  ];

  const roleLabel =
    roleOptions.find((o) => o.value === role)?.label ?? role ?? "";

  const industryOptions: { value: OnboardingIndustry; label: string }[] = [
    { value: "beauty_fashion", label: t("industryBeauty") },
    { value: "fnb", label: t("industryFnb") },
    { value: "tech", label: t("industryTech") },
    { value: "finance", label: t("industryFinance") },
    { value: "entertainment", label: t("industryEntertainment") },
    { value: "other", label: t("industryOther") },
  ];

  const budgetOptions: { value: OnboardingBudgetRange; label: string }[] = [
    { value: "under_500", label: t("budgetUnder500") },
    { value: "500_3000", label: t("budget500to3000") },
    { value: "over_3000", label: t("budgetOver3000") },
    { value: "undecided", label: t("budgetUndecided") },
  ];

  return (
    <HomeLandingDayNight>
      <div className="tkad-landing-neon tkad-planner-neon tkad-auth-page min-h-[calc(100vh-72px)] px-4 py-10 sm:py-14">
        <div className="relative mx-auto w-full max-w-2xl">
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className={authEyebrowClass}>[ {t("kicker")} ]</p>
              <h1 className={`mt-2 flex items-center gap-2.5 ${authTitleClass}`}>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[var(--qp-radius-md)] border border-[color:var(--qp-accent)]/30 bg-[color:var(--qp-accent-soft)] text-[color:var(--qp-accent)]">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                {t("title")}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void handleSkip()}
              disabled={saving}
              className="shrink-0 rounded-[var(--qp-radius-md)] border dark:border-white/12 border-gray-200 px-3 py-1.5 font-display tkad-type-note font-semibold uppercase tracking-[0.16em] tkad-qp-text-muted transition-colors hover:border-[color:var(--qp-accent)]/35 disabled:opacity-50"
            >
              {t("skip")}
            </button>
          </header>

          <div className="mb-8">
            <div className="mb-2 flex justify-between font-display tkad-type-note font-medium uppercase tracking-[0.18em] tkad-qp-text-muted">
              <span>
                {t("stepLabel", { current: displayStep, total: totalSteps })}
              </span>
              <span className="tabular-nums text-[color:var(--qp-accent)]">
                {progressPct}%
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-[var(--qp-radius-md)] border dark:border-white/10 border-gray-200 bg-gray-200/80 dark:bg-white/10"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-[var(--qp-radius-md)] bg-[color:var(--qp-accent)] transition-bar duration-500"
                style={{ width: `${Math.max(progressPct, 4)}%` }}
              />
            </div>
          </div>

          <div className={cn(authCardClass, "p-6 sm:p-8")}>
            {phase === "prefs" && (
              <>
                <h2 className="text-lg font-black tkad-qp-text-primary">
                  {t("step1Title")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed tkad-qp-text-muted">
                  {industryRequired ? t("step2Desc") : t("step1Desc")}
                </p>

                {showRolePicker ? (
                  <ul className="mt-6 space-y-2.5" role="radiogroup">
                    {roleOptions.map((opt) => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={role === opt.value}
                          data-selected={role === opt.value ? "true" : "false"}
                          onClick={() => setRole(opt.value)}
                          className={cn(
                            "w-full border px-4 py-3.5 text-left transition-colors",
                            role === opt.value
                              ? "tkad-qp-auth-role border-[color:var(--qp-accent)]/45"
                              : roleOptionIdle,
                          )}
                        >
                          <span className="block text-sm font-bold tracking-tight">
                            {opt.label}
                          </span>
                          <span className="tkad-qp-text-muted mt-1 block tkad-type-caption">
                            {opt.desc}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : role ? (
                  <div className="mt-6 flex items-center justify-between gap-3 rounded-[var(--qp-radius-md)] border dark:border-white/12 border-gray-200 px-4 py-3">
                    <p className="tkad-type-title tkad-qp-text-primary">
                      {isKo ? "시작 역할" : "Your role"}: {roleLabel}
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowRolePicker(true)}
                      className="tkad-type-title text-[color:var(--qp-accent)] underline"
                    >
                      {isKo ? "변경" : "Change"}
                    </button>
                  </div>
                ) : null}

                {role && industryRequired ? (
                  <>
                    <h3 className="mt-8 text-sm font-bold tkad-qp-text-primary">
                      {t("step2Title")}
                    </h3>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {industryOptions.map((opt) => {
                        const selected = industries.includes(opt.value);
                        return (
                          <button
                            key={opt.value}
                            type="button"
                            onClick={() => toggleIndustry(opt.value)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-[var(--qp-radius-md)] border px-4 py-2 tkad-type-title transition-ui",
                              selected ? chipSelected : chipIdle,
                            )}
                          >
                            {selected ? (
                              <Check className="h-3.5 w-3.5 text-[color:var(--qp-accent)]" />
                            ) : null}
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>

                    <h3 className="mt-8 text-sm font-bold tkad-qp-text-primary">
                      {t("step3Title")}
                    </h3>
                    <ul className="mt-4 space-y-2">
                      {budgetOptions.map((opt) => (
                        <li key={opt.value}>
                          <button
                            type="button"
                            onClick={() => setBudgetRange(opt.value)}
                            data-selected={
                              budgetRange === opt.value ? "true" : "false"
                            }
                            className={cn(
                              "tkad-qp-auth-role w-full border px-4 py-3 text-left tkad-type-title transition-colors",
                              budgetRange === opt.value
                                ? "border-[color:var(--qp-accent)]/45"
                                : roleOptionIdle,
                            )}
                          >
                            {opt.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </>
                ) : null}

                {error ? (
                  <p className={cn(authAlertClass, "mt-4")}>{`// `}{error}</p>
                ) : null}

                <div className="mt-8">
                  <button
                    type="button"
                    disabled={
                      !role ||
                      saving ||
                      (industryRequired &&
                        (industries.length === 0 || !budgetRange))
                    }
                    onClick={() => void handlePrefsNext()}
                    className={cn(authSubmitClass, "inline-flex h-12 gap-2")}
                  >
                    {saving ? (
                      <Spinner className="h-5 w-5" />
                    ) : (
                      <>
                        {t("next")}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}

            {phase === "preview" && (
              <>
                <h2 className="text-lg font-black tkad-qp-text-primary">
                  {t("step4Title")}
                </h2>
                <p className="mt-2 text-sm leading-relaxed tkad-qp-text-muted">
                  {t("step4Desc")}
                </p>
                {loading ? (
                  <div className="mt-10 flex justify-center py-8">
                    <Spinner className="h-8 w-8" />
                  </div>
                ) : (
                  <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {preview.map((m, i) => (
                      <li key={m.id} className="list-none">
                        <MediaCard
                          mode="card"
                          item={previewToCatalog(m)}
                          href={m.href}
                          priceLabel={m.price}
                          isKo={isKo}
                          rank={i + 1}
                          showPlanButton
                          {...mediaCardStaticHandlers}
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => void handleComplete()}
                    className={cn(authSubmitClass, "inline-flex h-12 flex-1 gap-2")}
                  >
                    {saving ? (
                      <Spinner className="h-5 w-5" />
                    ) : (
                      <>
                        {t("ctaExplore")}
                        <ArrowRight className="h-4 w-4" aria-hidden />
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    className={cn(btnSecondary, "flex-1")}
                    onClick={async () => {
                      const ok = await savePartial({ complete: true });
                      if (ok) {
                        router.push("/planner");
                        router.refresh();
                      }
                    }}
                  >
                    {t("ctaPlanner")}
                  </button>
                </div>
                {totalSteps > 1 ? (
                  <button
                    type="button"
                    onClick={() => setPhase("prefs")}
                    className="mt-4 w-full text-center font-display tkad-type-note font-medium uppercase tracking-[0.18em] tkad-qp-text-muted transition-colors hover:opacity-80"
                  >
                    {t("back")}
                  </button>
                ) : null}
              </>
            )}

            {error && phase === "preview" ? (
              <p className={cn(authAlertClass, "mt-4")}>{`// `}{error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
