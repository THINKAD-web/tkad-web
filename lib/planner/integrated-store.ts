"use client";

import type { SetStateAction } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  PLANNER_BUDGET_MAX,
  PLANNER_BUDGET_MIN,
  PLANNER_DEFAULT_CATEGORIES,
  isPlannerAgeKey,
  isPlannerIndustryKey,
  normalizePlannerAgeKeys,
  normalizePlannerCategories,
  type PlannerAgeKey,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerIndustryKey,
  type PlannerPresetId,
} from "@/lib/planner/types";
import type { PlannerScenarioApplyPatch } from "@/lib/planner/scenario-types";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import {
  INTEGRATED_LAST_INPUT_STEP,
  INTEGRATED_RESULT_STEP,
  type IntegratedWizardStep,
} from "@/lib/planner/integrated-types";
import { defaultDigitalChannelIds } from "@/lib/planner/recommend-digital";
import {
  normalizeDigitalChannelIds,
  type DigitalChannelId,
} from "@/lib/planner/digital-channels";

export const INTEGRATED_PLANNER_STORAGE_KEY = "tkad-planner-integrated-v1";

export type IntegratedPlannerStoreState = {
  wizardStep: IntegratedWizardStep;
  campaignGoal: PlannerCampaignGoal | null;
  regions: string[];
  categories: PlannerCategory[];
  budget: string;
  months: number;
  ageKeys: PlannerAgeKey[];
  industryKey: PlannerIndustryKey;
  campaignMediaIds: string[];
  digitalChannelIds: DigitalChannelId[];
  digitalBudgetPct: number;
  creativeObjectUrl: string | null;
  creativeUploadedUrl: string | null;
  mediaPlacements: Record<string, CompositeLogoPlacement>;
};

export type IntegratedPlannerStoreActions = {
  setWizardStep: (step: IntegratedWizardStep) => void;
  goNextStep: () => void;
  goPrevStep: () => void;
  setCampaignGoal: (goal: PlannerCampaignGoal | null) => void;
  toggleRegion: (region: string) => void;
  setRegions: (regions: string[]) => void;
  toggleCategory: (cat: PlannerCategory) => void;
  setCategories: (cats: PlannerCategory[]) => void;
  setBudget: (value: string) => void;
  setMonths: (months: number) => void;
  setAgeKeys: (keys: PlannerAgeKey[]) => void;
  toggleAgeKey: (key: PlannerAgeKey) => void;
  setIndustryKey: (key: PlannerIndustryKey) => void;
  setCampaignMediaIds: (action: SetStateAction<string[]>) => void;
  setCreativeObjectUrl: (action: SetStateAction<string | null>) => void;
  setCreativeUploadedUrl: (url: string | null) => void;
  toggleDigitalChannel: (id: DigitalChannelId) => void;
  setDigitalChannelIds: (ids: DigitalChannelId[]) => void;
  setDigitalBudgetPct: (pct: number) => void;
  setMediaPlacement: (mediaId: string, placement: CompositeLogoPlacement) => void;
  clearMediaPlacement: (mediaId: string) => void;
  applyPreset: (id: PlannerPresetId) => void;
  applyScenario: (patch: PlannerScenarioApplyPatch) => void;
  reset: () => void;
};

export type IntegratedPlannerStore = IntegratedPlannerStoreState &
  IntegratedPlannerStoreActions;

const INITIAL: IntegratedPlannerStoreState = {
  wizardStep: 1,
  campaignGoal: null,
  regions: ["seoul"],
  categories: [...PLANNER_DEFAULT_CATEGORIES],
  budget: "5000",
  months: 3,
  ageKeys: [] as PlannerAgeKey[],
  industryKey: "indOther",
  campaignMediaIds: [],
  digitalChannelIds: defaultDigitalChannelIds(),
  digitalBudgetPct: 30,
  creativeObjectUrl: null,
  creativeUploadedUrl: null,
  mediaPlacements: {},
};

function clampStep(n: number): IntegratedWizardStep {
  const v = Math.max(1, Math.min(INTEGRATED_RESULT_STEP, Math.round(n)));
  return v as IntegratedWizardStep;
}

export function selectIntegratedBudgetNum(s: IntegratedPlannerStoreState): number {
  const n = Number.parseInt(s.budget.replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(n)) return PLANNER_BUDGET_MIN;
  return Math.max(PLANNER_BUDGET_MIN, Math.min(PLANNER_BUDGET_MAX, n));
}

export const useIntegratedPlannerStore = create<IntegratedPlannerStore>()(
  persist(
    (set, get) => ({
      ...INITIAL,
      setWizardStep: (step) => set({ wizardStep: clampStep(step) }),
      goNextStep: () => {
        const cur = get().wizardStep;
        if (cur >= INTEGRATED_RESULT_STEP) return;
        set({
          wizardStep: clampStep(
            cur >= INTEGRATED_LAST_INPUT_STEP
              ? INTEGRATED_RESULT_STEP
              : cur + 1,
          ),
        });
      },
      goPrevStep: () => {
        const cur = get().wizardStep;
        if (cur <= 1) return;
        set({ wizardStep: clampStep(cur - 1) });
      },
      setCampaignGoal: (goal) => set({ campaignGoal: goal }),
      toggleRegion: (region) =>
        set((s) => ({
          regions: s.regions.includes(region)
            ? s.regions.filter((r) => r !== region)
            : [...s.regions, region],
        })),
      setRegions: (regions) => set({ regions }),
      toggleCategory: (cat) =>
        set((s) => ({
          categories: s.categories.includes(cat)
            ? s.categories.filter((c) => c !== cat)
            : [...s.categories, cat],
        })),
      setCategories: (cats) => set({ categories: cats }),
      setBudget: (value) => set({ budget: value }),
      setMonths: (months) => set({ months }),
      setAgeKeys: (keys) => set({ ageKeys: normalizePlannerAgeKeys(keys) }),
      toggleAgeKey: (key) =>
        set((s) => {
          if (key === "ageAll") return { ageKeys: [] };
          const next = new Set(s.ageKeys);
          if (next.has(key)) next.delete(key);
          else next.add(key);
          return { ageKeys: [...next] };
        }),
      setIndustryKey: (key) => set({ industryKey: key }),
      setCampaignMediaIds: (action) =>
        set((s) => ({
          campaignMediaIds:
            typeof action === "function"
              ? action(s.campaignMediaIds)
              : action,
        })),
      setCreativeObjectUrl: (action) =>
        set((s) => ({
          creativeObjectUrl:
            typeof action === "function"
              ? action(s.creativeObjectUrl)
              : action,
        })),
      setCreativeUploadedUrl: (url) => set({ creativeUploadedUrl: url }),
      toggleDigitalChannel: (id) =>
        set((s) => ({
          digitalChannelIds: s.digitalChannelIds.includes(id)
            ? s.digitalChannelIds.filter((x) => x !== id)
            : [...s.digitalChannelIds, id],
        })),
      setDigitalChannelIds: (ids) => set({ digitalChannelIds: ids }),
      setDigitalBudgetPct: (pct) =>
        set({ digitalBudgetPct: Math.max(0, Math.min(50, pct)) }),
      setMediaPlacement: (mediaId, placement) =>
        set((s) => ({
          mediaPlacements: { ...s.mediaPlacements, [mediaId]: placement },
        })),
      clearMediaPlacement: (mediaId) =>
        set((s) => {
          const next = { ...s.mediaPlacements };
          delete next[mediaId];
          return { mediaPlacements: next };
        }),
      applyPreset: (id) => {
        if (id === "premium") {
          set({
            regions: ["seoul", "gyeonggi"],
            categories: ["digital", "static"],
            budget: "15000",
            months: 3,
            digitalBudgetPct: 25,
          });
        } else if (id === "national") {
          set({
            regions: ["seoul", "busan", "daegu", "gwangju", "daejeon"],
            categories: [...PLANNER_DEFAULT_CATEGORIES],
            budget: "50000",
            months: 6,
            digitalBudgetPct: 30,
          });
        } else {
          set({
            regions: ["seoul"],
            categories: ["static", "mobile"],
            budget: "5000",
            months: 2,
            digitalBudgetPct: 20,
          });
        }
      },
      applyScenario: (patch) =>
        set({
          regions:
            patch.regions.length > 0 ? [...patch.regions] : ["seoul"],
          categories:
            patch.categories.length > 0
              ? [...patch.categories]
              : [...PLANNER_DEFAULT_CATEGORIES],
          budget: String(patch.budgetMan),
          months: Math.max(1, Math.min(36, patch.months)),
        }),
      reset: () => set({ ...INITIAL }),
    }),
    {
      name: INTEGRATED_PLANNER_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        campaignGoal: s.campaignGoal,
        regions: s.regions,
        categories: s.categories,
        budget: s.budget,
        months: s.months,
        ageKeys: s.ageKeys,
        industryKey: s.industryKey,
        campaignMediaIds: s.campaignMediaIds,
        digitalChannelIds: s.digitalChannelIds,
        digitalBudgetPct: s.digitalBudgetPct,
        creativeUploadedUrl: s.creativeUploadedUrl,
        mediaPlacements: s.mediaPlacements,
      }),
      merge: (persisted, current) => {
        const p = persisted as Partial<IntegratedPlannerStoreState> | undefined;
        if (!p) return current;
        const legacy = p as Partial<IntegratedPlannerStoreState> & {
          ageKey?: PlannerAgeKey;
        };
        return {
          ...current,
          ...p,
          wizardStep: 1,
          creativeObjectUrl: null,
          categories: normalizePlannerCategories(p.categories),
          ageKeys: normalizePlannerAgeKeys(
            legacy.ageKeys ??
              (isPlannerAgeKey(legacy.ageKey) && legacy.ageKey !== "ageAll"
                ? [legacy.ageKey]
                : []),
          ),
          industryKey: isPlannerIndustryKey(p.industryKey)
            ? p.industryKey
            : current.industryKey,
          digitalChannelIds:
            p.digitalChannelIds && p.digitalChannelIds.length > 0
              ? normalizeDigitalChannelIds(
                  p.digitalChannelIds as unknown as string[],
                )
              : current.digitalChannelIds,
        };
      },
    },
  ),
);
