/**
 * PR-6a 업종 프리셋 — "조건 무작위 채우기" 대체 (G-4).
 *
 * 무작위 값은 광고주에게 근거 없는 인상을 준다. 대신 업종별 대표 캠페인
 * 풀을 제공하고, 화면에는 그중 3개만 shuffle 노출한다.
 * 각 프리셋은 완결된 CampaignBriefInput 이라 적용 즉시 Step 2 로 진행 가능하다.
 * flight 는 상대 일수로 정의하고 적용 시점에 오늘 기준으로 환산한다(결정성·최신성).
 */

import type { CampaignBriefInput } from "@/lib/planner/brief/types";
import { durationToFlight } from "@/lib/planner/brief/natural-language";

export type BriefPreset = {
  id: string;
  ko: { title: string; summary: string };
  en: { title: string; summary: string };
  /** flight 를 뺀 브리프 본문 */
  base: Omit<CampaignBriefInput, "flightStart" | "flightEnd">;
  durationDays: number;
};

/** Step 1 에 동시 노출할 프리셋 수 */
export const BRIEF_PRESET_DISPLAY_COUNT = 3;

export const BRIEF_PRESETS: readonly BriefPreset[] = [
  {
    id: "beauty-launch",
    ko: {
      title: "뷰티 신제품 런칭",
      summary: "3,000만 · 서울·경기 · 2030 여성 · 2주",
    },
    en: {
      title: "Beauty product launch",
      summary: "₩30M · Seoul·Gyeonggi · F 20-30s · 2 weeks",
    },
    base: {
      budgetInputWon: 30_000_000,
      budgetMode: "total",
      regionCodes: ["11", "41"],
      genders: ["female"],
      ageBands: ["20s", "30s"],
      goal: "awareness",
      industry: "retail",
      freeText: "",
    },
    durationDays: 14,
  },
  {
    id: "franchise-openings",
    ko: {
      title: "프랜차이즈 다지점 오픈",
      summary: "5,000만 · 전국 · 전 타깃 · 1개월",
    },
    en: {
      title: "Franchise multi-store opening",
      summary: "₩50M · Nationwide · All · 1 month",
    },
    base: {
      budgetInputWon: 50_000_000,
      budgetMode: "total",
      regionCodes: [],
      genders: [],
      ageBands: [],
      goal: "conversion",
      industry: "retail",
      freeText: "",
    },
    durationDays: 30,
  },
  {
    id: "app-install",
    ko: {
      title: "앱 설치 유도 (IT·핀테크)",
      summary: "2,000만 · 서울 · 2030 · 3주",
    },
    en: {
      title: "App install drive (Tech/Fintech)",
      summary: "₩20M · Seoul · 20-30s · 3 weeks",
    },
    base: {
      budgetInputWon: 20_000_000,
      budgetMode: "total",
      regionCodes: ["11"],
      genders: [],
      ageBands: ["20s", "30s"],
      goal: "consideration",
      industry: "tech",
      freeText: "",
    },
    durationDays: 21,
  },
  {
    id: "fnb-local-open",
    ko: {
      title: "F&B 로컬 매장 오픈",
      summary: "1,500만 · 부산 · 2030 · 2주",
    },
    en: {
      title: "F&B local store opening",
      summary: "₩15M · Busan · 20-30s · 2 weeks",
    },
    base: {
      budgetInputWon: 15_000_000,
      budgetMode: "total",
      regionCodes: ["26"],
      genders: [],
      ageBands: ["20s", "30s"],
      goal: "awareness",
      industry: "fb",
      freeText: "",
    },
    durationDays: 14,
  },
  {
    id: "finance-promo",
    ko: {
      title: "금융·보험 프로모션",
      summary: "4,000만 · 서울 · 3040 · 1개월",
    },
    en: {
      title: "Finance & insurance promo",
      summary: "₩40M · Seoul · 30-40s · 1 month",
    },
    base: {
      budgetInputWon: 40_000_000,
      budgetMode: "total",
      regionCodes: ["11"],
      genders: ["male", "female"],
      ageBands: ["30s", "40s"],
      goal: "consideration",
      industry: "finance",
      freeText: "",
    },
    durationDays: 30,
  },
  {
    id: "entertainment-release",
    ko: {
      title: "엔터 콘텐츠 홍보",
      summary: "3,000만 · 서울 · 2030 · 3주",
    },
    en: {
      title: "Entertainment content promo",
      summary: "₩30M · Seoul · 20-30s · 3 weeks",
    },
    base: {
      budgetInputWon: 30_000_000,
      budgetMode: "total",
      regionCodes: ["11"],
      genders: [],
      ageBands: ["20s", "30s"],
      goal: "awareness",
      industry: "ent",
      freeText: "",
    },
    durationDays: 21,
  },
  {
    id: "retail-popup",
    ko: {
      title: "성수 팝업스토어",
      summary: "2,000만 · 서울 · 2030 여성 · 2주",
    },
    en: {
      title: "Seongsu pop-up store",
      summary: "₩20M · Seoul · F 20-30s · 2 weeks",
    },
    base: {
      budgetInputWon: 20_000_000,
      budgetMode: "total",
      regionCodes: ["11"],
      genders: ["female"],
      ageBands: ["20s", "30s"],
      goal: "conversion",
      industry: "retail",
      freeText: "",
    },
    durationDays: 14,
  },
  {
    id: "tech-b2b-launch",
    ko: {
      title: "B2B SaaS 런칭",
      summary: "3,000만 · 서울·경기 · 3040 · 1개월",
    },
    en: {
      title: "B2B SaaS launch",
      summary: "₩30M · Seoul·Gyeonggi · 30-40s · 1 month",
    },
    base: {
      budgetInputWon: 30_000_000,
      budgetMode: "total",
      regionCodes: ["11", "41"],
      genders: [],
      ageBands: ["30s", "40s"],
      goal: "consideration",
      industry: "tech",
      freeText: "",
    },
    durationDays: 30,
  },
  {
    id: "fnb-regional-expansion",
    ko: {
      title: "F&B 지방 확장",
      summary: "3,000만 · 대구·경북 · 전 타깃 · 3주",
    },
    en: {
      title: "F&B regional expansion",
      summary: "₩30M · Daegu·Gyeongbuk · All · 3 weeks",
    },
    base: {
      budgetInputWon: 30_000_000,
      budgetMode: "total",
      regionCodes: ["27", "47"],
      genders: [],
      ageBands: [],
      goal: "awareness",
      industry: "fb",
      freeText: "",
    },
    durationDays: 21,
  },
  {
    id: "nationwide-brand",
    ko: {
      title: "전국 브랜드 캠페인",
      summary: "1억 · 전국 · 전 타깃 · 2개월",
    },
    en: {
      title: "Nationwide brand campaign",
      summary: "₩100M · Nationwide · All · 2 months",
    },
    base: {
      budgetInputWon: 100_000_000,
      budgetMode: "total",
      regionCodes: [],
      genders: [],
      ageBands: [],
      goal: "awareness",
      industry: "retail",
      freeText: "",
    },
    durationDays: 60,
  },
  {
    id: "jeju-tourism",
    ko: {
      title: "제주 관광·숙박 프로모션",
      summary: "2,500만 · 제주 · 전 타깃 · 1개월",
    },
    en: {
      title: "Jeju tourism & hospitality",
      summary: "₩25M · Jeju · All · 1 month",
    },
    base: {
      budgetInputWon: 25_000_000,
      budgetMode: "total",
      regionCodes: ["50"],
      genders: [],
      ageBands: [],
      goal: "consideration",
      industry: "fb",
      freeText: "",
    },
    durationDays: 30,
  },
  {
    id: "retail-season-sale",
    ko: {
      title: "유통 시즌 세일",
      summary: "4,000만 · 서울 · 3040 · 3주",
    },
    en: {
      title: "Retail seasonal sale",
      summary: "₩40M · Seoul · 30-40s · 3 weeks",
    },
    base: {
      budgetInputWon: 40_000_000,
      budgetMode: "total",
      regionCodes: ["11"],
      genders: ["male", "female"],
      ageBands: ["30s", "40s"],
      goal: "conversion",
      industry: "retail",
      freeText: "",
    },
    durationDays: 21,
  },
] as const;

/** 결정적 shuffle — 동일 seed 에서 동일 3개 */
export function pickBriefPresets(
  count: number,
  seed: number,
  pool: readonly BriefPreset[] = BRIEF_PRESETS,
): BriefPreset[] {
  const items = [...pool];
  let s = seed >>> 0 || 1;
  for (let i = items.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [items[i], items[j]] = [items[j]!, items[i]!];
  }
  return items.slice(0, Math.min(count, items.length));
}

/** 이전 노출 세트를 최대한 제외하고 선택 */
export function pickBriefPresetsExcluding(
  count: number,
  seed: number,
  excludeIds: readonly string[],
  pool: readonly BriefPreset[] = BRIEF_PRESETS,
): BriefPreset[] {
  const excludeSet = new Set(excludeIds);
  const need = Math.min(count, pool.length);
  const available = pool.filter((p) => !excludeSet.has(p.id));

  if (available.length >= need) {
    return pickBriefPresets(need, seed, available);
  }

  const primary = pickBriefPresets(available.length, seed, available);
  const slotsLeft = need - primary.length;
  if (slotsLeft <= 0) return primary;

  const fallbackPool = pool.filter(
    (p) => !primary.some((x) => x.id === p.id),
  );
  const filler = pickBriefPresets(slotsLeft, seed + 1, fallbackPool);
  return [...primary, ...filler];
}

/** LCG — 결정적 다음 seed */
export function nextBriefPresetSeed(seed: number): number {
  return ((seed >>> 0 || 1) * 1664525 + 1013904223) >>> 0 || 1;
}

/** 프리셋 → 완결 CampaignBriefInput (오늘 기준 flight 환산) */
export function presetToBrief(
  preset: BriefPreset,
  today: Date = new Date(),
): CampaignBriefInput {
  const { flightStart, flightEnd } = durationToFlight(preset.durationDays, today);
  return { ...preset.base, flightStart, flightEnd };
}
