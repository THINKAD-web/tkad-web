"use client";

import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PLANNER_AGE_KEYS,
  PLANNER_GENDER_KEYS,
  PLANNER_INDUSTRY_KEYS,
  PLANNER_INTEREST_KEYS,
  PLANNER_PURPOSE_KEYS,
  type PlannerPurposeKey,
} from "@/lib/planner/types";
import { usePlannerStore } from "@/lib/planner/store";

export function PlannerBrandStep() {
  const t = useTranslations("planner");
  const brandName = usePlannerStore((s) => s.brandName);
  const purposes = usePlannerStore((s) => s.campaignPurposes);
  const industryKey = usePlannerStore((s) => s.industryKey);
  const ageKey = usePlannerStore((s) => s.ageKey);
  const genderKey = usePlannerStore((s) => s.genderKey);
  const interestKeys = usePlannerStore((s) => s.interestKeys);
  const setBrandName = usePlannerStore((s) => s.setBrandName);
  const togglePurpose = usePlannerStore((s) => s.toggleCampaignPurpose);
  const setIndustryKey = usePlannerStore((s) => s.setIndustryKey);
  const setAgeKey = usePlannerStore((s) => s.setAgeKey);
  const setGenderKey = usePlannerStore((s) => s.setGenderKey);
  const toggleInterest = usePlannerStore((s) => s.toggleInterestKey);

  const purposeLabels: Record<PlannerPurposeKey, string> = {
    awareness: t("purposeAwareness"),
    launch: t("purposeLaunch"),
    popup: t("purposePopup"),
    retarget: t("purposeRetarget"),
  };

  return (
    <div className="space-y-6">
      <div className="border-2 border-border bg-card">
        <div className="border-b-2 border-border p-5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-[0.22em] text-primary">
            [ STEP 1 / BRAND ]
          </p>
          <h2 className="mt-2 flex items-center gap-2 text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden />
            {t("stepBrandTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            {t("stepBrandDesc")}
          </p>
        </div>
        <div className="space-y-6 p-5">
          <div>
            <label className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              [ {t("brandNameLabel")} ]
            </label>
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder={t("brandNamePlaceholder")}
              className="mt-2 h-11 w-full border-2 border-border bg-card px-3 text-base font-medium text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              [ {t("purposeMultiLabel")} ]
            </p>
            <div className="grid grid-cols-1 gap-0 sm:grid-cols-2">
              {PLANNER_PURPOSE_KEYS.map((key) => {
                const on = purposes.includes(key);
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => togglePurpose(key)}
                    className={cn(
                      "-mt-[2px] -ml-[2px] border-2 p-4 text-left transition-colors",
                      on
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    <p className="font-bold">{purposeLabels[key]}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              [ {t("industryLabel")} ]
            </p>
            <div className="flex flex-wrap gap-0">
              {PLANNER_INDUSTRY_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setIndustryKey(k)}
                  className={cn(
                    "-mt-[2px] -ml-[2px] border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-[0.16em]",
                    industryKey === k
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {t(k)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div>
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                [ {t("ageLabel")} ]
              </p>
              <div className="flex flex-wrap gap-0">
                {PLANNER_AGE_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setAgeKey(k)}
                    className={cn(
                      "-mt-[2px] -ml-[2px] border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase",
                      ageKey === k
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                [ {t("genderLabel")} ]
              </p>
              <div className="flex flex-wrap gap-0">
                {PLANNER_GENDER_KEYS.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setGenderKey(k)}
                    className={cn(
                      "-mt-[2px] -ml-[2px] border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase",
                      genderKey === k
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    {t(k)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
              [ {t("interestLabel")} ]
            </p>
            <div className="flex flex-wrap gap-0">
              {PLANNER_INTEREST_KEYS.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleInterest(k)}
                  className={cn(
                    "-mt-[2px] -ml-[2px] border-2 px-3 py-1.5 font-mono text-[11px] font-bold uppercase",
                    interestKeys.includes(k)
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border bg-card hover:bg-muted",
                  )}
                >
                  {t(k)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
