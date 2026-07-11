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
import type { AppliedPlannerScenario } from "@/lib/planner/scenario-types";
import { districtHintsToSeoulZones } from "@/lib/planner/apply-scenario-portfolio";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import {
  defaultFollowUpForGoal,
  normalizeFollowUpForGoal,
} from "@/lib/planner/goal-follow-up";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import {
  isPlannerSeoulZoneKey,
  suggestSeoulZones,
} from "@/lib/planner/seoul-zones";
import type { PlannerBusanZoneKey } from "@/lib/planner/busan-zones";
import {
  isPlannerBusanZoneKey,
  suggestBusanZones,
} from "@/lib/planner/busan-zones";
import type { PlannerGyeonggiZoneKey } from "@/lib/planner/gyeonggi-zones";
import {
  isPlannerGyeonggiZoneKey,
  suggestGyeonggiZones,
} from "@/lib/planner/gyeonggi-zones";
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
import {
  pruneCampaignMediaPriceOptionIndex,
  pruneCampaignMediaQuantities,
  type CampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
} from "@/lib/planner/planner-media-quantity";

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
  seoulZones: PlannerSeoulZoneKey[];
  busanZones: PlannerBusanZoneKey[];
  gyeonggiZones: PlannerGyeonggiZoneKey[];
  goalFollowUp: PlannerGoalFollowUp;
  campaignMediaIds: string[];
  /** 선택 OOH 매체별 수량 — 미지정 ID는 `getQuantityBounds().default` */
  campaignMediaQuantities: CampaignMediaQuantities;
  /** `priceOptions` 패키지 매체 선택 인덱스 */
  campaignMediaPriceOptionIndex: CampaignMediaPriceOptionIndex;
  digitalChannelIds: DigitalChannelId[];
  digitalBudgetPct: number;
  creativeObjectUrl: string | null;
  creativeUploadedUrl: string | null;
  mediaPlacements: Record<string, CompositeLogoPlacement>;
  /** 시나리오 카드 적용 시 보고서 맥락. 수동 진행 시 null */
  appliedScenario: AppliedPlannerScenario | null;
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
  toggleSeoulZone: (zone: PlannerSeoulZoneKey) => void;
  clearSeoulZones: () => void;
  applySuggestedSeoulZones: () => void;
  toggleBusanZone: (zone: PlannerBusanZoneKey) => void;
  clearBusanZones: () => void;
  applySuggestedBusanZones: () => void;
  toggleGyeonggiZone: (zone: PlannerGyeonggiZoneKey) => void;
  clearGyeonggiZones: () => void;
  applySuggestedGyeonggiZones: () => void;
  setGoalFollowUp: (patch: Partial<PlannerGoalFollowUp>) => void;
  setCampaignMediaIds: (action: SetStateAction<string[]>) => void;
  setCampaignMediaQuantity: (mediaId: string, units: number) => void;
  setCampaignMediaPriceOptionIndex: (mediaId: string, index: number) => void;
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
  seoulZones: [],
  busanZones: [],
  gyeonggiZones: [],
  goalFollowUp: {},
  campaignMediaIds: [],
  campaignMediaQuantities: {},
  campaignMediaPriceOptionIndex: {},
  digitalChannelIds: defaultDigitalChannelIds(),
  digitalBudgetPct: 30,
  creativeObjectUrl: null,
  creativeUploadedUrl: null,
  mediaPlacements: {},
  appliedScenario: null,
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
      setCampaignGoal: (goal) =>
        set((s) => ({
          campaignGoal: goal,
          goalFollowUp: normalizeFollowUpForGoal(
            goal,
            defaultFollowUpForGoal(goal, s.industryKey),
          ),
          ...(!s.seoulZones.length &&
          s.regions.includes("seoul") &&
          goal != null
            ? { seoulZones: suggestSeoulZones(goal, s.industryKey) }
            : {}),
          ...(!s.busanZones.length &&
          s.regions.includes("busan") &&
          goal != null
            ? { busanZones: suggestBusanZones(goal, s.industryKey) }
            : {}),
          ...(!s.gyeonggiZones.length &&
          s.regions.includes("gyeonggi") &&
          goal != null
            ? { gyeonggiZones: suggestGyeonggiZones(goal, s.industryKey) }
            : {}),
        })),
      toggleRegion: (region) =>
        set((s) => {
          if (s.regions.includes(region)) {
            const next = s.regions.filter((r) => r !== region);
            if (next.length === 0) return {};
            const patch: Partial<IntegratedPlannerStoreState> = { regions: next };
            if (region === "busan") patch.busanZones = [];
            if (region === "gyeonggi") patch.gyeonggiZones = [];
            return patch;
          }
          const next = [...s.regions, region];
          const patch: Partial<IntegratedPlannerStoreState> = { regions: next };
          if (
            region === "busan" &&
            !s.busanZones.length &&
            s.campaignGoal != null
          ) {
            patch.busanZones = suggestBusanZones(s.campaignGoal, s.industryKey);
          }
          if (
            region === "gyeonggi" &&
            !s.gyeonggiZones.length &&
            s.campaignGoal != null
          ) {
            patch.gyeonggiZones = suggestGyeonggiZones(
              s.campaignGoal,
              s.industryKey,
            );
          }
          return patch;
        }),
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
      setIndustryKey: (key) =>
        set((s) => ({
          industryKey: key,
          ...(s.regions.includes("seoul") && s.campaignGoal != null
            ? { seoulZones: suggestSeoulZones(s.campaignGoal, key) }
            : {}),
          ...(s.regions.includes("busan") && s.campaignGoal != null
            ? { busanZones: suggestBusanZones(s.campaignGoal, key) }
            : {}),
          ...(s.regions.includes("gyeonggi") && s.campaignGoal != null
            ? { gyeonggiZones: suggestGyeonggiZones(s.campaignGoal, key) }
            : {}),
        })),
      toggleSeoulZone: (zone) =>
        set((s) => {
          const next = new Set(s.seoulZones);
          if (next.has(zone)) next.delete(zone);
          else next.add(zone);
          return { seoulZones: [...next] as PlannerSeoulZoneKey[] };
        }),
      clearSeoulZones: () => set({ seoulZones: [] }),
      applySuggestedSeoulZones: () =>
        set((s) => ({
          seoulZones: suggestSeoulZones(s.campaignGoal, s.industryKey),
        })),
      toggleBusanZone: (zone) =>
        set((s) => {
          const next = new Set(s.busanZones);
          if (next.has(zone)) next.delete(zone);
          else next.add(zone);
          return { busanZones: [...next] as PlannerBusanZoneKey[] };
        }),
      clearBusanZones: () => set({ busanZones: [] }),
      applySuggestedBusanZones: () =>
        set((s) => ({
          busanZones: suggestBusanZones(s.campaignGoal, s.industryKey),
        })),
      toggleGyeonggiZone: (zone) =>
        set((s) => {
          const next = new Set(s.gyeonggiZones);
          if (next.has(zone)) next.delete(zone);
          else next.add(zone);
          return { gyeonggiZones: [...next] as PlannerGyeonggiZoneKey[] };
        }),
      clearGyeonggiZones: () => set({ gyeonggiZones: [] }),
      applySuggestedGyeonggiZones: () =>
        set((s) => ({
          gyeonggiZones: suggestGyeonggiZones(s.campaignGoal, s.industryKey),
        })),
      setGoalFollowUp: (patch) =>
        set((s) => ({
          goalFollowUp: normalizeFollowUpForGoal(s.campaignGoal, {
            ...s.goalFollowUp,
            ...patch,
          }),
        })),
      setCampaignMediaIds: (action) =>
        set((s) => {
          const nextIds =
            typeof action === "function"
              ? action(s.campaignMediaIds)
              : [...action];
          return {
            campaignMediaIds: nextIds,
            campaignMediaQuantities: pruneCampaignMediaQuantities(
              nextIds,
              s.campaignMediaQuantities,
            ),
            campaignMediaPriceOptionIndex: pruneCampaignMediaPriceOptionIndex(
              nextIds,
              s.campaignMediaPriceOptionIndex,
            ),
          };
        }),

      setCampaignMediaQuantity: (mediaId, units) =>
        set((s) => {
          if (!s.campaignMediaIds.includes(mediaId)) return {};
          const q = Math.round(units);
          if (!Number.isFinite(q) || q <= 0) return {};
          return {
            campaignMediaQuantities: {
              ...s.campaignMediaQuantities,
              [mediaId]: q,
            },
          };
        }),

      setCampaignMediaPriceOptionIndex: (mediaId, index) =>
        set((s) => {
          if (!s.campaignMediaIds.includes(mediaId)) return {};
          const i = Math.round(index);
          if (!Number.isFinite(i) || i < 0) return {};
          return {
            campaignMediaPriceOptionIndex: {
              ...s.campaignMediaPriceOptionIndex,
              [mediaId]: i,
            },
          };
        }),
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
        set((s) => {
          const regions =
            patch.regions.length > 0 ? [...patch.regions] : ["seoul"];
          const categories =
            patch.categories.length > 0
              ? [...patch.categories]
              : [...PLANNER_DEFAULT_CATEGORIES];
          const months = Math.max(1, Math.min(36, patch.months));
          const campaignMediaIds = [...(patch.campaignMediaIds ?? [])];
          const seoulZones =
            patch.seoulZones ??
            districtHintsToSeoulZones(patch.districtHints ?? []);
          const busanZones = patch.busanZones ?? [];
          const gyeonggiZones = patch.gyeonggiZones ?? [];

          return {
            regions,
            categories,
            budget: String(patch.budgetMan),
            months,
            ...(patch.campaignGoal !== undefined
              ? {
                  campaignGoal: patch.campaignGoal,
                  goalFollowUp: normalizeFollowUpForGoal(
                    patch.campaignGoal,
                    patch.goalFollowUp ?? s.goalFollowUp,
                  ),
                }
              : patch.goalFollowUp !== undefined
                ? {
                    goalFollowUp: normalizeFollowUpForGoal(
                      s.campaignGoal,
                      patch.goalFollowUp,
                    ),
                  }
                : {}),
            ...(patch.industryKey !== undefined
              ? { industryKey: patch.industryKey }
              : {}),
            ...(patch.ageKeys !== undefined
              ? { ageKeys: normalizePlannerAgeKeys(patch.ageKeys) }
              : {}),
            ...(seoulZones.length > 0 ? { seoulZones } : {}),
            ...(busanZones.length > 0 ? { busanZones } : {}),
            ...(gyeonggiZones.length > 0 ? { gyeonggiZones } : {}),
            campaignMediaIds,
            campaignMediaQuantities: {},
            campaignMediaPriceOptionIndex: {},
            ...(patch.appliedScenario !== undefined
              ? { appliedScenario: patch.appliedScenario }
              : {}),
          };
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
        seoulZones: s.seoulZones,
        busanZones: s.busanZones,
        gyeonggiZones: s.gyeonggiZones,
        goalFollowUp: s.goalFollowUp,
        campaignMediaIds: s.campaignMediaIds,
        campaignMediaQuantities: s.campaignMediaQuantities,
        campaignMediaPriceOptionIndex: s.campaignMediaPriceOptionIndex,
        digitalChannelIds: s.digitalChannelIds,
        digitalBudgetPct: s.digitalBudgetPct,
        creativeUploadedUrl: s.creativeUploadedUrl,
        mediaPlacements: s.mediaPlacements,
        appliedScenario: s.appliedScenario,
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
          seoulZones: Array.isArray(p.seoulZones)
            ? p.seoulZones.filter(isPlannerSeoulZoneKey)
            : current.seoulZones,
          busanZones: Array.isArray(p.busanZones)
            ? p.busanZones.filter(isPlannerBusanZoneKey)
            : current.busanZones,
          gyeonggiZones: Array.isArray(p.gyeonggiZones)
            ? p.gyeonggiZones.filter(isPlannerGyeonggiZoneKey)
            : current.gyeonggiZones,
          goalFollowUp:
            p.goalFollowUp &&
            typeof p.goalFollowUp === "object" &&
            !Array.isArray(p.goalFollowUp)
              ? normalizeFollowUpForGoal(
                  (p.campaignGoal as PlannerCampaignGoal | null) ??
                    current.campaignGoal,
                  p.goalFollowUp as PlannerGoalFollowUp,
                )
              : current.goalFollowUp,
          digitalChannelIds:
            p.digitalChannelIds && p.digitalChannelIds.length > 0
              ? normalizeDigitalChannelIds(
                  p.digitalChannelIds as unknown as string[],
                )
              : current.digitalChannelIds,
          campaignMediaQuantities: (() => {
            const ids = Array.isArray(p.campaignMediaIds)
              ? p.campaignMediaIds.filter((id): id is string => typeof id === "string")
              : current.campaignMediaIds;
            if (
              p.campaignMediaQuantities &&
              typeof p.campaignMediaQuantities === "object" &&
              !Array.isArray(p.campaignMediaQuantities)
            ) {
              const qty: CampaignMediaQuantities = {};
              for (const [id, v] of Object.entries(
                p.campaignMediaQuantities as Record<string, unknown>,
              )) {
                const n = typeof v === "number" ? v : Number(v);
                if (Number.isFinite(n) && n > 0) qty[id] = Math.round(n);
              }
              return pruneCampaignMediaQuantities(ids, qty);
            }
            return {};
          })(),
          campaignMediaPriceOptionIndex: (() => {
            const ids = Array.isArray(p.campaignMediaIds)
              ? p.campaignMediaIds.filter((id): id is string => typeof id === "string")
              : current.campaignMediaIds;
            if (
              p.campaignMediaPriceOptionIndex &&
              typeof p.campaignMediaPriceOptionIndex === "object" &&
              !Array.isArray(p.campaignMediaPriceOptionIndex)
            ) {
              const idx: CampaignMediaPriceOptionIndex = {};
              for (const [id, v] of Object.entries(
                p.campaignMediaPriceOptionIndex as Record<string, unknown>,
              )) {
                const n = typeof v === "number" ? v : Number(v);
                if (Number.isFinite(n) && n >= 0) idx[id] = Math.round(n);
              }
              return pruneCampaignMediaPriceOptionIndex(ids, idx);
            }
            return {};
          })(),
          appliedScenario:
            p.appliedScenario &&
            typeof p.appliedScenario === "object" &&
            !Array.isArray(p.appliedScenario) &&
            typeof p.appliedScenario.id === "string" &&
            typeof p.appliedScenario.variant === "string" &&
            typeof p.appliedScenario.labelKo === "string" &&
            typeof p.appliedScenario.labelEn === "string"
              ? {
                  id: p.appliedScenario.id,
                  variant: p.appliedScenario.variant,
                  labelKo: p.appliedScenario.labelKo,
                  labelEn: p.appliedScenario.labelEn,
                  descriptionKo: p.appliedScenario.descriptionKo ?? "",
                  descriptionEn: p.appliedScenario.descriptionEn ?? "",
                }
              : current.appliedScenario,
        };
      },
    },
  ),
);
