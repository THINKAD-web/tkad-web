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
  isBriefEntryMode,
  type BriefAgeBand,
  type BriefEntryMode,
  type BriefGoal,
  type BriefIndustry,
  type BriefWizardStep,
  type BriefEntryMode,
  type BudgetMode,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";
import { normalizeSidoCodes, type SidoCode } from "@/lib/planner/brief/regions";
import {
  durationToFlight,
  parseBriefFromText,
} from "@/lib/planner/brief/natural-language";
import {
  computeBriefFingerprint,
  countMixUnits,
} from "@/lib/planner/brief/brief-fingerprint";
import {
  isBriefChannelMode,
  type BriefChannelMode,
} from "@/lib/planner/brief/brief-integrated-adapters";
import {
  defaultDigitalChannelIds,
  type DigitalChannelId,
} from "@/lib/planner/recommend-digital";
import { DIGITAL_CHANNELS } from "@/lib/planner/digital-channels";

export const BRIEF_STORAGE_KEY = "tkad-planner-brief-v1";

function toggleIn<T>(list: readonly T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export type BriefStoreState = CampaignBriefInput & {
  wizardStep: BriefWizardStep;
  /** O-2: 빠른 추천 vs 자세히 설계 */
  entryMode: BriefEntryMode;
  /** O-1: OOH만 vs OOH+디지털 */
  channelMode: BriefChannelMode;
  /** O-1: 디지털 예산 비중 (10–50%) */
  digitalBudgetPct: number;
  /** O-1: 선택 디지털 채널 */
  digitalChannelIds: DigitalChannelId[];
  /** 선택한 매체 → 구매 수량 (Step 2 믹스). 0 이하면 제거된 것으로 본다 */
  mixUnits: Record<string, number>;
  /** mixUnits 가 마지막으로 확정·담긴 시점의 브리프 지문 (L-1) */
  mixBriefFingerprint: string | null;
  /** P1: 예산 내만 랭킹 필터 (기본 ON) */
  budgetWithinOnly: boolean;
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

  // ── O-2 진입 모드 ──
  setEntryMode: (mode: BriefEntryMode) => void;

  // ── O-1 채널 ──
  setChannelMode: (mode: BriefChannelMode) => void;
  setDigitalBudgetPct: (pct: number) => void;
  toggleDigitalChannel: (id: DigitalChannelId) => void;
  setDigitalChannelIds: (ids: DigitalChannelId[]) => void;

  // ── Step 2 믹스 ──
  addMediaToMix: (mediaId: string, units?: number) => void;
  removeMediaFromMix: (mediaId: string) => void;
  setMixUnits: (mediaId: string, units: number) => void;
  replaceMix: (lines: readonly { mediaId: string; units: number }[]) => void;
  /** 딥링크 인계 — 기존 믹스에 매체를 더한다 (브리프 입력은 건드리지 않는다) */
  addMixLines: (lines: readonly { mediaId: string; units: number }[]) => void;
  /**
   * 딥링크 인계 — 내 플랜·저장 플랜에서 새로 시작한다.
   * 옛 세션 입력과 섞이지 않도록 브리프 입력을 비운 뒤 patch 를 얹는다.
   */
  startFromHandoff: (params: {
    patch: Partial<CampaignBriefInput>;
    lines: readonly { mediaId: string; units: number }[];
  }) => void;
  clearMix: () => void;
  /** 현재 브리프 기준으로 mix 지문을 갱신 (담은 매체 유지 확인) */
  acknowledgeMixForCurrentBrief: () => void;
  setBudgetWithinOnly: (value: boolean) => void;
};

export type BriefStore = BriefStoreState & BriefStoreActions;

const INITIAL: BriefStoreState = {
  ...EMPTY_BRIEF,
  wizardStep: 1,
  entryMode: "detailed",
  channelMode: "ooh_only",
  digitalBudgetPct: 30,
  digitalChannelIds: defaultDigitalChannelIds(),
  mixUnits: {},
  mixBriefFingerprint: null,
  budgetWithinOnly: true,
};

function normalizeDigitalChannelIds(raw: unknown): DigitalChannelId[] {
  if (!Array.isArray(raw) || raw.length === 0) return defaultDigitalChannelIds();
  const allowed = new Set(DIGITAL_CHANNELS.map((c) => c.id));
  const out: DigitalChannelId[] = [];
  for (const id of raw) {
    if (typeof id === "string" && allowed.has(id as DigitalChannelId)) {
      const typed = id as DigitalChannelId;
      if (!out.includes(typed)) out.push(typed);
    }
  }
  return out.length > 0 ? out : defaultDigitalChannelIds();
}

function stampMixFingerprint(state: BriefStoreState): Partial<BriefStoreState> {
  if (countMixUnits(state.mixUnits) === 0) {
    return { mixBriefFingerprint: null };
  }
  return { mixBriefFingerprint: computeBriefFingerprint(state) };
}

/** 저장값 → 안전한 믹스 (양수 정수 수량만) */
function normalizeMixUnits(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [id, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = typeof v === "number" ? Math.floor(v) : NaN;
    if (Number.isFinite(n) && n > 0) out[id] = n;
  }
  return out;
}

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

      setEntryMode: (mode) => set({ entryMode: mode }),

      setChannelMode: (mode) => set({ channelMode: mode }),
      setDigitalBudgetPct: (pct) =>
        set({ digitalBudgetPct: Math.max(10, Math.min(50, Math.round(pct))) }),
      toggleDigitalChannel: (id) =>
        set((s) => ({
          digitalChannelIds: s.digitalChannelIds.includes(id)
            ? s.digitalChannelIds.filter((x) => x !== id)
            : [...s.digitalChannelIds, id],
        })),
      setDigitalChannelIds: (ids) =>
        set({ digitalChannelIds: normalizeDigitalChannelIds(ids) }),

      addMediaToMix: (mediaId, units = 1) =>
        set((s) => {
          const mixUnits = {
            ...s.mixUnits,
            [mediaId]: Math.max(1, Math.floor(units)),
          };
          const next = { ...s, mixUnits };
          return {
            mixUnits,
            ...(countMixUnits(s.mixUnits) === 0
              ? stampMixFingerprint(next)
              : {}),
          };
        }),

      removeMediaFromMix: (mediaId) =>
        set((s) => {
          const next = { ...s.mixUnits };
          delete next[mediaId];
          const state = { ...s, mixUnits: next };
          return { mixUnits: next, ...stampMixFingerprint(state) };
        }),

      setMixUnits: (mediaId, units) =>
        set((s) => {
          const n = Math.floor(units);
          const next = { ...s.mixUnits };
          if (!Number.isFinite(n) || n <= 0) {
            delete next[mediaId];
          } else {
            next[mediaId] = n;
          }
          const state = { ...s, mixUnits: next };
          return {
            mixUnits: next,
            ...(countMixUnits(next) === 0 || countMixUnits(s.mixUnits) === 0
              ? stampMixFingerprint(state)
              : {}),
          };
        }),

      replaceMix: (lines) =>
        set((s) => {
          const mixUnits: Record<string, number> = {};
          for (const l of lines) {
            const n = Math.floor(l.units);
            if (Number.isFinite(n) && n > 0) mixUnits[l.mediaId] = n;
          }
          const state = { ...s, mixUnits };
          return { mixUnits, ...stampMixFingerprint(state) };
        }),

      addMixLines: (lines) =>
        set((s) => {
          const mixUnits = { ...s.mixUnits };
          for (const l of lines) {
            const n = Math.floor(l.units);
            if (Number.isFinite(n) && n > 0) mixUnits[l.mediaId] = n;
          }
          const state = { ...s, mixUnits };
          return { mixUnits, ...stampMixFingerprint(state) };
        }),

      startFromHandoff: ({ patch, lines }) =>
        set((s) => {
          const brief = normalizeBriefInput({ ...EMPTY_BRIEF, ...patch });
          const mixUnits: Record<string, number> = {};
          for (const l of lines) {
            const n = Math.floor(l.units);
            if (Number.isFinite(n) && n > 0) mixUnits[l.mediaId] = n;
          }
          const state = { ...s, ...brief, mixUnits };
          return { ...brief, mixUnits, ...stampMixFingerprint(state) };
        }),

      clearMix: () => set({ mixUnits: {}, mixBriefFingerprint: null }),

      acknowledgeMixForCurrentBrief: () =>
        set((s) => stampMixFingerprint(s)),

      setBudgetWithinOnly: (value) => set({ budgetWithinOnly: value }),
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
        entryMode: s.entryMode,
        channelMode: s.channelMode,
        digitalBudgetPct: s.digitalBudgetPct,
        digitalChannelIds: s.digitalChannelIds,
        mixUnits: s.mixUnits,
        mixBriefFingerprint: s.mixBriefFingerprint,
        budgetWithinOnly: s.budgetWithinOnly,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<BriefStoreState>;
        const step = p.wizardStep;
        return {
          ...current,
          ...normalizeBriefInput(p),
          wizardStep: step === 1 || step === 2 || step === 3 ? step : 1,
          entryMode: isBriefEntryMode(p.entryMode)
            ? p.entryMode
            : current.entryMode,
          channelMode: isBriefChannelMode(p.channelMode)
            ? p.channelMode
            : current.channelMode,
          digitalBudgetPct:
            typeof p.digitalBudgetPct === "number"
              ? Math.max(10, Math.min(50, Math.round(p.digitalBudgetPct)))
              : current.digitalBudgetPct,
          digitalChannelIds: normalizeDigitalChannelIds(p.digitalChannelIds),
          mixUnits: normalizeMixUnits(p.mixUnits),
          mixBriefFingerprint:
            typeof p.mixBriefFingerprint === "string"
              ? p.mixBriefFingerprint
              : null,
          budgetWithinOnly:
            typeof p.budgetWithinOnly === "boolean"
              ? p.budgetWithinOnly
              : true,
        };
      },
    },
  ),
);
