/**
 * PR-6a 자연어 브리프 파싱.
 *
 * 기존 파서(`parsePlannerFreetextBrief`)를 재사용하고, 통합 브리프에만
 * 필요한 두 가지를 덧붙인다:
 *   1. 성별 파싱 (기존 파서에 없음)
 *   2. 파서 출력(browse 지역 id · PlannerAgeKey · 5종 목표)을
 *      브리프 어휘(17시도 코드 · BriefAgeBand · 3종 목표)로 매핑
 *
 * 자연어와 직접 입력은 **같은 CampaignBriefInput 로 수렴**한다.
 * 데이터 정확도는 이번 범위 아님 — 인식·매핑 구조만 만든다.
 */

import type { CampaignPlanGender } from "@/lib/campaign-plan-schema";
import { parsePlannerFreetextBrief } from "@/lib/planner/parse-freetext-brief";
import {
  browseMainIdToSidoCodes,
  normalizeSidoCodes,
  type SidoCode,
} from "@/lib/planner/brief/regions";
import {
  EMPTY_BRIEF,
  type BriefAgeBand,
  type BriefGoal,
  type BriefIndustry,
  type CampaignBriefInput,
} from "@/lib/planner/brief/types";
import type { PlannerAgeKey } from "@/lib/planner/types";
import type { PlannerCampaignGoal } from "@/lib/planner-logic";
import type { PlannerIndustryKey } from "@/lib/planner/types";

export type BriefFieldConfidence = "high" | "low";

/** 파싱된 각 필드의 근거 — Step 1 에서 "확인·수정" 칩으로 노출 */
export type BriefFieldMeta = {
  filled: boolean;
  confidence: BriefFieldConfidence;
  source: string | null;
};

export type BriefParseResult = {
  brief: CampaignBriefInput;
  /** durationDays 는 flight 날짜로 환산되기 전 원값 (UI 가 시작일과 조합) */
  durationDays: number | null;
  meta: {
    budget: BriefFieldMeta;
    regions: BriefFieldMeta;
    genders: BriefFieldMeta;
    ageBands: BriefFieldMeta;
    goal: BriefFieldMeta;
    industry: BriefFieldMeta;
    duration: BriefFieldMeta;
  };
  unmatchedTokens: string[];
};

const EMPTY_META: BriefFieldMeta = {
  filled: false,
  confidence: "low",
  source: null,
};

const GOAL_MAP: Record<PlannerCampaignGoal, BriefGoal> = {
  brand: "awareness",
  launch: "consideration",
  event: "consideration",
  sales: "conversion",
  local: "conversion",
};

const INDUSTRY_MAP: Record<PlannerIndustryKey, BriefIndustry> = {
  indFb: "fb",
  indRetail: "retail",
  indTech: "tech",
  indFinance: "finance",
  indEnt: "ent",
  indOther: "other",
};

const AGE_MAP: Record<Exclude<PlannerAgeKey, "ageAll">, BriefAgeBand> = {
  age20s: "20s",
  age30s: "30s",
  age40s: "40s",
  age50plus: "50s+",
};

/** 성별 파싱 — 여성/남성 계열 표현. 둘 다 나오면 빈 배열(전 성별). */
export function parseGenders(text: string): {
  value: CampaignPlanGender[];
  source: string | null;
} {
  const female = /(여성|여자|우먼|women|female|girls?)/i.exec(text);
  const male = /(남성|남자|맨(?![a-z])|men(?![a-z])|male|boys?)/i.exec(text);
  const hasFemale = female != null;
  const hasMale = male != null;
  // 둘 다 언급되면 특정 타깃 아님 → 전 성별(빈 배열)
  if (hasFemale && hasMale) return { value: [], source: null };
  if (hasFemale) return { value: ["female"], source: female?.[0] ?? null };
  if (hasMale) return { value: ["male"], source: male?.[0] ?? null };
  return { value: [], source: null };
}

/** 파서의 browse 지역 id 목록 → 17시도 코드 (그룹은 소속 시도로 확장) */
function regionIdsToSidoCodes(ids: string[] | null): SidoCode[] {
  if (!ids || ids.length === 0) return [];
  const out = new Set<SidoCode>();
  for (const id of ids) {
    if (id === "national") continue; // 전국 = 빈 선택(전 지역)
    const direct = normalizeSidoCodes([id]);
    if (direct.length > 0) {
      // 파서가 이미 시도 코드를 준 경우
      for (const c of direct) out.add(c);
      continue;
    }
    for (const c of browseMainIdToSidoCodes(id)) out.add(c);
  }
  return normalizeSidoCodes([...out]);
}

/**
 * 자연어 → CampaignBriefInput (+ 필드별 근거).
 * 인식 못 한 필드는 EMPTY_BRIEF 기본값(빈/전체)으로 남긴다.
 */
export function parseBriefFromText(text: string): BriefParseResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return {
      brief: { ...EMPTY_BRIEF, freeText: "" },
      durationDays: null,
      meta: {
        budget: EMPTY_META,
        regions: EMPTY_META,
        genders: EMPTY_META,
        ageBands: EMPTY_META,
        goal: EMPTY_META,
        industry: EMPTY_META,
        duration: EMPTY_META,
      },
      unmatchedTokens: [],
    };
  }

  const parsed = parsePlannerFreetextBrief(trimmed);
  const f = parsed.fields;

  const budgetMan = f.budgetMan.value;
  const budgetInputWon = budgetMan != null ? Math.round(budgetMan * 10_000) : 0;

  const regionCodes = regionIdsToSidoCodes(f.regions.value);

  const genderParse = parseGenders(trimmed);

  const ageBands: BriefAgeBand[] = [];
  for (const k of f.ageKeys.value ?? []) {
    if (k === "ageAll") continue;
    const band = AGE_MAP[k as Exclude<PlannerAgeKey, "ageAll">];
    if (band && !ageBands.includes(band)) ageBands.push(band);
  }

  const goal = f.campaignGoal.value ? GOAL_MAP[f.campaignGoal.value] : null;
  const industry = f.industryKey.value
    ? INDUSTRY_MAP[f.industryKey.value]
    : null;

  const durationDays = f.durationDays.value ?? null;

  const brief: CampaignBriefInput = {
    ...EMPTY_BRIEF,
    budgetInputWon,
    budgetMode: "total",
    regionCodes,
    genders: genderParse.value,
    ageBands,
    goal,
    industry,
    freeText: trimmed,
  };

  return {
    brief,
    durationDays,
    meta: {
      budget: {
        filled: budgetInputWon > 0,
        confidence: f.budgetMan.confidence,
        source: f.budgetMan.source,
      },
      regions: {
        filled: regionCodes.length > 0,
        confidence: f.regions.confidence,
        source: f.regions.source,
      },
      genders: {
        filled: genderParse.value.length > 0,
        confidence: "high",
        source: genderParse.source,
      },
      ageBands: {
        filled: ageBands.length > 0,
        confidence: f.ageKeys.confidence,
        source: f.ageKeys.source,
      },
      goal: {
        filled: goal != null,
        confidence: f.campaignGoal.confidence,
        source: f.campaignGoal.source,
      },
      industry: {
        filled: industry != null,
        confidence: f.industryKey.confidence,
        source: f.industryKey.source,
      },
      duration: {
        filled: durationDays != null,
        confidence: f.durationDays.confidence,
        source: f.durationDays.source,
      },
    },
    unmatchedTokens: parsed.unmatchedTokens,
  };
}

/**
 * durationDays → flight 날짜 범위. 시작일 기본 = 오늘(포함), 종료 = 시작+일수-1.
 * 테스트 결정성을 위해 today 를 주입 가능하게 둔다.
 */
export function durationToFlight(
  durationDays: number,
  today: Date = new Date(),
): { flightStart: string; flightEnd: string } {
  const start = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()),
  );
  const end = new Date(start.getTime());
  end.setUTCDate(end.getUTCDate() + Math.max(1, durationDays) - 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { flightStart: iso(start), flightEnd: iso(end) };
}
