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

type WizardStep = 1 | 2 | 3 | 4;

const glassShell =
  "relative overflow-hidden rounded-[28px] border dark:border-white/12 border-gray-200 dark:bg-black/40 bg-white/50 shadow-[0_28px_120px_rgba(0,0,0,0.55)] backdrop-blur";

const optionIdle =
  "dark:border-white/10 border-gray-200 dark:bg-white/5 bg-gray-50/90 dark:text-white/85 text-gray-700 hover:border-violet-500/30 hover:dark:bg-white/8 hover:shadow-[0_8px_28px_rgba(139,92,246,0.12)]";

const optionSelected =
  "border-violet-500/45 bg-gradient-to-r from-violet-500/20 via-cyan-400/12 to-fuchsia-500/10 shadow-[0_12px_40px_rgba(139,92,246,0.22)] dark:text-white text-gray-900";

const chipIdle =
  "dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 dark:text-white/75 text-gray-600 hover:border-cyan-400/35 hover:dark:bg-white/8";

const chipSelected =
  "border-violet-500/50 bg-gradient-to-r from-violet-500/25 to-cyan-400/20 dark:text-white text-gray-900 shadow-[0_4px_20px_rgba(139,92,246,0.2)]";

const btnPrimary =
  "inline-flex h-12 w-full items-center justify-center gap-2 rounded-[22px] border dark:border-white/14 border-gray-200 bg-[linear-gradient(135deg,rgba(168,85,247,0.95),rgba(34,211,238,0.95),rgba(236,72,153,0.9))] px-6 text-sm font-bold dark:text-white text-gray-900 shadow-[0_18px_60px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5 hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50";

const btnSecondary =
  "inline-flex h-12 w-full items-center justify-center rounded-[22px] border dark:border-white/15 border-gray-300 dark:bg-white/8 bg-white/70 px-6 text-sm font-semibold dark:text-white text-gray-800 transition-colors hover:dark:bg-white/12 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50";

function NeonBackdrop() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.1] tkad-neon-grid"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-24 bg-[radial-gradient(circle_at_top,rgba(168,85,247,0.22),transparent_58%),radial-gradient(circle_at_bottom,rgba(34,211,238,0.18),transparent_58%),radial-gradient(circle_at_right,rgba(236,72,153,0.12),transparent_62%)]"
      />
    </>
  );
}

export function OnboardingWizard({
  initialCompleted,
}: {
  initialCompleted: boolean;
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
  const isKo = locale.startsWith("ko");
  const router = useRouter();

  const [step, setStep] = useState<WizardStep>(1);
  const [role, setRole] = useState<OnboardingRole | null>(null);
  const [industries, setIndustries] = useState<OnboardingIndustry[]>([]);
  const [budgetRange, setBudgetRange] = useState<OnboardingBudgetRange | null>(
    null,
  );
  const [preview, setPreview] = useState<PreviewItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const totalSteps = useMemo(() => {
    if (role && !needsIndustrySteps(role)) return 2;
    return 4;
  }, [role]);

  const displayStep = useMemo(() => {
    if (role && !needsIndustrySteps(role)) {
      if (step === 1) return 1;
      return 2;
    }
    return step;
  }, [role, step]);

  const progressPct = useMemo(() => {
    if (role && !needsIndustrySteps(role)) {
      return step >= 4 ? 100 : step === 1 ? 50 : 75;
    }
    return Math.round((Math.min(step, 4) / 4) * 100);
  }, [role, step]);

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
    if (step === 4) void loadPreview();
  }, [step, loadPreview]);

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

  async function handleRoleNext() {
    if (!role) return;
    const ok = await savePartial({ onboardingRole: role });
    if (!ok) return;
    if (needsIndustrySteps(role)) {
      setStep(2);
    } else {
      setStep(4);
    }
  }

  async function handleIndustryNext() {
    if (industries.length === 0) {
      setError(t("industryRequired"));
      return;
    }
    const ok = await savePartial({ industries });
    if (ok) setStep(3);
  }

  async function handleBudgetNext() {
    if (!budgetRange) return;
    const ok = await savePartial({ budgetRange });
    if (ok) setStep(4);
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
      <div className="tkad-landing-neon tkad-planner-neon tkad-auth-page relative min-h-[calc(100vh-72px)] overflow-hidden px-4 py-10 sm:py-14">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(168,85,247,0.08),transparent_45%),radial-gradient(circle_at_80%_100%,rgba(34,211,238,0.08),transparent_40%)]"
        />

        <div className="relative mx-auto w-full max-w-2xl">
          <header className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-[10px] font-medium uppercase tracking-[0.24em] text-cyan-600/90 dark:text-cyan-400/90">
                [ {t("kicker")} ]
              </p>
              <h1 className="mt-2 flex items-center gap-2.5 text-2xl font-black tracking-tight dark:text-white text-gray-900 sm:text-3xl">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-violet-500/25 bg-gradient-to-br from-violet-500/20 to-cyan-400/15 text-violet-600 shadow-[0_0_24px_rgba(168,85,247,0.18)] dark:text-cyan-300">
                  <Sparkles className="h-4 w-4" aria-hidden />
                </span>
                {t("title")}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void handleSkip()}
              disabled={saving}
              className="shrink-0 rounded-full border dark:border-white/12 border-gray-200 px-3 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.16em] dark:text-white/55 text-gray-500 transition-colors hover:border-cyan-400/35 hover:dark:text-white text-gray-800 disabled:opacity-50"
            >
              {t("skip")}
            </button>
          </header>

          <div className="mb-8">
            <div className="mb-2 flex justify-between font-display text-[10px] font-medium uppercase tracking-[0.18em] dark:text-white/45 text-gray-500">
              <span>
                {t("stepLabel", { current: displayStep, total: totalSteps })}
              </span>
              <span className="tabular-nums text-cyan-600 dark:text-cyan-400">
                {progressPct}%
              </span>
            </div>
            <div
              className="h-2 overflow-hidden rounded-full border border-white/10 bg-gray-200/80 dark:bg-white/10"
              role="progressbar"
              aria-valuenow={progressPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-500 via-cyan-400 to-pink-400 shadow-[0_0_14px_rgba(34,211,238,0.45)] transition-all duration-500"
                style={{ width: `${Math.max(progressPct, 4)}%` }}
              />
            </div>
          </div>

          <div className={cn(glassShell, "p-6 sm:p-8")}>
            <NeonBackdrop />

            <div className="relative">
              {step === 1 && (
                <>
                  <h2 className="text-lg font-black dark:text-white text-gray-900">
                    {t("step1Title")}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed dark:text-white/65 text-gray-600">
                    {t("step1Desc")}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {roleOptions.map((opt) => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          onClick={() => setRole(opt.value)}
                          className={cn(
                            "w-full rounded-[18px] border px-4 py-3.5 text-left transition-all",
                            role === opt.value ? optionSelected : optionIdle,
                          )}
                        >
                          <span className="block text-sm font-bold tracking-tight">
                            {opt.label}
                          </span>
                          <span className="mt-1 block text-[11px] dark:text-white/55 text-gray-500">
                            {opt.desc}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8">
                    <button
                      type="button"
                      disabled={!role || saving}
                      onClick={() => void handleRoleNext()}
                      className={btnPrimary}
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

              {step === 2 && (
                <>
                  <h2 className="text-lg font-black dark:text-white text-gray-900">
                    {t("step2Title")}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed dark:text-white/65 text-gray-600">
                    {t("step2Desc")}
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    {industryOptions.map((opt) => {
                      const selected = industries.includes(opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => toggleIndustry(opt.value)}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all",
                            selected ? chipSelected : chipIdle,
                          )}
                        >
                          {selected ? (
                            <Check className="h-3.5 w-3.5 text-cyan-500" />
                          ) : null}
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  {error ? (
                    <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
                      {`// `}
                      {error}
                    </p>
                  ) : null}
                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className={cn(btnSecondary, "flex-1")}
                    >
                      {t("back")}
                    </button>
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => void handleIndustryNext()}
                      className={cn(btnPrimary, "flex-[2]")}
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

              {step === 3 && (
                <>
                  <h2 className="text-lg font-black dark:text-white text-gray-900">
                    {t("step3Title")}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed dark:text-white/65 text-gray-600">
                    {t("step3Desc")}
                  </p>
                  <ul className="mt-6 space-y-2.5">
                    {budgetOptions.map((opt) => (
                      <li key={opt.value}>
                        <button
                          type="button"
                          onClick={() => setBudgetRange(opt.value)}
                          className={cn(
                            "w-full rounded-[18px] border px-4 py-3.5 text-left text-sm font-semibold transition-all",
                            budgetRange === opt.value ? optionSelected : optionIdle,
                          )}
                        >
                          {opt.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="mt-8 flex gap-3">
                    <button
                      type="button"
                      onClick={() => setStep(2)}
                      className={cn(btnSecondary, "flex-1")}
                    >
                      {t("back")}
                    </button>
                    <button
                      type="button"
                      disabled={!budgetRange || saving}
                      onClick={() => void handleBudgetNext()}
                      className={cn(btnPrimary, "flex-[2]")}
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

              {step === 4 && (
                <>
                  <h2 className="text-lg font-black dark:text-white text-gray-900">
                    {t("step4Title")}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed dark:text-white/65 text-gray-600">
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
                      className={cn(btnPrimary, "flex-1")}
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
                  <button
                    type="button"
                    onClick={() =>
                      setStep(role && needsIndustrySteps(role) ? 3 : 1)
                    }
                    className="mt-4 w-full text-center font-display text-[10px] font-medium uppercase tracking-[0.18em] dark:text-white/45 text-gray-500 transition-colors hover:dark:text-white/70 hover:text-gray-700"
                  >
                    {t("back")}
                  </button>
                </>
              )}

              {error && step !== 2 ? (
                <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-200">
                  {`// `}
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
