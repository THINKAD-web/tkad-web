import {
  type CrmScoringInput,
  repurchaseLikelihood,
  segmentCustomer,
  segmentRationaleKeys,
  type CustomerSegment,
  type SegmentRationaleKey,
} from "@/lib/crm-scoring";

export type CampaignStatus = "active" | "ended" | "scheduled";

export type CrmCampaign = {
  id: string;
  name: string;
  nameEn: string;
  status: CampaignStatus;
  startDate: string;
  endDate: string;
  impressions: number;
  reach: number;
  ctr: number;
  ctrBenchmark: number;
  spendMillion: number;
};

export type CrmCustomer = {
  id: string;
  company: string;
  companyEn: string;
  contactName: string;
  email: string;
  phone: string;
  budgetTier: 1 | 2 | 3 | 4;
  campaigns: CrmCampaign[];
};

export type CrmLeadStage =
  | "new"
  | "contacted"
  | "qualified"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";

export type CrmLead = {
  id: string;
  company: string;
  companyEn: string;
  contactName: string;
  email: string;
  source: string;
  sourceEn: string;
  stage: CrmLeadStage;
  valueMillion: number;
  createdAt: string;
  lastTouchAt: string;
};

export const demoCustomers: CrmCustomer[] = [
  {
    id: "cust-samsung",
    company: "삼성전자",
    companyEn: "Samsung Electronics",
    contactName: "김영수",
    email: "kim@samsung.com",
    phone: "010-1234-5678",
    budgetTier: 4,
    campaigns: [
      {
        id: "cp-s1",
        name: "갤럭시 S26 강남·명동 믹스 OOH",
        nameEn: "Galaxy S26 Gangnam–Myeongdong mix OOH",
        status: "active",
        startDate: "2026-02-01",
        endDate: "2026-05-31",
        impressions: 18_200_000,
        reach: 11_400_000,
        ctr: 0.41,
        ctrBenchmark: 0.35,
        spendMillion: 420,
      },
      {
        id: "cp-s0",
        name: "연말 프리미엄 빌보드",
        nameEn: "Year-end premium billboard",
        status: "ended",
        startDate: "2025-11-01",
        endDate: "2025-12-31",
        impressions: 9_800_000,
        reach: 6_200_000,
        ctr: 0.38,
        ctrBenchmark: 0.32,
        spendMillion: 280,
      },
    ],
  },
  {
    id: "cust-kakao",
    company: "카카오",
    companyEn: "Kakao",
    contactName: "정수빈",
    email: "jung@kakao.com",
    phone: "010-3333-7890",
    budgetTier: 2,
    campaigns: [
      {
        id: "cp-k1",
        name: "카카오T 봄 프로모션 쉘터",
        nameEn: "Kakao T spring shelter promo",
        status: "ended",
        startDate: "2026-01-10",
        endDate: "2026-03-20",
        impressions: 4_100_000,
        reach: 2_900_000,
        ctr: 0.29,
        ctrBenchmark: 0.33,
        spendMillion: 95,
      },
    ],
  },
  {
    id: "cust-hyundai",
    company: "현대자동차",
    companyEn: "Hyundai Motor",
    contactName: "박진호",
    email: "park@hyundai.com",
    phone: "010-5555-1234",
    budgetTier: 4,
    campaigns: [
      {
        id: "cp-h1",
        name: "전기차 라인업 전국 빌보드",
        nameEn: "EV lineup nationwide billboards",
        status: "scheduled",
        startDate: "2026-04-01",
        endDate: "2026-09-30",
        impressions: 0,
        reach: 0,
        ctr: 0,
        ctrBenchmark: 0.34,
        spendMillion: 0,
      },
    ],
  },
  {
    id: "cust-daangn",
    company: "당근마켓",
    companyEn: "Karrot Market",
    contactName: "윤서준",
    email: "yoon@daangn.com",
    phone: "010-1111-9999",
    budgetTier: 1,
    campaigns: [
      {
        id: "cp-d1",
        name: "지역 커뮤니티 버스 광고",
        nameEn: "Local community bus ads",
        status: "ended",
        startDate: "2025-08-01",
        endDate: "2025-10-15",
        impressions: 1_200_000,
        reach: 890_000,
        ctr: 0.36,
        ctrBenchmark: 0.3,
        spendMillion: 42,
      },
    ],
  },
];

export const initialLeads: CrmLead[] = [
  {
    id: "lead-1",
    company: "토스",
    companyEn: "Toss",
    contactName: "임하늘",
    email: "lim@toss.im",
    source: "웹 견적",
    sourceEn: "Web quote",
    stage: "qualified",
    valueMillion: 120,
    createdAt: "2026-03-26",
    lastTouchAt: "2026-03-27",
  },
  {
    id: "lead-2",
    company: "무신사",
    companyEn: "Musinsa",
    contactName: "조태현",
    email: "cho@musinsa.com",
    source: "전화 인바운드",
    sourceEn: "Inbound call",
    stage: "proposal",
    valueMillion: 85,
    createdAt: "2026-03-22",
    lastTouchAt: "2026-03-28",
  },
  {
    id: "lead-3",
    company: "배달의민족",
    companyEn: "Baemin",
    contactName: "오승현",
    email: "oh@woowa.com",
    source: "미디어 검색",
    sourceEn: "Media search",
    stage: "new",
    valueMillion: 200,
    createdAt: "2026-03-28",
    lastTouchAt: "2026-03-28",
  },
  {
    id: "lead-4",
    company: "쿠팡",
    companyEn: "Coupang",
    contactName: "서민지",
    email: "seo@coupang.com",
    source: "레퍼럴",
    sourceEn: "Referral",
    stage: "negotiation",
    valueMillion: 310,
    createdAt: "2026-03-10",
    lastTouchAt: "2026-03-25",
  },
  {
    id: "lead-5",
    company: "라인",
    companyEn: "LINE",
    contactName: "강예린",
    email: "kang@line.me",
    source: "컨퍼런스",
    sourceEn: "Conference",
    stage: "contacted",
    valueMillion: 150,
    createdAt: "2026-03-18",
    lastTouchAt: "2026-03-24",
  },
];

export function buildScoringInput(customer: CrmCustomer): CrmScoringInput {
  const ended = customer.campaigns.filter((c) => c.status === "ended");
  const completedCampaigns = ended.length;
  const totalCampaigns = customer.campaigns.length;
  const lastEnd = ended
    .map((c) => new Date(c.endDate).getTime())
    .sort((a, b) => b - a)[0];
  const daysSinceLastCampaignEnd = lastEnd
    ? Math.max(
        0,
        Math.round((Date.now() - lastEnd) / (24 * 60 * 60 * 1000)),
      )
    : 730;

  const ctrVsBenchmark =
    ended.length > 0
      ? ended.reduce((s, c) => s + c.ctr / c.ctrBenchmark, 0) / ended.length
      : 0.95;

  return {
    budgetTier: customer.budgetTier,
    totalCampaigns,
    completedCampaigns,
    ctrVsBenchmark,
    daysSinceLastCampaignEnd,
  };
}

export function enrichCustomerRow(customer: CrmCustomer): {
  segment: CustomerSegment;
  repurchase: ReturnType<typeof repurchaseLikelihood>;
  rationaleKeys: SegmentRationaleKey[];
} {
  const input = buildScoringInput(customer);
  return {
    segment: segmentCustomer(input),
    repurchase: repurchaseLikelihood(input),
    rationaleKeys: segmentRationaleKeys(input),
  };
}
