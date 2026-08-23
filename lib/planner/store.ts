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
import type { AppliedPlannerScenario } from "@/lib/planner/scenario-types";
import { districtHintsToSeoulZones } from "@/lib/planner/apply-scenario-portfolio";
import type { CompositeLogoPlacement } from "@/components/planner/composite-preview";
import type { PlannerGoalFollowUp } from "@/lib/planner/goal-follow-up";
import {
  defaultFollowUpForGoal,
  normalizeFollowUpForGoal,
} from "@/lib/planner/goal-follow-up";
import type { PlannerSeoulZoneKey } from "@/lib/planner/seoul-zones";
import { isPlannerSeoulZoneKey, suggestSeoulZones } from "@/lib/planner/seoul-zones";
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
import type { PlannerIncheonZoneKey } from "@/lib/planner/incheon-zones";
import {
  isPlannerIncheonZoneKey,
  suggestIncheonZones,
} from "@/lib/planner/incheon-zones";
import {
  getScenarioPreset,
  type PlannerScenarioPresetId,
} from "@/lib/planner/scenario-presets";
import { hydratePlannerFromSavedPlan } from "@/lib/planner/hydrate-from-saved-plan";
import { hydratePlannerFromPlanCart } from "@/lib/plan-cart-planner-bridge";
import type { PlanCart } from "@/lib/plan-cart";
import type { SavedPlannerPlanJson } from "@/lib/planner/contact-prefill";
import {
  pruneCampaignMediaQuantities,
  pruneCampaignMediaPriceOptionIndex,
  type CampaignMediaQuantities,
  type CampaignMediaPriceOptionIndex,
} from "@/lib/planner/planner-media-quantity";

/**
 * localStorage key. 과거 `tkad-planner-plan-v2` 포맷(v2/v3)과 호환되도록
 * `migrate()` 훅에서 흡수한다. persist 자체 version은 별도 관리.
 */
export const PLANNER_STORAGE_KEY = "tkad-planner-plan-v2";
const PLANNER_PERSIST_VERSION = 9;

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
  /** 선택 매체별 수량 — 미지정 ID는 `getQuantityBounds().default` */
  campaignMediaQuantities: CampaignMediaQuantities;
  /** `priceOptions` 패키지 매체 선택 인덱스 */
  campaignMediaPriceOptionIndex: CampaignMediaPriceOptionIndex;
  /** 로컬 Object URL. 메모리 전용이라 persist 대상에서 제외. */
  creativeObjectUrl: string | null;
  /** Cloudinary 업로드된 크리에이티브 secure_url. persist 포함.
   *  C-lite: 표지 `coverLogoUrl` 로도 임시 재사용 중 — 소재 미리보기(합성)와
   *  광고주 회사 로고는 개념이 다름. 전용 `coverLogoUrl` 필드 분리 예정. */
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
  /** 부산 선택 시 하위 상권. 빈 배열 = 부산 전체 */
  busanZones: PlannerBusanZoneKey[];
  /** true면 부산 상권 추천 자동 적용 안 함 */
  busanZonesTouched: boolean;
  /** 경기 선택 시 하위 상권. 빈 배열 = 경기 전체 */
  gyeonggiZones: PlannerGyeonggiZoneKey[];
  gyeonggiZonesTouched: boolean;
  /** 인천 선택 시 하위 상권. 빈 배열 = 인천 전체 */
  incheonZones: PlannerIncheonZoneKey[];
  incheonZonesTouched: boolean;
  /** Step 2 목표별 후속 (전부 optional) */
  goalFollowUp: PlannerGoalFollowUp;
  mediaSelectionExplicit: boolean;
  /** 시나리오 카드 적용 시 보고서 맥락. 수동 진행 시 null */
  appliedScenario: AppliedPlannerScenario | null;
  /** Step 7 보고서 — 광고주명 (표지·헤더) */
  reportClientName: string;
  /** Step 7 보고서 — 문서 제목 오버라이드 (비어 있으면 기본 제목) */
  reportDocumentTitle: string;
  /** Step 7 — 광고주 대상 인사말 (비어 있으면 export 에서 섹션 생략) */
  reportGreeting: string;
  /** Step 7 — Executive summary (문단은 빈 줄로 구분) */
  reportExecutiveSummary: string;
  reportGreetingTouched: boolean;
  reportExecutiveSummaryTouched: boolean;
  /** 인사말·요약이 마지막으로 맞춰진 매체 구성 지문 */
  reportCopyFingerprint: string | null;
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
  toggleBusanZone: (zone: PlannerBusanZoneKey) => void;
  setBusanZones: (zones: PlannerBusanZoneKey[]) => void;
  clearBusanZones: () => void;
  applySuggestedBusanZones: () => void;
  toggleGyeonggiZone: (zone: PlannerGyeonggiZoneKey) => void;
  setGyeonggiZones: (zones: PlannerGyeonggiZoneKey[]) => void;
  clearGyeonggiZones: () => void;
  applySuggestedGyeonggiZones: () => void;
  toggleIncheonZone: (zone: PlannerIncheonZoneKey) => void;
  setIncheonZones: (zones: PlannerIncheonZoneKey[]) => void;
  clearIncheonZones: () => void;
  applySuggestedIncheonZones: () => void;
  setGoalFollowUp: (patch: Partial<PlannerGoalFollowUp>) => void;
  applyScenarioPreset: (id: PlannerScenarioPresetId) => void;
  /** React `Dispatch<SetStateAction<string[]>>` 호환 — 기존 하위 컴포넌트 시그니처 유지용 */
  setCampaignMediaIds: (action: SetStateAction<string[]>) => void;
  setCampaignMediaQuantity: (mediaId: string, units: number) => void;
  setCampaignMediaPriceOptionIndex: (mediaId: string, index: number) => void;
  /** React `Dispatch<SetStateAction<string | null>>` 호환 */
  setCreativeObjectUrl: (action: SetStateAction<string | null>) => void;
  setCreativeUploadedUrl: (url: string | null) => void;
  setReportClientName: (name: string) => void;
  setReportDocumentTitle: (title: string) => void;
  setReportGreeting: (text: string) => void;
  setReportExecutiveSummary: (text: string) => void;
  applyReportCopyDraft: (draft: {
    greeting: string;
    executiveSummary: string;
    fingerprint: string;
  }) => void;
  acknowledgeReportCopyFingerprint: (fingerprint: string) => void;
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
  busanZones: [],
  busanZonesTouched: true,
  gyeonggiZones: [],
  gyeonggiZonesTouched: true,
  incheonZones: [],
  incheonZonesTouched: true,
  goalFollowUp: {},
  campaignMediaIds: [],
  campaignMediaQuantities: {},
  campaignMediaPriceOptionIndex: {},
  creativeObjectUrl: null,
  creativeUploadedUrl: null,
  mediaPlacements: {},
  mediaSelectionExplicit: false,
  appliedScenario: null,
  reportClientName: "",
  reportDocumentTitle: "",
  reportGreeting: "",
  reportExecutiveSummary: "",
  reportGreetingTouched: false,
  reportExecutiveSummaryTouched: false,
  reportCopyFingerprint: null,
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
          ...(!s.busanZonesTouched &&
          s.regions.includes("busan") &&
          goal != null
            ? {
                busanZones: suggestBusanZones(goal, s.industryKey),
              }
            : {}),
          ...(!s.gyeonggiZonesTouched &&
          s.regions.includes("gyeonggi") &&
          goal != null
            ? {
                gyeonggiZones: suggestGyeonggiZones(goal, s.industryKey),
              }
            : {}),
          ...(!s.incheonZonesTouched &&
          s.regions.includes("incheon") &&
          goal != null
            ? {
                incheonZones: suggestIncheonZones(goal, s.industryKey),
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
            if (region === "busan") {
              patch.busanZones = [];
              patch.busanZonesTouched = true;
            }
            if (region === "gyeonggi") {
              patch.gyeonggiZones = [];
              patch.gyeonggiZonesTouched = true;
            }
            if (region === "incheon") {
              patch.incheonZones = [];
              patch.incheonZonesTouched = true;
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
          if (
            region === "busan" &&
            !s.busanZonesTouched &&
            s.campaignGoal != null
          ) {
            patch.busanZones = suggestBusanZones(s.campaignGoal, s.industryKey);
          }
          if (
            region === "gyeonggi" &&
            !s.gyeonggiZonesTouched &&
            s.campaignGoal != null
          ) {
            patch.gyeonggiZones = suggestGyeonggiZones(
              s.campaignGoal,
              s.industryKey,
            );
          }
          if (
            region === "incheon" &&
            !s.incheonZonesTouched &&
            s.campaignGoal != null
          ) {
            patch.incheonZones = suggestIncheonZones(
              s.campaignGoal,
              s.industryKey,
            );
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
          ...(!s.busanZonesTouched &&
          s.regions.includes("busan") &&
          s.campaignGoal != null
            ? { busanZones: suggestBusanZones(s.campaignGoal, key) }
            : {}),
          ...(!s.gyeonggiZonesTouched &&
          s.regions.includes("gyeonggi") &&
          s.campaignGoal != null
            ? { gyeonggiZones: suggestGyeonggiZones(s.campaignGoal, key) }
            : {}),
          ...(!s.incheonZonesTouched &&
          s.regions.includes("incheon") &&
          s.campaignGoal != null
            ? { incheonZones: suggestIncheonZones(s.campaignGoal, key) }
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

      toggleBusanZone: (zone) =>
        set((s) => {
          const next = new Set(s.busanZones);
          if (next.has(zone)) next.delete(zone);
          else next.add(zone);
          return {
            busanZones: [...next] as PlannerBusanZoneKey[],
            busanZonesTouched: true,
          };
        }),

      setBusanZones: (zones) =>
        set({ busanZones: [...zones], busanZonesTouched: true }),

      clearBusanZones: () => set({ busanZones: [], busanZonesTouched: true }),

      applySuggestedBusanZones: () =>
        set((s) => ({
          busanZones: suggestBusanZones(s.campaignGoal, s.industryKey),
          busanZonesTouched: false,
        })),

      toggleGyeonggiZone: (zone) =>
        set((s) => {
          const next = new Set(s.gyeonggiZones);
          if (next.has(zone)) next.delete(zone);
          else next.add(zone);
          return {
            gyeonggiZones: [...next] as PlannerGyeonggiZoneKey[],
            gyeonggiZonesTouched: true,
          };
        }),

      setGyeonggiZones: (zones) =>
        set({ gyeonggiZones: [...zones], gyeonggiZonesTouched: true }),

      clearGyeonggiZones: () =>
        set({ gyeonggiZones: [], gyeonggiZonesTouched: true }),

      applySuggestedGyeonggiZones: () =>
        set((s) => ({
          gyeonggiZones: suggestGyeonggiZones(s.campaignGoal, s.industryKey),
          gyeonggiZonesTouched: false,
        })),

      toggleIncheonZone: (zone) =>
        set((s) => {
          const next = new Set(s.incheonZones);
          if (next.has(zone)) next.delete(zone);
          else next.add(zone);
          return {
            incheonZones: [...next] as PlannerIncheonZoneKey[],
            incheonZonesTouched: true,
          };
        }),

      setIncheonZones: (zones) =>
        set({ incheonZones: [...zones], incheonZonesTouched: true }),

      clearIncheonZones: () =>
        set({ incheonZones: [], incheonZonesTouched: true }),

      applySuggestedIncheonZones: () =>
        set((s) => ({
          incheonZones: suggestIncheonZones(s.campaignGoal, s.industryKey),
          incheonZonesTouched: false,
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
            campaignMediaQuantities: pruneCampaignMediaQuantities(
              nextIds,
              s.campaignMediaQuantities,
            ),
            campaignMediaPriceOptionIndex: pruneCampaignMediaPriceOptionIndex(
              nextIds,
              s.campaignMediaPriceOptionIndex,
            ),
            mediaSelectionExplicit: nextIds.length > 0,
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

      setReportClientName: (name) => set({ reportClientName: name }),

      setReportDocumentTitle: (title) =>
        set({ reportDocumentTitle: title.slice(0, 120) }),

      setReportGreeting: (text) =>
        set({
          reportGreeting: text.slice(0, 2000),
          reportGreetingTouched: true,
        }),

      setReportExecutiveSummary: (text) =>
        set({
          reportExecutiveSummary: text.slice(0, 4000),
          reportExecutiveSummaryTouched: true,
        }),

      applyReportCopyDraft: (draft) =>
        set({
          reportGreeting: draft.greeting.slice(0, 2000),
          reportExecutiveSummary: draft.executiveSummary.slice(0, 4000),
          reportCopyFingerprint: draft.fingerprint,
        }),

      acknowledgeReportCopyFingerprint: (fingerprint) =>
        set({ reportCopyFingerprint: fingerprint }),

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
          const busanZones = patch.busanZones ?? [];
          const gyeonggiZones = patch.gyeonggiZones ?? [];
          const incheonZones = patch.incheonZones ?? [];
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
            busanZones,
            busanZonesTouched: busanZones.length > 0,
            gyeonggiZones,
            gyeonggiZonesTouched: gyeonggiZones.length > 0,
            incheonZones,
            incheonZonesTouched: incheonZones.length > 0,
            campaignMediaIds,
            campaignMediaQuantities: {},
            campaignMediaPriceOptionIndex: {},
            mediaSelectionExplicit: campaignMediaIds.length > 0,
            ...(patch.appliedScenario !== undefined
              ? { appliedScenario: patch.appliedScenario }
              : {}),
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
            appliedScenario: null,
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
        busanZones: state.busanZones,
        busanZonesTouched: state.busanZonesTouched,
        gyeonggiZones: state.gyeonggiZones,
        gyeonggiZonesTouched: state.gyeonggiZonesTouched,
        incheonZones: state.incheonZones,
        incheonZonesTouched: state.incheonZonesTouched,
        goalFollowUp: state.goalFollowUp,
        campaignMediaIds: state.campaignMediaIds,
        campaignMediaQuantities: state.campaignMediaQuantities,
        campaignMediaPriceOptionIndex: state.campaignMediaPriceOptionIndex,
        creativeUploadedUrl: state.creativeUploadedUrl,
        mediaPlacements: state.mediaPlacements,
        mediaSelectionExplicit: state.mediaSelectionExplicit,
        appliedScenario: state.appliedScenario,
        reportClientName: state.reportClientName,
        reportDocumentTitle: state.reportDocumentTitle,
        reportGreeting: state.reportGreeting,
        reportExecutiveSummary: state.reportExecutiveSummary,
        reportGreetingTouched: state.reportGreetingTouched,
        reportExecutiveSummaryTouched: state.reportExecutiveSummaryTouched,
        reportCopyFingerprint: state.reportCopyFingerprint,
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

        if (Array.isArray(raw.busanZones)) {
          merged.busanZones = raw.busanZones.filter(isPlannerBusanZoneKey);
        }
        if (typeof raw.busanZonesTouched === "boolean") {
          merged.busanZonesTouched = raw.busanZonesTouched;
        }

        if (Array.isArray(raw.gyeonggiZones)) {
          merged.gyeonggiZones = raw.gyeonggiZones.filter(isPlannerGyeonggiZoneKey);
        }
        if (typeof raw.gyeonggiZonesTouched === "boolean") {
          merged.gyeonggiZonesTouched = raw.gyeonggiZonesTouched;
        }

        if (Array.isArray(raw.incheonZones)) {
          merged.incheonZones = raw.incheonZones.filter(isPlannerIncheonZoneKey);
        }
        if (typeof raw.incheonZonesTouched === "boolean") {
          merged.incheonZonesTouched = raw.incheonZonesTouched;
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

        if (
          raw.campaignMediaQuantities &&
          typeof raw.campaignMediaQuantities === "object" &&
          !Array.isArray(raw.campaignMediaQuantities)
        ) {
          const qty: CampaignMediaQuantities = {};
          for (const [id, v] of Object.entries(
            raw.campaignMediaQuantities as Record<string, unknown>,
          )) {
            const n = typeof v === "number" ? v : Number(v);
            if (Number.isFinite(n) && n > 0) qty[id] = Math.round(n);
          }
          merged.campaignMediaQuantities = pruneCampaignMediaQuantities(
            merged.campaignMediaIds,
            qty,
          );
        } else {
          merged.campaignMediaQuantities = {};
        }

        if (
          raw.campaignMediaPriceOptionIndex &&
          typeof raw.campaignMediaPriceOptionIndex === "object" &&
          !Array.isArray(raw.campaignMediaPriceOptionIndex)
        ) {
          const idx: CampaignMediaPriceOptionIndex = {};
          for (const [id, v] of Object.entries(
            raw.campaignMediaPriceOptionIndex as Record<string, unknown>,
          )) {
            const n = typeof v === "number" ? v : Number(v);
            if (Number.isFinite(n) && n >= 0) idx[id] = Math.round(n);
          }
          merged.campaignMediaPriceOptionIndex = pruneCampaignMediaPriceOptionIndex(
            merged.campaignMediaIds,
            idx,
          );
        } else {
          merged.campaignMediaPriceOptionIndex = {};
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

        if (
          raw.appliedScenario &&
          typeof raw.appliedScenario === "object" &&
          !Array.isArray(raw.appliedScenario)
        ) {
          const s = raw.appliedScenario as Record<string, unknown>;
          if (
            typeof s.id === "string" &&
            typeof s.variant === "string" &&
            typeof s.labelKo === "string" &&
            typeof s.labelEn === "string"
          ) {
            merged.appliedScenario = {
              id: s.id,
              variant: s.variant as AppliedPlannerScenario["variant"],
              labelKo: s.labelKo,
              labelEn: s.labelEn,
              descriptionKo:
                typeof s.descriptionKo === "string" ? s.descriptionKo : "",
              descriptionEn:
                typeof s.descriptionEn === "string" ? s.descriptionEn : "",
            };
          }
        }

        if (typeof raw.reportClientName === "string") {
          merged.reportClientName = raw.reportClientName.slice(0, 80);
        }
        if (typeof raw.reportDocumentTitle === "string") {
          merged.reportDocumentTitle = raw.reportDocumentTitle.slice(0, 120);
        }
        if (typeof raw.reportGreeting === "string") {
          merged.reportGreeting = raw.reportGreeting.slice(0, 2000);
        }
        if (typeof raw.reportExecutiveSummary === "string") {
          merged.reportExecutiveSummary = raw.reportExecutiveSummary.slice(0, 4000);
        }
        if (typeof raw.reportGreetingTouched === "boolean") {
          merged.reportGreetingTouched = raw.reportGreetingTouched;
        }
        if (typeof raw.reportExecutiveSummaryTouched === "boolean") {
          merged.reportExecutiveSummaryTouched = raw.reportExecutiveSummaryTouched;
        }
        if (typeof raw.reportCopyFingerprint === "string") {
          merged.reportCopyFingerprint = raw.reportCopyFingerprint;
        }

        return merged as unknown as PlannerStore;
      },
    },
  ),
);

/** 사용자 입력 문자열에서 만원 단위 숫자 파싱. 빈·잘못된 값은 null */
export function parsePlannerBudgetMan(
  s: Pick<PlannerStoreState, "budget">,
): number | null {
  const raw = s.budget.replace(/,/g, "").trim();
  if (!raw) return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n)) return null;
  return n;
}

/** 만원 단위 예산을 허용 범위로 클램프 */
export function clampPlannerBudgetMan(n: number): number {
  return Math.min(PLANNER_BUDGET_MAX, Math.max(PLANNER_BUDGET_MIN, n));
}

/** 시뮬레이션·슬라이더용 정규화 값. 최소 미만·빈 입력은 0 (검증은 parsePlannerBudgetMan 별도) */
export function selectBudgetNum(s: PlannerStoreState): number {
  const parsed = parsePlannerBudgetMan(s);
  if (parsed === null || parsed < PLANNER_BUDGET_MIN) return 0;
  return Math.min(PLANNER_BUDGET_MAX, parsed);
}

/** 입력 마지막 단계까지 진행했는지 */
export function selectIsOnResultStep(s: PlannerStoreState): boolean {
  return s.wizardStep > PLANNER_LAST_INPUT_STEP;
}
