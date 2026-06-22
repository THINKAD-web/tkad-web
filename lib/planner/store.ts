"use client";

import type { SetStateAction } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  PLANNER_BUDGET_MAX,
  PLANNER_BUDGET_MIN,
  PLANNER_DEFAULT_CATEGORIES,
  PLANNER_LAST_INPUT_STEP,
  PLANNER_RESULT_STEP,
  normalizePlannerAgeKeys,
  isPlannerAgeKey,
  isPlannerIndustryKey,
  normalizePlannerCategories,
  type PlannerAgeKey,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerIndustryKey,
  type PlannerPresetId,
  type PlannerWizardStep,
} from "@/lib/planner/types";
import type { PlannerScenarioApplyPatch } from "@/lib/planner/scenario-types";
import { districtHintsToSeoulZones } from "@/lib/planner/apply-scenario-portfolio";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import {
  defaultFollowUpForGoal,
  normalizeFollowUpForGoal,
} from "@/lib/planner/goal-follow-up";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import { isPlannerSeoulZoneKey, suggestSeoulZones } from "@/lib/planner/seoul-zones";
import {
  getScenarioPreset,
  type PlannerScenarioPresetId,
} from "@/lib/planner/scenario-presets";
import { hydratePlannerFromSavedPlan } from "@/lib/planner/hydrate-from-saved-plan";
import { hydratePlannerFromPlanCart } from "@/lib/plan-cart-planner-bridge";
import type { PlanCart } from "@/lib/plan-cart";
import type { SavedPlannerPlanJson } from "@/lib/planner/contact-prefill";

/**
 * localStorage key. 과거 `tkad-planner-plan-v2` 포맷(v2/v3)과 호환되도록
 * `migrate()` 훅에서 흡수한다. persist 자체 version은 별도 관리.
 */
export const PLANNER_STORAGE_KEY = "tkad-planner-plan-v2";
const PLANNER_PERSIST_VERSION = 4;

export type PlannerStoreState = {
  wizardStep: PlannerWizardStep;
  campaignGoal: PlannerCampaignGoal | null;
  /** `PlannerMapRegion` 문자열 배열. Set 대신 직렬화 친화적 배열을 저장. */
  regions: string[];
  categories: PlannerCategory[];
  /** 사용자 원본 입력 유지 (빈 문자열·중간값 허용). 정규화 값은 selector 사용. */
  budget: string;
  months: number;
  ageKeys: PlannerAgeKey[];
  industryKey: PlannerIndustryKey;
  campaignMediaIds: string[];
  /** 로컬 Object URL. 메모리 전용이라 persist 대상에서 제외. */
  creativeObjectUrl: string | null;
  /** Cloudinary 업로드된 크리에이티브 secure_url. persist 포함. */
  creativeUploadedUrl: string | null;
  /** 매체별 로고 배치 좌표 (Canvas 편집 결과). key = media id. persist 포함. */
  mediaPlacements: Record<string, CompositeLogoPlacement>;
  /**
   * campaignMediaIds 가 비어 있지 않으면 true (직접·시나리오 자동선택 포함).
   * 비어 있으면 false → resolvePlannerPortfolio 자동조합 허용.
   */
  /** 서울 선택 시 하위 상권. 빈 배열 = 서울 전체 */
  seoulZones: PlannerSeoulZoneKey[];
  /** true면 상권 추천 자동 적용 안 함 (회귀·수동 클리어) */
  seoulZonesTouched: boolean;
  /** Step 2 목표별 후속 (전부 optional) */
  goalFollowUp: PlannerGoalFollowUp;
  mediaSelectionExplicit: boolean;
};

export type PlannerStoreActions = {
  setWizardStep: (step: PlannerWizardStep) => void;
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
  setSeoulZones: (zones: PlannerSeoulZoneKey[]) => void;
  clearSeoulZones: () => void;
  applySuggestedSeoulZones: () => void;
  setGoalFollowUp: (patch: Partial<PlannerGoalFollowUp>) => void;
  applyScenarioPreset: (id: PlannerScenarioPresetId) => void;
  /** React `Dispatch<SetStateAction<string[]>>` 호환 — 기존 하위 컴포넌트 시그니처 유지용 */
  setCampaignMediaIds: (action: SetStateAction<string[]>) => void;
  /** React `Dispatch<SetStateAction<string | null>>` 호환 */
  setCreativeObjectUrl: (action: SetStateAction<string | null>) => void;
  setCreativeUploadedUrl: (url: string | null) => void;
  setMediaPlacement: (
    mediaId: string,
    placement: CompositeLogoPlacement,
  ) => void;
  clearMediaPlacement: (mediaId: string) => void;
  resetAllMediaPlacements: () => void;
  applyPreset: (id: PlannerPresetId) => void;
  /** 동적 시나리오 1안 → 조건·매체 자동선택 일괄 세팅 */
  applyScenario: (patch: PlannerScenarioApplyPatch) => void;
  reset: () => void;
  /** 저장된 공유 플랜 JSON으로 입력 상태 복원 */
  importFromSavedPlan: (plan: SavedPlannerPlanJson) => void;
  /** 내 플랜 카트 → 플래너 입력 교체 (옛 세션 매체와 merge 하지 않음) */
  importFromPlanCart: (cart: PlanCart) => void;
};

export type PlannerStore = PlannerStoreState & PlannerStoreActions;

const INITIAL_STATE: PlannerStoreState = {
  wizardStep: 1,
  campaignGoal: null,
  regions: ["seoul"],
  categories: [...PLANNER_DEFAULT_CATEGORIES],
  budget: "5000",
  months: 3,
  ageKeys: [] as PlannerAgeKey[],
  industryKey: "indOther",
  seoulZones: [],
  seoulZonesTouched: true,
  goalFollowUp: {},
  campaignMediaIds: [],
  creativeObjectUrl: null,
  creativeUploadedUrl: null,
  mediaPlacements: {},
  mediaSelectionExplicit: false,
};

function clampWizardStep(n: number): PlannerWizardStep {
  if (n < 1) return 1;
  if (n > PLANNER_RESULT_STEP) return PLANNER_RESULT_STEP;
  return n as PlannerWizardStep;
}

export const usePlannerStore = create<PlannerStore>()(
  persist(
    (set) => ({
      ...INITIAL_STATE,

      setWizardStep: (step) => {
        const next = clampWizardStep(step);
        set({ wizardStep: next });
        if (typeof window !== "undefined" && next >= 2) {
          void import("@/lib/ga-events").then(({ trackGaEvent }) =>
            trackGaEvent("planner_use", { wizard_step: next }),
          );
        }
      },

      goNextStep: () =>
        set((s) => ({
          wizardStep: clampWizardStep(s.wizardStep + 1),
        })),

      goPrevStep: () =>
        set((s) => ({
          wizardStep: clampWizardStep(s.wizardStep - 1),
        })),

      setCampaignGoal: (goal) =>
        set((s) => ({
          campaignGoal: goal,
          goalFollowUp: normalizeFollowUpForGoal(
            goal,
            defaultFollowUpForGoal(goal, s.industryKey),
          ),
          ...(!s.seoulZonesTouched &&
          s.regions.includes("seoul") &&
          goal != null
            ? {
                seoulZones: suggestSeoulZones(goal, s.industryKey),
              }
            : {}),
        })),

      toggleRegion: (region) =>
        set((s) => {
          const next = new Set(s.regions);
          if (next.has(region)) {
            if (next.size <= 1) return {};
            next.delete(region);
            const patch: Partial<PlannerStoreState> = { regions: [...next] };
            if (region === "seoul") {
              patch.seoulZones = [];
              patch.seoulZonesTouched = true;
            }
            return patch;
          }
          next.add(region);
          const patch: Partial<PlannerStoreState> = { regions: [...next] };
          if (
            region === "seoul" &&
            !s.seoulZonesTouched &&
            s.campaignGoal != null
          ) {
            patch.seoulZones = suggestSeoulZones(s.campaignGoal, s.industryKey);
          }
          return patch;
        }),

      setRegions: (regions) =>
        set({ regions: regions.length > 0 ? [...regions] : ["seoul"] }),

      toggleCategory: (cat) =>
        set((s) => {
          const next = new Set(s.categories);
          if (next.has(cat)) {
            if (next.size <= 1) return {};
            next.delete(cat);
          } else {
            next.add(cat);
          }
          return { categories: [...next] };
        }),

      setCategories: (cats) =>
        set({
          categories:
            cats.length > 0 ? [...cats] : [...PLANNER_DEFAULT_CATEGORIES],
        }),

      setBudget: (value) => set({ budget: value }),

      setMonths: (months) => set({ months }),

      setAgeKeys: (keys) =>
        set({
          ageKeys: normalizePlannerAgeKeys(keys),
        }),

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
          ...(!s.seoulZonesTouched &&
          s.regions.includes("seoul") &&
          s.campaignGoal != null
            ? { seoulZones: suggestSeoulZones(s.campaignGoal, key) }
            : {}),
        })),

      toggleSeoulZone: (zone) =>
        set((s) => {
          const next = new Set(s.seoulZones);
          if (next.has(zone)) next.delete(zone);
          else next.add(zone);
          return { seoulZones: [...next] as PlannerSeoulZoneKey[], seoulZonesTouched: true };
        }),

      setSeoulZones: (zones) =>
        set({ seoulZones: [...zones], seoulZonesTouched: true }),

      clearSeoulZones: () => set({ seoulZones: [], seoulZonesTouched: true }),

      applySuggestedSeoulZones: () =>
        set((s) => ({
          seoulZones: suggestSeoulZones(s.campaignGoal, s.industryKey),
          seoulZonesTouched: false,
        })),

      setGoalFollowUp: (patch) =>
        set((s) => ({
          goalFollowUp: normalizeFollowUpForGoal(s.campaignGoal, {
            ...s.goalFollowUp,
            ...patch,
          }),
        })),

      applyScenarioPreset: (id) =>
        set(() => {
          const preset = getScenarioPreset(id);
          if (!preset) return {};
          return {
            campaignGoal: preset.goal,
            industryKey: preset.industryKey,
            regions: [...preset.regions],
            seoulZones: [...preset.seoulZones],
            seoulZonesTouched: true,
            categories: [...preset.categories],
            goalFollowUp: normalizeFollowUpForGoal(
              preset.goal,
              preset.followUp,
            ),
          };
        }),

      setCampaignMediaIds: (action) =>
        set((s) => {
          const nextIds =
            typeof action === "function"
              ? action(s.campaignMediaIds)
              : [...action];
          return {
            campaignMediaIds: nextIds,
            mediaSelectionExplicit: nextIds.length > 0,
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

      setMediaPlacement: (mediaId, placement) =>
        set((s) => ({
          mediaPlacements: { ...s.mediaPlacements, [mediaId]: placement },
        })),

      clearMediaPlacement: (mediaId) =>
        set((s) => {
          if (!(mediaId in s.mediaPlacements)) return {};
          const next = { ...s.mediaPlacements };
          delete next[mediaId];
          return { mediaPlacements: next };
        }),

      resetAllMediaPlacements: () => set({ mediaPlacements: {} }),

      applyPreset: (id) =>
        set(() => {
          if (id === "premium") {
            return {
              regions: ["seoul"],
              categories: ["digital", "static"],
            };
          }
          if (id === "national") {
            return {
              regions: [
                "seoul",
                "gyeonggi",
                "incheon",
                "busan",
                "daegu",
                "jeju",
              ],
              categories: [...PLANNER_DEFAULT_CATEGORIES],
            };
          }
          return {
            regions: ["seoul", "gyeonggi", "incheon", "busan", "national"],
            categories: [...PLANNER_DEFAULT_CATEGORIES],
          };
        }),

      applyScenario: (patch) =>
        set((s) => {
          const regions =
            patch.regions.length > 0 ? [...patch.regions] : ["seoul"];
          const categories =
            patch.categories.length > 0
              ? [...patch.categories]
              : [...PLANNER_DEFAULT_CATEGORIES];
          const months = Math.max(1, Math.min(36, patch.months));
          const seoulZones =
            patch.seoulZones ??
            districtHintsToSeoulZones(patch.districtHints ?? []);
          const campaignMediaIds = [...(patch.campaignMediaIds ?? [])];

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
            seoulZones,
            seoulZonesTouched: seoulZones.length > 0,
            campaignMediaIds,
            mediaSelectionExplicit: campaignMediaIds.length > 0,
          };
        }),

      reset: () => set({ ...INITIAL_STATE }),

      importFromSavedPlan: (plan) =>
        set({
          ...INITIAL_STATE,
          ...hydratePlannerFromSavedPlan(plan),
          wizardStep: 1,
          creativeObjectUrl: null,
        }),

      importFromPlanCart: (cart) =>
        set((s) => {
          const patch = hydratePlannerFromPlanCart(cart);
          const ids = patch.campaignMediaIds ?? [];
          const placements: Record<string, CompositeLogoPlacement> = {};
          for (const id of ids) {
            const p = s.mediaPlacements[id];
            if (p) placements[id] = p;
          }
          return {
            ...patch,
            campaignMediaIds: ids,
            mediaPlacements: placements,
            mediaSelectionExplicit: ids.length > 0,
            wizardStep: 4,
            creativeObjectUrl: null,
          };
        }),
    }),
    {
      name: PLANNER_STORAGE_KEY,
      version: PLANNER_PERSIST_VERSION,
      storage: createJSONStorage(() => localStorage),
      /**
       * 입력값만 persist. `wizardStep`/`creativeObjectUrl` 은 저장 제외:
       * - wizardStep: 진입 시 hydration flash 방지, 항상 Step 1 부터 재개
       * - creativeObjectUrl: Object URL 은 세션 간 재사용 불가
       */
      partialize: (state) => ({
        campaignGoal: state.campaignGoal,
        regions: state.regions,
        categories: state.categories,
        budget: state.budget,
        months: state.months,
        ageKeys: state.ageKeys,
        industryKey: state.industryKey,
        seoulZones: state.seoulZones,
        seoulZonesTouched: state.seoulZonesTouched,
        goalFollowUp: state.goalFollowUp,
        campaignMediaIds: state.campaignMediaIds,
        creativeUploadedUrl: state.creativeUploadedUrl,
        mediaPlacements: state.mediaPlacements,
        mediaSelectionExplicit: state.mediaSelectionExplicit,
      }),
      /**
       * 레거시 포맷:
       *   v1: { version:1, region: "all"|<one>, categories?, budget?, months? }
       *   v2: { version:2, regions:[], categories:[], budget(number), months, campaignGoal, ageKey, industryKey, wizardStep, campaignMediaIds }
       *   v3: v2와 동일 shape
       * Zustand persist가 전달하는 persistedState 는 `{ state, version }` 언래핑된 값.
       */
      migrate: (persistedState, fromVersion) => {
        const raw = (persistedState ?? {}) as Record<string, unknown>;
        const merged: PlannerStoreState = { ...INITIAL_STATE };

        // region: v1은 단일 region 문자열, v2+ 는 regions 배열
        if (fromVersion <= 1 && typeof raw.region === "string") {
          merged.regions =
            raw.region === "all"
              ? ["seoul", "busan", "jeju", "national"]
              : [raw.region];
        } else if (Array.isArray(raw.regions)) {
          const rs = raw.regions.filter(
            (r): r is string => typeof r === "string",
          );
          if (rs.length > 0) merged.regions = rs;
        }

        merged.categories = normalizePlannerCategories(raw.categories);

        if (typeof raw.budget === "number") {
          const b = Math.max(
            PLANNER_BUDGET_MIN,
            Math.min(PLANNER_BUDGET_MAX, raw.budget),
          );
          merged.budget = String(b);
        } else if (typeof raw.budget === "string") {
          merged.budget = raw.budget;
        }

        if (typeof raw.months === "number") merged.months = raw.months;

        if (typeof raw.campaignGoal === "string") {
          merged.campaignGoal = raw.campaignGoal as PlannerCampaignGoal;
        }

        if (isPlannerAgeKey(raw.ageKey) && raw.ageKey !== "ageAll") {
          merged.ageKeys = [raw.ageKey];
        }
        merged.ageKeys = normalizePlannerAgeKeys(
          raw.ageKeys ?? merged.ageKeys,
        );
        if (isPlannerIndustryKey(raw.industryKey))
          merged.industryKey = raw.industryKey;

        if (Array.isArray(raw.seoulZones)) {
          merged.seoulZones = raw.seoulZones.filter(isPlannerSeoulZoneKey);
        }
        if (fromVersion < 4) {
          merged.seoulZonesTouched = true;
        } else if (typeof raw.seoulZonesTouched === "boolean") {
          merged.seoulZonesTouched = raw.seoulZonesTouched;
        }

        if (
          raw.goalFollowUp &&
          typeof raw.goalFollowUp === "object" &&
          !Array.isArray(raw.goalFollowUp)
        ) {
          merged.goalFollowUp = normalizeFollowUpForGoal(
            merged.campaignGoal,
            raw.goalFollowUp as PlannerGoalFollowUp,
          );
        }

        // wizardStep 은 persist 대상이 아님 (항상 Step 1 부터 재개).
        // 레거시 저장본의 wizardStep 는 무시.

        if (Array.isArray(raw.campaignMediaIds)) {
          merged.campaignMediaIds = raw.campaignMediaIds.filter(
            (id): id is string => typeof id === "string",
          );
        }

        merged.mediaSelectionExplicit = merged.campaignMediaIds.length > 0;

        if (typeof raw.creativeUploadedUrl === "string") {
          merged.creativeUploadedUrl = raw.creativeUploadedUrl;
        }

        if (
          raw.mediaPlacements &&
          typeof raw.mediaPlacements === "object" &&
          !Array.isArray(raw.mediaPlacements)
        ) {
          merged.mediaPlacements = raw.mediaPlacements as Record<
            string,
            CompositeLogoPlacement
          >;
        }

        return merged as unknown as PlannerStore;
      },
    },
  ),
);

/** 사용자 입력을 BUDGET 범위로 정규화한 숫자값 */
export function selectBudgetNum(s: PlannerStoreState): number {
  const n = Number.parseInt(s.budget.replace(/,/g, ""), 10);
  if (!Number.isFinite(n)) return PLANNER_BUDGET_MIN;
  return Math.min(PLANNER_BUDGET_MAX, Math.max(PLANNER_BUDGET_MIN, n));
}

/** 입력 마지막 단계까지 진행했는지 */
export function selectIsOnResultStep(s: PlannerStoreState): boolean {
  return s.wizardStep > PLANNER_LAST_INPUT_STEP;
}
