/**
 * PR-6a 업종 프리셋 — "조건 무작위 채우기" 대체 (G-4).
 *
 * 무작위 값은 광고주에게 근거 없는 인상을 준다. 대신 업종별 대표 캠페인
 * 3개를 제공한다. 각 프리셋은 완결된 CampaignBriefInput 이라 적용 즉시
 * Step 2 로 진행 가능하다. flight 는 상대 일수로 정의하고 적용 시점에
 * 오늘 기준으로 환산한다(결정성·최신성).
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
      industry: "fb",
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
] as const;

/** 프리셋 → 완결 CampaignBriefInput (오늘 기준 flight 환산) */
export function presetToBrief(
  preset: BriefPreset,
  today: Date = new Date(),
): CampaignBriefInput {
  const { flightStart, flightEnd } = durationToFlight(preset.durationDays, today);
  return { ...preset.base, flightStart, flightEnd };
}
