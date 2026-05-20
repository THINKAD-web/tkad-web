import { z } from "zod";

export const CONTACT_PHONE_RE = /^[\d\-+() ]{8,}$/;
export const CONTACT_EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const CONTACT_INQUIRY_TYPES = [
  "media_quote",
  "campaign_plan",
  "other",
] as const;
export type ContactInquiryType = (typeof CONTACT_INQUIRY_TYPES)[number];

/** 업종 */
export const CONTACT_INDUSTRIES = [
  "beauty_fashion",
  "fnb",
  "it_tech",
  "finance",
  "entertainment",
  "real_estate",
  "other",
] as const;
export type ContactIndustry = (typeof CONTACT_INDUSTRIES)[number];

/** 캠페인 목적 */
export const CONTACT_CAMPAIGN_GOALS = [
  "brand_awareness",
  "product_launch",
  "event_promo",
  "store_traffic",
  "other",
] as const;
export type ContactCampaignGoal = (typeof CONTACT_CAMPAIGN_GOALS)[number];

/** 희망 집행 지역 */
export const CONTACT_REGIONS = [
  "seoul_gangnam",
  "seoul_downtown",
  "seoul_other",
  "metro_area",
  "regional_cities",
  "nationwide",
] as const;
export type ContactRegion = (typeof CONTACT_REGIONS)[number];

/** 예산 범위 */
export const CONTACT_BUDGET_V2 = [
  "under_5m",
  "5m_10m",
  "10m_30m",
  "over_30m",
  "undecided",
] as const;
export type ContactBudgetV2 = (typeof CONTACT_BUDGET_V2)[number];

const INQUIRY_LABELS: Record<ContactInquiryType, { ko: string; en: string }> = {
  media_quote: { ko: "매체 견적 요청", en: "Media quote request" },
  campaign_plan: { ko: "캠페인 기획 상담", en: "Campaign planning consult" },
  other: { ko: "기타", en: "Other" },
};

const INDUSTRY_LABELS: Record<ContactIndustry, { ko: string; en: string }> = {
  beauty_fashion: { ko: "뷰티/패션", en: "Beauty / Fashion" },
  fnb: { ko: "식음료", en: "F&B" },
  it_tech: { ko: "IT/테크", en: "IT / Tech" },
  finance: { ko: "금융", en: "Finance" },
  entertainment: { ko: "엔터테인먼트", en: "Entertainment" },
  real_estate: { ko: "부동산", en: "Real estate" },
  other: { ko: "기타", en: "Other" },
};

const GOAL_LABELS: Record<ContactCampaignGoal, { ko: string; en: string }> = {
  brand_awareness: { ko: "브랜드 인지도", en: "Brand awareness" },
  product_launch: { ko: "신제품 론칭", en: "Product launch" },
  event_promo: { ko: "이벤트 홍보", en: "Event promotion" },
  store_traffic: { ko: "매장 집객", en: "Store traffic" },
  other: { ko: "기타", en: "Other" },
};

const REGION_LABELS: Record<ContactRegion, { ko: string; en: string }> = {
  seoul_gangnam: { ko: "서울 강남권", en: "Seoul — Gangnam" },
  seoul_downtown: { ko: "서울 도심권", en: "Seoul — Downtown" },
  seoul_other: { ko: "서울 기타", en: "Seoul — Other" },
  metro_area: { ko: "수도권", en: "Greater Seoul metro" },
  regional_cities: { ko: "지방 주요도시", en: "Major regional cities" },
  nationwide: { ko: "전국", en: "Nationwide" },
};

const BUDGET_LABELS: Record<ContactBudgetV2, { ko: string; en: string }> = {
  under_5m: { ko: "500만원 미만", en: "Under ₩5M" },
  "5m_10m": { ko: "500~1000만원", en: "₩5M–10M" },
  "10m_30m": { ko: "1000~3000만원", en: "₩10M–30M" },
  over_30m: { ko: "3000만원 이상", en: "₩30M+" },
  undecided: { ko: "미정", en: "Undecided" },
};

function loc(locale: string): "ko" | "en" {
  return locale === "en" ? "en" : "ko";
}

export function inquiryTypeLabelV2(code: ContactInquiryType, locale: string) {
  const row = INQUIRY_LABELS[code];
  return loc(locale) === "ko" ? row.ko : row.en;
}

export function industryLabel(code: ContactIndustry, locale: string) {
  const row = INDUSTRY_LABELS[code];
  return loc(locale) === "ko" ? row.ko : row.en;
}

export function campaignGoalLabel(code: ContactCampaignGoal, locale: string) {
  const row = GOAL_LABELS[code];
  return loc(locale) === "ko" ? row.ko : row.en;
}

export function regionLabel(code: ContactRegion, locale: string) {
  const row = REGION_LABELS[code];
  return loc(locale) === "ko" ? row.ko : row.en;
}

export function budgetLabelV2(code: ContactBudgetV2, locale: string) {
  const row = BUDGET_LABELS[code];
  return loc(locale) === "ko" ? row.ko : row.en;
}

export function labelsForGoals(codes: ContactCampaignGoal[], locale: string) {
  return codes.map((c) => campaignGoalLabel(c, locale)).join(", ");
}

export function labelsForRegions(codes: ContactRegion[], locale: string) {
  return codes.map((c) => regionLabel(c, locale)).join(", ");
}

const leadFieldsSchema = z.object({
  inquiryType: z.enum(CONTACT_INQUIRY_TYPES),
  company: z.string().trim().min(1),
  name: z.string().trim().min(1),
  phone: z.string().trim().optional(),
  email: z.string().trim().optional(),
  industry: z.enum(CONTACT_INDUSTRIES),
  campaignGoals: z.array(z.enum(CONTACT_CAMPAIGN_GOALS)).min(1),
  regions: z.array(z.enum(CONTACT_REGIONS)).min(1),
  budget: z.enum(CONTACT_BUDGET_V2),
  startDate: z.string().trim().optional(),
  additionalNotes: z.string().trim().optional(),
  /** URL·비교 견적에서 전달된 매체 ID */
  mediaIds: z.array(z.string().min(1)).max(12).optional(),
  website: z.string().optional(),
});

function refineContactLead<T extends z.ZodTypeAny>(schema: T) {
  return schema.superRefine((data, ctx) => {
    const phone = (data as { phone?: string }).phone?.trim() ?? "";
    const email = (data as { email?: string }).email?.trim() ?? "";
    if (!phone && !email) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "contactRequired", path: ["phone"] });
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "contactRequired", path: ["email"] });
    }
    if (phone && !CONTACT_PHONE_RE.test(phone)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "phoneFormat", path: ["phone"] });
    }
    if (email && !CONTACT_EMAIL_RE.test(email)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "emailFormat", path: ["email"] });
    }
    const start = (data as { startDate?: string }).startDate?.trim();
    if (start && Number.isNaN(Date.parse(start))) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "startDateInvalid", path: ["startDate"] });
    }
  });
}

export const contactLeadClientSchema = refineContactLead(leadFieldsSchema);
export type ContactLeadFormValues = z.infer<typeof contactLeadClientSchema>;

export const contactLeadSchema = refineContactLead(
  leadFieldsSchema.extend({
    locale: z.enum(["ko", "en"]).optional(),
    turnstileToken: z.string().optional(),
    cfTurnstileToken: z.string().optional(),
  }),
);

export const contactLeadDefaultValues: ContactLeadFormValues = {
  inquiryType: "media_quote",
  company: "",
  name: "",
  phone: "",
  email: "",
  industry: "other",
  campaignGoals: [],
  regions: [],
  budget: "undecided",
  startDate: "",
  additionalNotes: "",
  website: "",
};

export type ComposedContactLead = {
  inquiryLabel: string;
  budgetLabel: string;
  industryLabel: string;
  goalsLabel: string;
  regionsLabel: string;
  startDateLabel: string;
  storedMessage: string;
};

export function composeContactLeadStoredMessage(
  lead: ContactLeadFormValues,
  locale: string,
): ComposedContactLead {
  const isKo = loc(locale) === "ko";
  const inquiryLabel = inquiryTypeLabelV2(lead.inquiryType, locale);
  const budgetLbl = budgetLabelV2(lead.budget, locale);
  const industryLbl = industryLabel(lead.industry, locale);
  const goalsLbl = labelsForGoals(lead.campaignGoals, locale);
  const regionsLbl = labelsForRegions(lead.regions, locale);
  const startDateLbl =
    lead.startDate?.trim() ? lead.startDate.trim() : isKo ? "미정" : "TBD";

  const headers = [
    isKo ? `[문의 유형: ${inquiryLabel}]` : `[Inquiry type: ${inquiryLabel}]`,
    isKo ? `[업종: ${industryLbl}]` : `[Industry: ${industryLbl}]`,
    isKo ? `[캠페인 목적: ${goalsLbl}]` : `[Campaign goals: ${goalsLbl}]`,
    isKo ? `[희망 집행 지역: ${regionsLbl}]` : `[Target regions: ${regionsLbl}]`,
    isKo ? `[예산 범위: ${budgetLbl}]` : `[Budget: ${budgetLbl}]`,
    isKo ? `[희망 집행 시작일: ${startDateLbl}]` : `[Desired start: ${startDateLbl}]`,
  ];

  const notes = lead.additionalNotes?.trim() ?? "";
  const body = notes || (isKo ? "(추가 요청사항 없음)" : "(No additional notes)");

  return {
    inquiryLabel,
    budgetLabel: budgetLbl,
    industryLabel: industryLbl,
    goalsLabel: goalsLbl,
    regionsLabel: regionsLbl,
    startDateLabel: startDateLbl,
    storedMessage: `${headers.join("\n")}\n\n${body}`,
  };
}

export function isContactLeadV2Payload(raw: Record<string, unknown>): boolean {
  const t = raw.inquiryType;
  return typeof t === "string" && CONTACT_INQUIRY_TYPES.includes(t as ContactInquiryType);
}

export function normalizeLegacyInquiryType(raw: string | undefined): ContactInquiryType | null {
  if (!raw) return null;
  if (CONTACT_INQUIRY_TYPES.includes(raw as ContactInquiryType)) return raw as ContactInquiryType;
  if (raw === "media" || raw === "quote") return "media_quote";
  if (raw === "campaign") return "campaign_plan";
  if (raw === "other") return "other";
  return null;
}
