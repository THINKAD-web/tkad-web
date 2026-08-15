"use client";

/**
 * PR-6a 통합 브리프 스토어 — 3단계 흐름의 단일 상태 소스.
 *
 * 기존 6단계 플래너(`lib/planner/store.ts`, key `tkad-planner-plan-v2`)와
 * 별개의 persist key 를 쓴다. 두 흐름이 병존하는 동안(6a~6b) 서로의
 * localStorage 를 침범하지 않는다. 6c 에서 `/planner` 를 이 흐름으로
 * 전환한 뒤 legacy 스토어 정리는 별도로 다룬다.
 *
 * 입력만 persist. 자연어 원문·wizardStep 도 함께 저장해 새로고침 복원.
 */

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CampaignPlanGender } from "@/lib/campaign-plan-schema";
import {
  EMPTY_BRIEF,
  normalizeBriefInput,
  type BriefAgeBand,
  type BriefGoal,
  type BriefIndustry,
  type BriefWizardStep,
  type BudgetMode,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";
import { normalizeSidoCodes, type SidoCode } from "@/lib/planner/brief/regions";
import {
  durationToFlight,
  parseBriefFromText,
} from "@/lib/planner/brief/natural-language";

export const BRIEF_STORAGE_KEY = "tkad-planner-brief-v1";

function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export type BriefStoreState = CampaignBriefInput & {
  wizardStep: BriefWizardStep;
};

export type BriefStoreActions = {
  setBudgetInputWon: (won: number) => void;
  setBudgetMode: (mode: BudgetMode) => void;
  setRegionCodes: (codes: SidoCode[]) => void;
  toggleRegion: (code: SidoCode) => void;
  toggleGender: (g: CampaignPlanGender) => void;
  toggleAgeBand: (a: BriefAgeBand) => void;
  setGoal: (goal: BriefGoal | null) => void;
  setIndustry: (industry: BriefIndustry | null) => void;
  setFlight: (start: string | null, end: string | null) => void;
  setFreeText: (text: string) => void;
  /** 자연어 문장을 파싱해 필드를 채운다 (기간은 오늘 기준 날짜로 환산) */
  applyFreeText: (text: string, today?: Date) => void;
  /** 업종 프리셋(무작위 채우기 대체) 적용 */
  applyBriefPreset: (preset: CampaignBriefInput) => void;
  setWizardStep: (step: BriefWizardStep) => void;
  reset: () => void;
};

export type BriefStore = BriefStoreState & BriefStoreActions;

const INITIAL: BriefStoreState = { ...EMPTY_BRIEF, wizardStep: 1 };

export const useBriefStore = create<BriefStore>()(
  persist(
    (set) => ({
      ...INITIAL,

      setBudgetInputWon: (won) =>
        set({ budgetInputWon: Math.max(0, Math.round(won)) }),
      setBudgetMode: (mode) => set({ budgetMode: mode }),
      setRegionCodes: (codes) =>
        set({ regionCodes: normalizeSidoCodes(codes) }),
      toggleRegion: (code) =>
        set((s) => ({
          regionCodes: normalizeSidoCodes(toggleIn(s.regionCodes, code)),
        })),
      toggleGender: (g) =>
        set((s) => ({ genders: toggleIn(s.genders, g) })),
      toggleAgeBand: (a) =>
        set((s) => ({ ageBands: toggleIn(s.ageBands, a) })),
      setGoal: (goal) => set({ goal }),
      setIndustry: (industry) => set({ industry }),
      setFlight: (start, end) => set({ flightStart: start, flightEnd: end }),
      setFreeText: (text) => set({ freeText: text }),

      applyFreeText: (text, today) =>
        set(() => {
          const r = parseBriefFromText(text);
          const patch: Partial<BriefStoreState> = { ...r.brief };
          if (r.durationDays != null) {
            const { flightStart, flightEnd } = durationToFlight(
              r.durationDays,
              today,
            );
            patch.flightStart = flightStart;
            patch.flightEnd = flightEnd;
          }
          return patch;
        }),

      applyBriefPreset: (preset) => set({ ...normalizeBriefInput(preset) }),

      setWizardStep: (step) => set({ wizardStep: step }),
      reset: () => set({ ...INITIAL }),
    }),
    {
      name: BRIEF_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // 입력만 저장 (wizardStep 포함해 새로고침 복원)
      partialize: (s) => ({
        budgetInputWon: s.budgetInputWon,
        budgetMode: s.budgetMode,
        regionCodes: s.regionCodes,
        genders: s.genders,
        ageBands: s.ageBands,
        goal: s.goal,
        industry: s.industry,
        flightStart: s.flightStart,
        flightEnd: s.flightEnd,
        freeText: s.freeText,
        wizardStep: s.wizardStep,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BriefStoreState>;
        const step = p.wizardStep;
        return {
          ...current,
          ...normalizeBriefInput(p),
          wizardStep: step === 1 || step === 2 || step === 3 ? step : 1,
        };
      },
    },
  ),
);
