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
  isPlannerGenderKey,
  isPlannerIndustryKey,
  isPlannerInterestKey,
  isPlannerPurposeKey,
  normalizePlannerCategories,
  purposeToCampaignGoal,
  type PlannerAgeKey,
  type PlannerCampaignGoal,
  type PlannerCategory,
  type PlannerGenderKey,
  type PlannerIndustryKey,
  type PlannerInterestKey,
  type PlannerPurposeKey,
  type PlannerPresetId,
  type PlannerWizardStep,
} from "@/lib/planner/types";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";

/**
 * localStorage key. 과거 `tkad-planner-plan-v2` 포맷(v2/v3)과 호환되도록
 * `migrate()` 훅에서 흡수한다. persist 자체 version은 별도 관리.
 */
export const PLANNER_STORAGE_KEY = "tkad-planner-plan-v2";
const PLANNER_PERSIST_VERSION = 4;

export type PlannerStoreState = {
  wizardStep: PlannerWizardStep;
  brandName: string;
  campaignPurposes: PlannerPurposeKey[];
  campaignGoal: PlannerCampaignGoal | null;
  /** `PlannerMapRegion` 문자열 배열. Set 대신 직렬화 친화적 배열을 저장. */
  regions: string[];
  categories: PlannerCategory[];
  /** 사용자 원본 입력 유지 (빈 문자열·중간값 허용). 정규화 값은 selector 사용. */
  budget: string;
  months: number;
  ageKey: PlannerAgeKey;
  genderKey: PlannerGenderKey;
  interestKeys: PlannerInterestKey[];
  industryKey: PlannerIndustryKey;
  flightStart: string;
  flightEnd: string;
  campaignMediaIds: string[];
  aiBudgetByMediaId: Record<string, number>;
  aiRecommendSummary: string | null;
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
  setBrandName: (name: string) => void;
  toggleCampaignPurpose: (purpose: PlannerPurposeKey) => void;
  setCampaignGoal: (goal: PlannerCampaignGoal | null) => void;
  setGenderKey: (key: PlannerGenderKey) => void;
  toggleInterestKey: (key: PlannerInterestKey) => void;
  setFlightRange: (start: string, end: string) => void;
  setAiRecommendation: (
    mediaIds: string[],
    budgetByMediaId: Record<string, number>,
    summary: string | null,
  ) => void;
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
};

export type PlannerStore = PlannerStoreState & PlannerStoreActions;

const INITIAL_STATE: PlannerStoreState = {
  wizardStep: 1,
  brandName: "",
  campaignPurposes: [],
  campaignGoal: null,
  regions: ["seoul"],
  categories: [...PLANNER_DEFAULT_CATEGORIES],
  budget: "5000",
  months: 3,
  ageKey: "ageAll",
  genderKey: "genderAll",
  interestKeys: [],
  industryKey: "indOther",
  flightStart: "",
  flightEnd: "",
  campaignMediaIds: [],
  aiBudgetByMediaId: {},
  aiRecommendSummary: null,
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

      setWizardStep: (step) =>
        set({ wizardStep: clampWizardStep(step) }),

      goNextStep: () =>
        set((s) => ({
          wizardStep: clampWizardStep(s.wizardStep + 1),
        })),

      goPrevStep: () =>
        set((s) => ({
          wizardStep: clampWizardStep(s.wizardStep - 1),
        })),

      setBrandName: (name) => set({ brandName: name }),

      toggleCampaignPurpose: (purpose) =>
        set((s) => {
          const has = s.campaignPurposes.includes(purpose);
          const campaignPurposes = has
            ? s.campaignPurposes.filter((p) => p !== purpose)
            : [...s.campaignPurposes, purpose];
          const campaignGoal =
            campaignPurposes.length > 0
              ? purposeToCampaignGoal(campaignPurposes[0])
              : null;
          return { campaignPurposes, campaignGoal };
        }),

      setCampaignGoal: (goal) => set({ campaignGoal: goal }),

      setGenderKey: (key) => set({ genderKey: key }),

      toggleInterestKey: (key) =>
        set((s) => {
          const has = s.interestKeys.includes(key);
          return {
            interestKeys: has
              ? s.interestKeys.filter((k) => k !== key)
              : [...s.interestKeys, key],
          };
        }),

      setFlightRange: (flightStart, flightEnd) =>
        set({ flightStart, flightEnd }),

      setAiRecommendation: (campaignMediaIds, aiBudgetByMediaId, summary) =>
        set({
          campaignMediaIds: [...campaignMediaIds],
          aiBudgetByMediaId: { ...aiBudgetByMediaId },
          aiRecommendSummary: summary,
        }),

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
        brandName: state.brandName,
        campaignPurposes: state.campaignPurposes,
        campaignGoal: state.campaignGoal,
        regions: state.regions,
        categories: state.categories,
        budget: state.budget,
        months: state.months,
        ageKey: state.ageKey,
        genderKey: state.genderKey,
        interestKeys: state.interestKeys,
        industryKey: state.industryKey,
        flightStart: state.flightStart,
        flightEnd: state.flightEnd,
        campaignMediaIds: state.campaignMediaIds,
        aiBudgetByMediaId: state.aiBudgetByMediaId,
        aiRecommendSummary: state.aiRecommendSummary,
        creativeUploadedUrl: state.creativeUploadedUrl,
        mediaPlacements: state.mediaPlacements,
      }),
      migrate: (persistedState, fromVersion) => {
        const raw = (persistedState ?? {}) as Record<string, unknown>;
        const merged: PlannerStoreState = { ...INITIAL_STATE };

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

        if (typeof raw.brandName === "string") merged.brandName = raw.brandName;

        if (Array.isArray(raw.campaignPurposes)) {
          merged.campaignPurposes = raw.campaignPurposes.filter(
            isPlannerPurposeKey,
          );
          if (merged.campaignPurposes.length > 0) {
            merged.campaignGoal = purposeToCampaignGoal(
              merged.campaignPurposes[0],
            );
          }
        }

        if (typeof raw.campaignGoal === "string") {
          merged.campaignGoal = raw.campaignGoal as PlannerCampaignGoal;
        }

        if (isPlannerAgeKey(raw.ageKey)) merged.ageKey = raw.ageKey;
        if (isPlannerGenderKey(raw.genderKey)) merged.genderKey = raw.genderKey;
        if (Array.isArray(raw.interestKeys)) {
          merged.interestKeys = raw.interestKeys.filter(isPlannerInterestKey);
        }
        if (isPlannerIndustryKey(raw.industryKey))
          merged.industryKey = raw.industryKey;

        if (typeof raw.flightStart === "string")
          merged.flightStart = raw.flightStart;
        if (typeof raw.flightEnd === "string") merged.flightEnd = raw.flightEnd;

        if (Array.isArray(raw.campaignMediaIds)) {
          merged.campaignMediaIds = raw.campaignMediaIds.filter(
            (id): id is string => typeof id === "string",
          );
        }

        if (
          raw.aiBudgetByMediaId &&
          typeof raw.aiBudgetByMediaId === "object" &&
          !Array.isArray(raw.aiBudgetByMediaId)
        ) {
          merged.aiBudgetByMediaId = raw.aiBudgetByMediaId as Record<
            string,
            number
          >;
        }
        if (typeof raw.aiRecommendSummary === "string") {
          merged.aiRecommendSummary = raw.aiRecommendSummary;
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
