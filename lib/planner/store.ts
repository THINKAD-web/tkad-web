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
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import type { SavedPlannerPlanJson } from "@/lib/planner/contact-prefill";
import { hydratePlannerFromSavedPlan } from "@/lib/planner/hydrate-from-saved-plan";

/**
 * localStorage key. 과거 `tkad-planner-plan-v2` 포맷(v2/v3)과 호환되도록
 * `migrate()` 훅에서 흡수한다. persist 자체 version은 별도 관리.
 */
export const PLANNER_STORAGE_KEY = "tkad-planner-plan-v2";
const PLANNER_PERSIST_VERSION = 3;

export type PlannerStoreState = {
  wizardStep: PlannerWizardStep;
  campaignGoal: PlannerCampaignGoal | null;
  /** `PlannerMapRegion` 문자열 배열. Set 대신 직렬화 친화적 배열을 저장. */
  regions: string[];
  categories: PlannerCategory[];
  /** 사용자 원본 입력 유지 (빈 문자열·중간값 허용). 정규화 값은 selector 사용. */
  budget: string;
  months: number;
  ageKey: PlannerAgeKey;
  industryKey: PlannerIndustryKey;
  campaignMediaIds: string[];
  /** 로컬 Object URL. 메모리 전용이라 persist 대상에서 제외. */
  creativeObjectUrl: string | null;
  /** Cloudinary 업로드된 크리에이티브 secure_url. persist 포함. */
  creativeUploadedUrl: string | null;
  /** 매체별 로고 배치 좌표 (Canvas 편집 결과). key = media id. persist 포함. */
  mediaPlacements: Record<string, CompositeLogoPlacement>;
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
  setAgeKey: (key: PlannerAgeKey) => void;
  setIndustryKey: (key: PlannerIndustryKey) => void;
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
  reset: () => void;
  /** 저장된 공유 플랜 JSON으로 입력 상태 복원 */
  importFromSavedPlan: (plan: SavedPlannerPlanJson) => void;
};

export type PlannerStore = PlannerStoreState & PlannerStoreActions;

const INITIAL_STATE: PlannerStoreState = {
  wizardStep: 1,
  campaignGoal: null,
  regions: ["seoul"],
  categories: [...PLANNER_DEFAULT_CATEGORIES],
  budget: "5000",
  months: 3,
  ageKey: "ageAll",
  industryKey: "indOther",
  campaignMediaIds: [],
  creativeObjectUrl: null,
  creativeUploadedUrl: null,
  mediaPlacements: {},
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

      setCampaignGoal: (goal) => set({ campaignGoal: goal }),

      toggleRegion: (region) =>
        set((s) => {
          const next = new Set(s.regions);
          if (next.has(region)) {
            if (next.size <= 1) return {};
            next.delete(region);
          } else {
            next.add(region);
          }
          return { regions: [...next] };
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

      setAgeKey: (key) => set({ ageKey: key }),

      setIndustryKey: (key) => set({ industryKey: key }),

      setCampaignMediaIds: (action) =>
        set((s) => ({
          campaignMediaIds:
            typeof action === "function"
              ? action(s.campaignMediaIds)
              : [...action],
        })),

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
              regions: ["seoul", "busan", "jeju"],
              categories: [...PLANNER_DEFAULT_CATEGORIES],
            };
          }
          return {
            regions: ["seoul", "busan", "national"],
            categories: [...PLANNER_DEFAULT_CATEGORIES],
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
        ageKey: state.ageKey,
        industryKey: state.industryKey,
        campaignMediaIds: state.campaignMediaIds,
        creativeUploadedUrl: state.creativeUploadedUrl,
        mediaPlacements: state.mediaPlacements,
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

        if (isPlannerAgeKey(raw.ageKey)) merged.ageKey = raw.ageKey;
        if (isPlannerIndustryKey(raw.industryKey))
          merged.industryKey = raw.industryKey;

        // wizardStep 은 persist 대상이 아님 (항상 Step 1 부터 재개).
        // 레거시 저장본의 wizardStep 는 무시.

        if (Array.isArray(raw.campaignMediaIds)) {
          merged.campaignMediaIds = raw.campaignMediaIds.filter(
            (id): id is string => typeof id === "string",
          );
        }

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
