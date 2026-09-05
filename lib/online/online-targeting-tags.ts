/**
 * PR5-d 시드의 `targetingOptions`는 `"category:VALUE"` 형식 구조화 태그다
 * (예: `"industry:ECOMMERCE"`, `"goal:AWARENESS"`, `"age:18-24"`, `"gender:ALL"`,
 * `"geo:KR"`). 상세페이지(`onlineTargetingLabel`)와 플래너 스코어링
 * (`recommendOnlineCatalogChannels`)이 이 파서를 공유한다.
 */

export type TargetingCategory = "industry" | "goal" | "age" | "gender" | "geo";

const TARGETING_CATEGORIES: readonly TargetingCategory[] = [
  "industry",
  "goal",
  "age",
  "gender",
  "geo",
];

function isTargetingCategory(v: string): v is TargetingCategory {
  return (TARGETING_CATEGORIES as readonly string[]).includes(v);
}

export function parseTargetingTag(
  tag: string,
): { category: TargetingCategory; value: string } | null {
  const idx = tag.indexOf(":");
  if (idx <= 0) return null;
  const category = tag.slice(0, idx).trim();
  const value = tag.slice(idx + 1).trim();
  if (!value || !isTargetingCategory(category)) return null;
  return { category, value };
}

/** `["industry:ECOMMERCE", "goal:AWARENESS", ...]` → `{ industry: ["ECOMMERCE"], goal: ["AWARENESS"] }` */
export function groupTargetingOptions(
  options: string[] | null | undefined,
): Partial<Record<TargetingCategory, string[]>> {
  const groups: Partial<Record<TargetingCategory, string[]>> = {};
  for (const raw of options ?? []) {
    const parsed = parseTargetingTag(raw);
    if (!parsed) continue;
    const bucket = groups[parsed.category] ?? [];
    if (!bucket.includes(parsed.value)) bucket.push(parsed.value);
    groups[parsed.category] = bucket;
  }
  return groups;
}

/** 특정 카테고리에 특정 값이 태그돼 있는지 (PART3 스코어링 매칭용) */
export function targetingHasValue(
  options: string[] | null | undefined,
  category: TargetingCategory,
  value: string,
): boolean {
  return (options ?? []).includes(`${category}:${value}`);
}

const INDUSTRY_LABEL_KO: Record<string, string> = {
  ECOMMERCE: "이커머스",
  BEAUTY: "뷰티",
  FNB: "요식업",
  LOCAL: "로컬",
  EDU: "교육",
  MEDICAL: "의료",
  REALESTATE: "부동산",
  B2B: "B2B",
  APP: "앱",
  ENTER: "엔터테인먼트",
};

const INDUSTRY_LABEL_EN: Record<string, string> = {
  ECOMMERCE: "E-commerce",
  BEAUTY: "Beauty",
  FNB: "F&B",
  LOCAL: "Local biz",
  EDU: "Education",
  MEDICAL: "Medical",
  REALESTATE: "Real estate",
  B2B: "B2B",
  APP: "App",
  ENTER: "Entertainment",
};

const GOAL_LABEL_KO: Record<string, string> = {
  AWARENESS: "인지도",
  LEAD: "리드 수집",
  CONVERSION: "전환",
  TRAFFIC: "트래픽",
  VISIT: "매장 방문",
  APP_INSTALL: "앱 설치",
};

const GOAL_LABEL_EN: Record<string, string> = {
  AWARENESS: "Awareness",
  LEAD: "Lead gen",
  CONVERSION: "Conversion",
  TRAFFIC: "Traffic",
  VISIT: "Store visit",
  APP_INSTALL: "App install",
};

const GENDER_LABEL_KO: Record<string, string> = {
  ALL: "전체",
  MALE: "남성",
  FEMALE: "여성",
};

const GENDER_LABEL_EN: Record<string, string> = {
  ALL: "All",
  MALE: "Male",
  FEMALE: "Female",
};

const GEO_LABEL_KO: Record<string, string> = {
  KR: "전국",
};

const GEO_LABEL_EN: Record<string, string> = {
  KR: "Nationwide",
};

function labelForValue(
  category: TargetingCategory,
  value: string,
  isKo: boolean,
): string {
  switch (category) {
    case "industry":
      return (isKo ? INDUSTRY_LABEL_KO : INDUSTRY_LABEL_EN)[value] ?? value;
    case "goal":
      return (isKo ? GOAL_LABEL_KO : GOAL_LABEL_EN)[value] ?? value;
    case "age":
      return value.replace("-", isKo ? "~" : "–");
    case "gender":
      return (isKo ? GENDER_LABEL_KO : GENDER_LABEL_EN)[value] ?? value;
    case "geo":
      return (isKo ? GEO_LABEL_KO : GEO_LABEL_EN)[value] ?? value;
    default:
      return value;
  }
}

const CATEGORY_GROUP_LABEL_KO: Record<TargetingCategory, string> = {
  industry: "업종",
  goal: "목표",
  age: "연령",
  gender: "성별",
  geo: "지역",
};

const CATEGORY_GROUP_LABEL_EN: Record<TargetingCategory, string> = {
  industry: "Industry",
  goal: "Goal",
  age: "Age",
  gender: "Gender",
  geo: "Region",
};

export type TargetingGroupDisplay = {
  category: TargetingCategory;
  groupLabel: string;
  valueLabel: string;
};

/** 그룹별 칩 표시용 — `[{ category: "industry", groupLabel: "업종", valueLabel: "이커머스·뷰티" }, ...]` */
export function targetingGroupsDisplay(
  options: string[] | null | undefined,
  isKo: boolean,
): TargetingGroupDisplay[] {
  const groups = groupTargetingOptions(options);
  const groupLabels = isKo ? CATEGORY_GROUP_LABEL_KO : CATEGORY_GROUP_LABEL_EN;
  return TARGETING_CATEGORIES.filter((cat) => (groups[cat]?.length ?? 0) > 0).map(
    (cat) => ({
      category: cat,
      groupLabel: groupLabels[cat],
      valueLabel: groups[cat]!.map((v) => labelForValue(cat, v, isKo)).join(
        isKo ? "·" : ", ",
      ),
    }),
  );
}

/** "업종: 이커머스·뷰티 / 목표: 인지도 / 연령: 18~24·25~34 / 성별: 전체 / 지역: 전국" */
export function formatTargetingSummary(
  options: string[] | null | undefined,
  isKo: boolean,
): string | null {
  const groups = targetingGroupsDisplay(options, isKo);
  if (groups.length === 0) return null;
  return groups.map((g) => `${g.groupLabel}: ${g.valueLabel}`).join(" / ");
}
