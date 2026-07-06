import type {
  ParsedField,
  ParseConfidence,
  PlannerFreetextParseResult,
} from "@/lib/planner/parse-freetext-brief";
import { plannerRegionLabel } from "@/lib/planner/planner-regions";
import {
  PLANNER_SEOUL_ZONE_LABELS,
  type PlannerSeoulZoneKey,
} from "@/lib/planner/seoul-zones";
import type {
  PlannerAgeKey,
  PlannerCampaignGoal,
  PlannerIndustryKey,
} from "@/lib/planner/types";

const GOAL_LABELS: Record<PlannerCampaignGoal, { ko: string; en: string }> = {
  brand: { ko: "브랜딩·인지", en: "Brand awareness" },
  launch: { ko: "런칭·출시", en: "Launch" },
  event: { ko: "프로모션·이벤트", en: "Promotion / event" },
  sales: { ko: "전환·매출", en: "Conversion" },
  local: { ko: "로컬·상권", en: "Local" },
};

const GOAL_SUMMARY_SUFFIX: Record<PlannerCampaignGoal, { ko: string; en: string }> =
  {
    brand: { ko: "브랜딩 목표", en: "brand awareness" },
    launch: { ko: "런칭 목표", en: "launch" },
    event: { ko: "프로모션·이벤트", en: "promotion / event" },
    sales: { ko: "전환·매출", en: "conversion" },
    local: { ko: "로컬·상권", en: "local trade area" },
  };

const INDUSTRY_LABELS: Record<PlannerIndustryKey, { ko: string; en: string }> = {
  indFb: { ko: "F&B", en: "F&B" },
  indRetail: { ko: "리테일·뷰티", en: "Retail / beauty" },
  indTech: { ko: "IT·테크", en: "Tech" },
  indFinance: { ko: "금융", en: "Finance" },
  indEnt: { ko: "엔터", en: "Entertainment" },
  indOther: { ko: "기타", en: "Other" },
};

const AGE_LABELS: Record<PlannerAgeKey, { ko: string; en: string }> = {
  ageAll: { ko: "전 연령", en: "All ages" },
  age20s: { ko: "20대", en: "20s" },
  age30s: { ko: "30대", en: "30s" },
  age40s: { ko: "40대", en: "40s" },
  age50plus: { ko: "50대+", en: "50s+" },
};

export type FreetextEvidenceRow = {
  key: string;
  label: string;
  valueText: string;
  source: string | null;
  confidence: ParseConfidence;
};

function locale(isKo: boolean): "ko" | "en" {
  return isKo ? "ko" : "en";
}

function formatRegions(
  regions: string[] | null,
  zones: PlannerSeoulZoneKey[] | null,
  isKo: boolean,
  preferZones = false,
): string | null {
  if (!regions?.length && !zones?.length) return null;

  const zoneParts: string[] = [];
  if (zones?.length) {
    for (const z of zones) {
      const row = PLANNER_SEOUL_ZONE_LABELS[z];
      zoneParts.push(isKo ? row.labelKo : row.labelEn);
    }
  }

  if (preferZones && zoneParts.length > 0) {
    return [...new Set(zoneParts)].join(", ");
  }

  const parts: string[] = [];
  if (regions?.length) {
    for (const r of regions) {
      parts.push(plannerRegionLabel(r, locale(isKo)));
    }
  }
  parts.push(...zoneParts);
  return [...new Set(parts)].join(", ");
}

function combineSources(...parts: Array<string | null | undefined>): string | null {
  const merged = parts
    .flatMap((p) => (p ? p.split(/[,·]/).map((s) => s.trim()) : []))
    .filter((s) => s.length > 0);
  if (merged.length === 0) return null;
  return [...new Set(merged)].join(", ");
}

function regionConfidence(
  regions: ParsedField<string[]>,
  zones: ParsedField<PlannerSeoulZoneKey[]>,
): ParseConfidence {
  if (regions.confidence === "low" || zones.confidence === "low") return "low";
  return "high";
}

export function buildFreetextEvidenceRows(
  result: PlannerFreetextParseResult,
  isKo: boolean,
): FreetextEvidenceRow[] {
  const { fields } = result;
  const rows: FreetextEvidenceRow[] = [];

  if (fields.campaignGoal.value != null) {
    rows.push({
      key: "goal",
      label: isKo ? "목표" : "Goal",
      valueText: isKo
        ? GOAL_LABELS[fields.campaignGoal.value].ko
        : GOAL_LABELS[fields.campaignGoal.value].en,
      source: fields.campaignGoal.source,
      confidence: fields.campaignGoal.confidence,
    });
  }

  const regionText = formatRegions(
    fields.regions.value,
    fields.seoulZones.value,
    isKo,
    true,
  );
  if (regionText) {
    rows.push({
      key: "region",
      label: isKo ? "지역" : "Region",
      valueText: regionText,
      source: combineSources(fields.regions.source, fields.seoulZones.source),
      confidence: regionConfidence(fields.regions, fields.seoulZones),
    });
  }

  if (fields.ageKeys.value?.length) {
    rows.push({
      key: "age",
      label: isKo ? "타깃" : "Target",
      valueText: fields.ageKeys.value
        .map((k) => (isKo ? AGE_LABELS[k].ko : AGE_LABELS[k].en))
        .join(", "),
      source: fields.ageKeys.source,
      confidence: fields.ageKeys.confidence,
    });
  }

  if (fields.industryKey.value != null) {
    rows.push({
      key: "industry",
      label: isKo ? "업종" : "Industry",
      valueText: isKo
        ? INDUSTRY_LABELS[fields.industryKey.value].ko
        : INDUSTRY_LABELS[fields.industryKey.value].en,
      source: fields.industryKey.source,
      confidence: fields.industryKey.confidence,
    });
  }

  if (fields.budgetMan.value != null) {
    rows.push({
      key: "budget",
      label: isKo ? "예산" : "Budget",
      valueText: isKo
        ? `월 ${fields.budgetMan.value.toLocaleString("ko-KR")}만원`
        : `${fields.budgetMan.value.toLocaleString()}M KRW/mo`,
      source: fields.budgetMan.source,
      confidence: fields.budgetMan.confidence,
    });
  }

  if (fields.months.value != null) {
    rows.push({
      key: "months",
      label: isKo ? "기간" : "Duration",
      valueText: isKo
        ? `${fields.months.value}개월`
        : `${fields.months.value} mo`,
      source: fields.months.source,
      confidence: fields.months.confidence,
    });
  }

  return rows;
}

/** Step 4 배너용 짧은 라벨 (예: 강남·2030·브랜딩) */
export function buildFreetextBriefSummaryShort(
  result: PlannerFreetextParseResult,
  isKo: boolean,
): string | null {
  const { fields } = result;
  const parts: string[] = [];

  const regionText = formatRegions(
    fields.regions.value,
    fields.seoulZones.value,
    isKo,
    true,
  );
  if (regionText) {
    parts.push(regionText.split(",")[0]!.trim());
  }

  if (fields.ageKeys.value?.length) {
    const has2030 =
      fields.ageKeys.value.includes("age20s") &&
      fields.ageKeys.value.includes("age30s");
    if (has2030) {
      parts.push(isKo ? "2030" : "Gen Z");
    } else {
      parts.push(
        fields.ageKeys.value
          .map((k) => (isKo ? AGE_LABELS[k].ko : AGE_LABELS[k].en))
          .join(isKo ? "·" : ", "),
      );
    }
  }

  if (fields.industryKey.value != null) {
    parts.push(
      isKo
        ? INDUSTRY_LABELS[fields.industryKey.value].ko
        : INDUSTRY_LABELS[fields.industryKey.value].en,
    );
  }

  if (fields.campaignGoal.value != null) {
    parts.push(
      isKo
        ? GOAL_SUMMARY_SUFFIX[fields.campaignGoal.value].ko.replace(/ 목표$/, "")
        : GOAL_SUMMARY_SUFFIX[fields.campaignGoal.value].en,
    );
  }

  if (parts.length === 0) return null;
  return parts.join("·");
}

/** 브리프 한 문장 요약 (0토큰 템플릿) */
export function buildFreetextBriefSummarySentence(
  result: PlannerFreetextParseResult,
  isKo: boolean,
): string {
  const { fields } = result;
  const parts: string[] = [];

  const regionText = formatRegions(
    fields.regions.value,
    fields.seoulZones.value,
    isKo,
    true,
  );
  if (regionText) parts.push(regionText);

  if (fields.ageKeys.value?.length) {
    const ageText = fields.ageKeys.value
      .map((k) => (isKo ? AGE_LABELS[k].ko : AGE_LABELS[k].en))
      .join(isKo ? "·" : ", ");
    parts.push(isKo ? `${ageText} 타깃` : `${ageText} target`);
  }

  if (fields.industryKey.value != null) {
    parts.push(
      isKo
        ? INDUSTRY_LABELS[fields.industryKey.value].ko
        : INDUSTRY_LABELS[fields.industryKey.value].en,
    );
  }

  if (fields.campaignGoal.value != null) {
    parts.push(
      isKo
        ? GOAL_SUMMARY_SUFFIX[fields.campaignGoal.value].ko
        : GOAL_SUMMARY_SUFFIX[fields.campaignGoal.value].en,
    );
  }

  if (fields.budgetMan.value != null) {
    parts.push(
      isKo
        ? `월 ${fields.budgetMan.value.toLocaleString("ko-KR")}만원`
        : `${fields.budgetMan.value.toLocaleString()}M KRW/mo`,
    );
  }

  if (fields.months.value != null) {
    parts.push(
      isKo ? `${fields.months.value}개월` : `${fields.months.value} mo`,
    );
  }

  if (parts.length === 0) {
    return isKo
      ? "인식된 조건이 없습니다. Step 2~3에서 직접 선택해 주세요."
      : "No fields detected. Set goal, region, and budget in Steps 2–3.";
  }

  if (isKo) {
    return `${parts.join(" · ")}으로 이해했습니다.`;
  }
  return `Understood as ${parts.join(" · ")}.`;
}
