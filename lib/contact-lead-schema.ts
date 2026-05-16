import { z } from "zod";
import {
  budgetLabel,
  composeStoredMessage,
  type BudgetCode,
} from "@/lib/contact-inquiry-labels";

export const CONTACT_INQUIRY_TYPES = [
  "media_quote",
  "campaign_plan",
  "other",
] as const;
export type ContactInquiryType = (typeof CONTACT_INQUIRY_TYPES)[number];

export const CONTACT_INDUSTRIES = [
  "fashion_beauty",
  "fmcg_retail",
  "tech_it",
  "finance_insurance",
  "automotive",
  "healthcare_pharma",
  "realestate",
  "food_beverage",
  "public_ngo",
  "other",
] as const;
export type ContactIndustry = (typeof CONTACT_INDUSTRIES)[number];

export const CONTACT_CAMPAIGN_GOALS = [
  "brand_awareness",
  "product_launch",
  "performance",
  "seasonal_promo",
  "event_geo",
  "recruiting",
  "other",
] as const;
export type ContactCampaignGoal = (typeof CONTACT_CAMPAIGN_GOALS)[number];

export const CONTACT_REGIONS = [
  "seoul_gangnam",
  "seoul_gangbuk",
  "capital_area",
  "busan_gyeongnam",
  "nationwide",
  "undecided",
] as const;
export type ContactRegion = (typeof CONTACT_REGIONS)[number];

export const CONTACT_BUDGET_V2 = [
  "under_10m",
  "10m_50m",
  "50m_100m",
  "over_100m",
] as const;
export type ContactBudgetV2 = (typeof CONTACT_BUDGET_V2)[number];

const PHONE_RE = /^[\d\-+() ]{8,}$/;

const INQUIRY_LABELS_V2: Record<
  ContactInquiryType,
  { ko: string; en: string }
> = {
  media_quote: { ko: "매체·견적", en: "Media & quote" },
  campaign_plan: { ko: "캠페인 기획", en: "Campaign planning" },
  other: { ko: "기타", en: "Other" },
};

const INDUSTRY_LABELS: Record<ContactIndustry, { ko: string; en: string }> = {
  fashion_beauty: { ko: "패션·뷰티", en: "Fashion & beauty" },
  fmcg_retail: { ko: "FMCG·리테일", en: "FMCG & retail" },
  tech_it: { ko: "테크·IT", en: "Tech & IT" },
  finance_insurance: { ko: "금융·보험", en: "Finance & insurance" },
  automotive: { ko: "자동차", en: "Automotive" },
  healthcare_pharma: { ko: "헬스케어·제약", en: "Healthcare & pharma" },
  realestate: { ko: "부동산", en: "Real estate" },
  food_beverage: { ko: "식음료", en: "Food & beverage" },
  public_ngo: { ko: "공공·NGO", en: "Public & NGO" },
  other: { ko: "기타", en: "Other" },
};

const GOAL_LABELS: Record<ContactCampaignGoal, { ko: string; en: string }> = {
  brand_awareness: { ko: "브랜드 인지도", en: "Brand awareness" },
  product_launch: { ko: "신제품·런칭", en: "Product launch" },
  performance: { ko: "성과·전환", en: "Performance" },
  seasonal_promo: { ko: "시즌·프로모션", en: "Seasonal promo" },
  event_geo: { ko: "이벤트·거점", en: "Event & geo" },
  recruiting: { ko: "채용·리크루팅", en: "Recruiting" },
  other: { ko: "기타", en: "Other" },
};

const REGION_LABELS: Record<ContactRegion, { ko: string; en: string }> = {
  seoul_gangnam: { ko: "서울(강남·홍대·잠실 등)", en: "Seoul core" },
  seoul_gangbuk: { ko: "서울(강북·도심 등)", en: "Seoul north/central" },
  capital_area: { ko: "수도권", en: "Capital area" },
  busan_gyeongnam: { ko: "부산·경남 등 지역", en: "Busan & regional" },
  nationwide: { ko: "전국", en: "Nationwide" },
  undecided: { ko: "미정", en: "Undecided" },
};

export function inquiryTypeLabelV2(
  code: ContactInquiryType,
  locale: string,
): string {
  const row = INQUIRY_LABELS_V2[code];
  return locale === "ko" ? row.ko : row.en;
}

export function industryLabel(code: ContactIndustry, locale: string): string {
  const row = INDUSTRY_LABELS[code];
  return locale === "ko" ? row.ko : row.en;
}

export function campaignGoalLabel(
  code: ContactCampaignGoal,
  locale: string,
): string {
  const row = GOAL_LABELS[code];
  return locale === "ko" ? row.ko : row.en;
}

export function regionLabel(code: ContactRegion, locale: string): string {
  const row = REGION_LABELS[code];
  return locale === "ko" ? row.ko : row.en;
}

export function budgetLabelV2(code: ContactBudgetV2, locale: string): string {
  return budgetLabel(code as BudgetCode, locale);
}

export function parseContactInquiryTypeV2(
  raw: string | undefined,
): ContactInquiryType | null {
  if (!raw) return null;
  return CONTACT_INQUIRY_TYPES.includes(raw as ContactInquiryType)
    ? (raw as ContactInquiryType)
    : null;
}

export function parseContactIndustry(
  raw: string | undefined,
): ContactIndustry | null {
  if (!raw) return null;
  return CONTACT_INDUSTRIES.includes(raw as ContactIndustry)
    ? (raw as ContactIndustry)
    : null;
}

export function parseContactBudgetV2(
  raw: string | undefined,
): ContactBudgetV2 | null {
  if (!raw) return null;
  return CONTACT_BUDGET_V2.includes(raw as ContactBudgetV2)
    ? (raw as ContactBudgetV2)
    : null;
}

function parseGoalList(input: unknown): ContactCampaignGoal[] | null {
  if (!Array.isArray(input)) return null;
  const out: ContactCampaignGoal[] = [];
  for (const g of input) {
    if (typeof g !== "string") return null;
    if (!CONTACT_CAMPAIGN_GOALS.includes(g as ContactCampaignGoal)) return null;
    out.push(g as ContactCampaignGoal);
  }
  return out;
}

function parseRegionList(input: unknown): ContactRegion[] | null {
  if (!Array.isArray(input)) return null;
  const out: ContactRegion[] = [];
  for (const r of input) {
    if (typeof r !== "string") return null;
    if (!CONTACT_REGIONS.includes(r as ContactRegion)) return null;
    out.push(r as ContactRegion);
  }
  return out;
}

export function buildContactLeadDetailLines(
  opts: {
    locale: "ko" | "en";
    industry: ContactIndustry;
    campaignGoals: ContactCampaignGoal[];
    regions: ContactRegion[];
    startDate: string;
    additionalNotes: string;
  },
  joiner: { goals: string; regions: string },
): string {
  const isKo = opts.locale === "ko";
  const ind = industryLabel(opts.industry, opts.locale);
  const goals = opts.campaignGoals
    .map((g) => campaignGoalLabel(g, opts.locale))
    .join(joiner.goals);
  const regs = opts.regions
    .map((r) => regionLabel(r, opts.locale))
    .join(joiner.regions);
  const head: string[] = [
    isKo ? `[업종: ${ind}]` : `[Industry: ${ind}]`,
    isKo ? `[캠페인 목표: ${goals}]` : `[Campaign goals: ${goals}]`,
    isKo ? `[희망 지역: ${regs}]` : `[Target regions: ${regs}]`,
    isKo
      ? `[시작 희망일: ${opts.startDate}]`
      : `[Preferred start: ${opts.startDate}]`,
  ];
  return `${head.join("\n")}\n\n${opts.additionalNotes.trim()}`;
}

export function composeContactLeadStoredMessage(args: {
  locale: "ko" | "en";
  inquiryType: ContactInquiryType;
  budget: ContactBudgetV2;
  industry: ContactIndustry;
  campaignGoals: ContactCampaignGoal[];
  regions: ContactRegion[];
  startDate: string;
  additionalNotes: string;
}): string {
  const joiner =
    args.locale === "ko"
      ? { goals: " · ", regions: " · " }
      : { goals: ", ", regions: ", " };
  const body = buildContactLeadDetailLines(
    {
      locale: args.locale,
      industry: args.industry,
      campaignGoals: args.campaignGoals,
      regions: args.regions,
      startDate: args.startDate,
      additionalNotes: args.additionalNotes,
    },
    joiner,
  );
  const inquiryLbl = inquiryTypeLabelV2(args.inquiryType, args.locale);
  const budgetLbl = budgetLabelV2(args.budget, args.locale);
  return composeStoredMessage(inquiryLbl, body, args.locale, budgetLbl);
}

export const contactLeadClientSchema = z.object({
  inquiryType: z.enum(CONTACT_INQUIRY_TYPES),
  company: z.string().trim().min(1),
  name: z.string().trim().min(1),
  phone: z.string().trim().regex(PHONE_RE, { message: "phoneFormat" }),
  email: z.string().trim().email(),
  industry: z.enum(CONTACT_INDUSTRIES),
  campaignGoals: z.array(z.enum(CONTACT_CAMPAIGN_GOALS)).min(1),
  regions: z.array(z.enum(CONTACT_REGIONS)).min(1),
  budget: z.enum(CONTACT_BUDGET_V2),
  startDate: z
    .string()
    .trim()
    .min(1)
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "startDateInvalid" }),
  additionalNotes: z.string().trim().min(1),
  website: z.string(),
});

export type ContactLeadFormValues = z.infer<typeof contactLeadClientSchema>;

export const contactLeadDefaultValues: ContactLeadFormValues = {
  inquiryType: "media_quote",
  company: "",
  name: "",
  phone: "",
  email: "",
  industry: "other",
  campaignGoals: [],
  regions: [],
  budget: "under_10m",
  startDate: "",
  additionalNotes: "",
  website: "",
};

export function parseCampaignGoalsFromBody(
  input: unknown,
): ContactCampaignGoal[] | null {
  const list = parseGoalList(input);
  return list && list.length > 0 ? list : null;
}

export function parseRegionsFromBody(input: unknown): ContactRegion[] | null {
  const list = parseRegionList(input);
  return list && list.length > 0 ? list : null;
}
