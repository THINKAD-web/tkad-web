"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { BtnBlock } from "@/components/brutalist";
import { MediaCard } from "@/components/brutalist/media-card";
import { Spinner } from "@/components/ui/spinner";
import { HomeLandingDayNight } from "@/components/home-landing-day-night";
import { cn } from "@/lib/utils";
import {
  needsIndustrySteps,
  type OnboardingBudgetRange,
  type OnboardingIndustry,
  type OnboardingRole,
} from "@/lib/onboarding-types";
import { ArrowRight, Check } from "lucide-react";
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

type WizardStep = 1 | 2 | 3 | 4;

export function OnboardingWizard({
  initialCompleted,
}: {
  initialCompleted: boolean;
}) {
  const t = useTranslations("onboarding");
  const locale = useLocale();
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
      <div className="tkad-landing-neon tkad-planner-neon tkad-auth-page min-h-[calc(100vh-72px)] px-4 py-10">
        <div className="mx-auto w-full max-w-2xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] dark:text-white text-gray-600">
                {t("kicker")}
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight dark:text-white text-gray-900">
                {t("title")}
              </h1>
            </div>
            <button
              type="button"
              onClick={() => void handleSkip()}
              disabled={saving}
              className="shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wider dark:text-white text-gray-500 underline-offset-2 hover:dark:text-white text-gray-700 hover:underline disabled:opacity-50"
            >
              {t("skip")}
            </button>
          </div>

          <div className="mb-8">
            <div className="mb-2 flex justify-between font-mono text-[10px] font-bold uppercase tracking-wider dark:text-white text-gray-400">
              <span>
                {t("stepLabel", { current: displayStep, total: totalSteps })}
              </span>
              <span>{progressPct}%</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full dark:bg-white/10 bg-gray-100">
              <div
                className="h-full rounded-full bg-[#ff6b2c] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>

          <div className="rounded-[24px] border dark:border-white/12 border-gray-200 dark:bg-black bg-white bg-white/40 dark:bg-white/8 bg-gray-100 p-6 backdrop-blur sm:p-8">
            {step === 1 && (
              <>
                <h2 className="text-lg font-black dark:text-white text-gray-900">{t("step1Title")}</h2>
                <p className="mt-2 text-sm dark:text-white text-gray-600">{t("step1Desc")}</p>
                <ul className="mt-6 space-y-3">
                  {roleOptions.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={cn(
                          "w-full rounded-[18px] border px-4 py-4 text-left transition-all",
                          role === opt.value
                            ? "border-[#ff6b2c] bg-[#ff6b2c]/15"
                            : "dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 hover:border-white/25",
                        )}
                      >
                        <span className="block font-bold dark:text-white text-gray-900">{opt.label}</span>
                        <span className="mt-1 block text-sm dark:text-white text-gray-500">
                          {opt.desc}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-8">
                  <BtnBlock
                    type="button"
                    disabled={!role || saving}
                    onClick={() => void handleRoleNext()}
                    className="w-full"
                  >
                    {saving ? <Spinner className="h-5 w-5" /> : t("next")}
                  </BtnBlock>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <h2 className="text-lg font-black dark:text-white text-gray-900">{t("step2Title")}</h2>
                <p className="mt-2 text-sm dark:text-white text-gray-600">{t("step2Desc")}</p>
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
                          selected
                            ? "border-[#ff6b2c] bg-[#ff6b2c]/20 dark:text-white text-gray-900"
                            : "dark:border-white/15 border-gray-200 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-700 hover:border-white/30",
                        )}
                      >
                        {selected ? <Check className="h-3.5 w-3.5" /> : null}
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                {error ? (
                  <p className="mt-4 text-sm text-red-400">{error}</p>
                ) : null}
                <div className="mt-8 flex gap-3">
                  <BtnBlock
                    type="button"
                    onClick={() => setStep(1)}
                    className="flex-1 border dark:border-white/20 border-gray-300 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-900 hover:dark:bg-white/10 bg-gray-100"
                  >
                    {t("back")}
                  </BtnBlock>
                  <BtnBlock
                    type="button"
                    disabled={saving}
                    onClick={() => void handleIndustryNext()}
                    className="flex-[2]"
                  >
                    {saving ? <Spinner className="h-5 w-5" /> : t("next")}
                  </BtnBlock>
                </div>
              </>
            )}

            {step === 3 && (
              <>
                <h2 className="text-lg font-black dark:text-white text-gray-900">{t("step3Title")}</h2>
                <p className="mt-2 text-sm dark:text-white text-gray-600">{t("step3Desc")}</p>
                <ul className="mt-6 space-y-3">
                  {budgetOptions.map((opt) => (
                    <li key={opt.value}>
                      <button
                        type="button"
                        onClick={() => setBudgetRange(opt.value)}
                        className={cn(
                          "w-full rounded-[18px] border px-4 py-3.5 text-left font-semibold transition-all",
                          budgetRange === opt.value
                            ? "border-[#ff6b2c] bg-[#ff6b2c]/15 dark:text-white text-gray-900"
                            : "dark:border-white/12 border-gray-200 dark:bg-white/5 bg-gray-50 dark:text-white text-gray-700 hover:border-white/25",
                        )}
                      >
                        {opt.label}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 flex gap-3">
                  <BtnBlock
                    type="button"
                    variant="secondary"
                    onClick={() => setStep(2)}
                    className="flex-1"
                  >
                    {t("back")}
                  </BtnBlock>
                  <BtnBlock
                    type="button"
                    disabled={!budgetRange || saving}
                    onClick={() => void handleBudgetNext()}
                    className="flex-[2]"
                  >
                    {saving ? <Spinner className="h-5 w-5" /> : t("next")}
                  </BtnBlock>
                </div>
              </>
            )}

            {step === 4 && (
              <>
                <h2 className="text-lg font-black dark:text-white text-gray-900">{t("step4Title")}</h2>
                <p className="mt-2 text-sm dark:text-white text-gray-600">{t("step4Desc")}</p>
                {loading ? (
                  <div className="mt-10 flex justify-center">
                    <Spinner className="h-8 w-8" />
                  </div>
                ) : (
                  <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                    {preview.map((m, i) => (
                      <li key={m.id} className="list-none">
                        <MediaCard
                          href={m.href}
                          imageSrc={m.imageSrc}
                          imageAlt={m.name}
                          index={String(i + 1).padStart(2, "0")}
                          type={m.type}
                          name={m.name}
                          location={m.location}
                          price={m.price}
                          premium
                          glowTheme="purple"
                          density="compact"
                          topRight={
                            m.isVerified ? (
                              <span className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider dark:text-white text-gray-900">
                                VERIFIED
                              </span>
                            ) : undefined
                          }
                        />
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                  <BtnBlock
                    type="button"
                    disabled={saving}
                    onClick={() => void handleComplete()}
                    className="flex-1"
                  >
                    {saving ? (
                      <Spinner className="h-5 w-5" />
                    ) : (
                      <>
                        {t("ctaExplore")}
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </BtnBlock>
                  <BtnBlock
                    type="button"
                    disabled={saving}
                    variant="secondary"
                    className="flex-1"
                    onClick={async () => {
                      const ok = await savePartial({ complete: true });
                      if (ok) {
                        router.push("/planner");
                        router.refresh();
                      }
                    }}
                  >
                    {t("ctaPlanner")}
                  </BtnBlock>
                </div>
                {role && needsIndustrySteps(role) ? (
                  <button
                    type="button"
                    onClick={() => setStep(3)}
                    className="mt-4 w-full text-center font-mono text-[11px] dark:text-white hover:dark:text-white text-gray-600"
                  >
                    {t("back")}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="mt-4 w-full text-center font-mono text-[11px] dark:text-white hover:dark:text-white text-gray-600"
                  >
                    {t("back")}
                  </button>
                )}
              </>
            )}

            {error && step !== 2 ? (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            ) : null}
          </div>
        </div>
      </div>
    </HomeLandingDayNight>
  );
}
