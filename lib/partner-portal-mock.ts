export const PARTNER_SESSION_EMAIL_KEY = "tkad-partner-email";

export type PartnerContractStatus = "active" | "pending_renewal" | "expired";

export type PartnerMediaStatus = "live" | "review" | "offline";

export type PartnerSettlementStatus = "paid" | "scheduled" | "processing";

export type PartnerContract = {
  id: string;
  titleKo: string;
  titleEn: string;
  status: PartnerContractStatus;
  startDate: string;
  endDate: string;
  valueMan: number;
  summaryKo: string;
  summaryEn: string;
};

export type PartnerMedia = {
  id: string;
  nameKo: string;
  nameEn: string;
  typeKo: string;
  typeEn: string;
  locationKo: string;
  locationEn: string;
  status: PartnerMediaStatus;
  lastUpdated: string;
  panelCount: number;
};

export type PartnerSettlement = {
  id: string;
  periodLabelKo: string;
  periodLabelEn: string;
  amountMan: number;
  status: PartnerSettlementStatus;
  paidDate?: string;
  scheduledDate?: string;
  noteKo: string;
  noteEn: string;
};

export type PartnerSharedCampaign = {
  id: string;
  titleKo: string;
  titleEn: string;
  brandKo: string;
  brandEn: string;
  progressPercent: number;
  statusKo: string;
  statusEn: string;
  startDate: string;
  endDate: string;
};

export type PartnerNotice = {
  id: string;
  titleKo: string;
  titleEn: string;
  bodyKo: string;
  bodyEn: string;
  date: string;
  pinned: boolean;
};

export type PartnerAccount = {
  id: string;
  companyKo: string;
  companyEn: string;
  email: string;
  contactNameKo: string;
  contactNameEn: string;
  phone: string;
  contracts: readonly PartnerContract[];
  media: readonly PartnerMedia[];
  settlements: readonly PartnerSettlement[];
  sharedCampaigns: readonly PartnerSharedCampaign[];
  notices: readonly PartnerNotice[];
};

export const contractStatusStyles: Record<
  PartnerContractStatus,
  { className: string; labelKo: string; labelEn: string }
> = {
  active: {
    className: "bg-emerald-100 text-emerald-800",
    labelKo: "유효",
    labelEn: "Active",
  },
  pending_renewal: {
    className: "bg-amber-100 text-amber-800",
    labelKo: "갱신 협의중",
    labelEn: "Renewal in progress",
  },
  expired: {
    className: "bg-slate-200 text-slate-700",
    labelKo: "만료",
    labelEn: "Expired",
  },
};

export const mediaStatusStyles: Record<
  PartnerMediaStatus,
  { className: string; labelKo: string; labelEn: string }
> = {
  live: {
    className: "bg-blue-100 text-blue-800",
    labelKo: "게재중",
    labelEn: "Live",
  },
  review: {
    className: "bg-amber-100 text-amber-800",
    labelKo: "검수중",
    labelEn: "In review",
  },
  offline: {
    className: "bg-slate-200 text-slate-700",
    labelKo: "비게재",
    labelEn: "Offline",
  },
};

export const settlementStatusStyles: Record<
  PartnerSettlementStatus,
  { className: string; labelKo: string; labelEn: string }
> = {
  paid: {
    className: "bg-emerald-100 text-emerald-800",
    labelKo: "지급완료",
    labelEn: "Paid",
  },
  scheduled: {
    className: "bg-sky-100 text-sky-800",
    labelKo: "지급예정",
    labelEn: "Scheduled",
  },
  processing: {
    className: "bg-violet-100 text-violet-800",
    labelKo: "정산처리중",
    labelEn: "Processing",
  },
};

const partnerA: PartnerAccount = {
  id: "PR-001",
  companyKo: "서울디지털사이니지",
  companyEn: "Seoul Digital Signage Co.",
  email: "partner1@example.com",
  contactNameKo: "박도현",
  contactNameEn: "Dohyun Park",
  phone: "010-2222-8899",
  contracts: [
    {
      id: "CTR-2025-OOH-12",
      titleKo: "수도권 DOOH 재고 공급 협약",
      titleEn: "Capital region DOOH inventory agreement",
      status: "active",
      startDate: "2025-04-01",
      endDate: "2027-03-31",
      valueMan: 120_000,
      summaryKo: "강남·홍대·성수 핵심 패널 재고 우선 공급 및 운영 데이터 공유 조항 포함.",
      summaryEn: "Priority supply for Gangnam, Hongdae, Seongsu panels plus ops data sharing.",
    },
    {
      id: "CTR-2024-SPT-03",
      titleKo: "특수 매체 공동 마케팅 부속합의",
      titleEn: "Special placements co-marketing addendum",
      status: "pending_renewal",
      startDate: "2024-01-15",
      endDate: "2026-01-14",
      valueMan: 18_500,
      summaryKo: "전시·팝업 연계 패키지 조건 재협상 예정.",
      summaryEn: "Terms for expo and pop-up bundles under renewal discussion.",
    },
  ],
  media: [
    {
      id: "M-P-001",
      nameKo: "강남대로 코너 LED A",
      nameEn: "Gangnam-daero corner LED A",
      typeKo: "로드사이드 LED",
      typeEn: "Roadside LED",
      locationKo: "서울 강남구 테헤란로 인근",
      locationEn: "Near Teheran-ro, Gangnam-gu, Seoul",
      status: "live",
      lastUpdated: "2026-03-26",
      panelCount: 1,
    },
    {
      id: "M-P-002",
      nameKo: "성수역 1번 출구 디지털 보드",
      nameEn: "Seongsu Stn. Exit 1 digital board",
      typeKo: "역세권 디지털",
      typeEn: "Station digital",
      locationKo: "서울 성동구 성수역",
      locationEn: "Seongsu Station, Seongdong-gu",
      status: "review",
      lastUpdated: "2026-03-20",
      panelCount: 2,
    },
  ],
  settlements: [
    {
      id: "STL-2026-02",
      periodLabelKo: "2026년 2월",
      periodLabelEn: "February 2026",
      amountMan: 4_280,
      status: "scheduled",
      scheduledDate: "2026-04-05",
      noteKo: "DOOH 송출 실적 기준 (자동 집계)",
      noteEn: "Based on DOOH play logs (auto-aggregated).",
    },
    {
      id: "STL-2026-01",
      periodLabelKo: "2026년 1월",
      periodLabelEn: "January 2026",
      amountMan: 3_960,
      status: "paid",
      paidDate: "2026-02-07",
      noteKo: "세금계산서 발행 완료",
      noteEn: "Tax invoice issued.",
    },
    {
      id: "STL-2025-12",
      periodLabelKo: "2025년 12월",
      periodLabelEn: "December 2025",
      amountMan: 5_120,
      status: "paid",
      paidDate: "2026-01-08",
      noteKo: "연말 성수기 프리미엄 가산 반영",
      noteEn: "Includes year-end premium uplift.",
    },
  ],
  sharedCampaigns: [
    {
      id: "SH-C-901",
      titleKo: "글로벌 뷰티 브랜드 강남 캠페인",
      titleEn: "Global beauty brand Gangnam flight",
      brandKo: "글로벌 뷰티 그룹",
      brandEn: "Global beauty group",
      progressPercent: 72,
      statusKo: "집행 중 · 소재 B안 교체 완료",
      statusEn: "Live · creative B swap complete",
      startDate: "2026-03-01",
      endDate: "2026-05-31",
    },
    {
      id: "SH-C-902",
      titleKo: "테크 기업 런칭 DOOH",
      titleEn: "Tech brand launch DOOH",
      brandKo: "○○테크",
      brandEn: "○○ Tech",
      progressPercent: 35,
      statusKo: "집행 초기 · 주간 리포트 공유",
      statusEn: "Early flight · weekly reports shared",
      startDate: "2026-03-18",
      endDate: "2026-06-30",
    },
  ],
  notices: [
    {
      id: "NT-03",
      titleKo: "파트너 포털 2단계 인증(2FA) 의무화 안내",
      titleEn: "2FA now required for partner portal",
      bodyKo:
        "보안 강화를 위해 2026년 4월 1일부터 모든 파트너 계정에 2FA 적용이 의무화됩니다. 미등록 시 로그인이 제한될 수 있으니 OTP 앱을 준비해 주세요. (본 화면은 데모이며 실제 정책과 다를 수 있습니다.)",
      bodyEn:
        "From April 1, 2026, 2FA will be mandatory for all partner accounts. Please prepare an authenticator app. (Demo copy; not a real policy.)",
      date: "2026-03-22",
      pinned: true,
    },
    {
      id: "NT-02",
      titleKo: "3월 정산 마감 및 증빙 업로드 안내",
      titleEn: "March settlement deadline & proof upload",
      bodyKo:
        "3월분 정산 증빙은 4월 3일 18:00까지 포털에서 업로드해 주세요. 누락 시 다음 사이클로 이월됩니다.",
      bodyEn:
        "Upload March settlement proofs by Apr 3, 18:00 KST. Missing docs roll to the next cycle.",
      date: "2026-03-15",
      pinned: false,
    },
    {
      id: "NT-01",
      titleKo: "매체 스펙 업데이트 가이드",
      titleEn: "Media spec update guide",
      bodyKo:
        "신규 해상도·재생 길이 기준이 리소스 페이지에 반영되었습니다. 등록 매체 정보를 최신화해 주세요.",
      bodyEn:
        "New resolution and spot-length standards are on the resources page. Please refresh your listings.",
      date: "2026-03-01",
      pinned: false,
    },
  ],
};

const partnerB: PartnerAccount = {
  id: "PR-002",
  companyKo: "부산트랜짓미디어",
  companyEn: "Busan Transit Media",
  email: "partner2@example.com",
  contactNameKo: "최유진",
  contactNameEn: "Yujin Choi",
  phone: "010-3333-4411",
  contracts: [
    {
      id: "CTR-2025-BS-01",
      titleKo: "부산권 교통 매체 독점 공급 MOU",
      titleEn: "Busan transit inventory MOU",
      status: "active",
      startDate: "2025-06-01",
      endDate: "2028-05-31",
      valueMan: 86_000,
      summaryKo: "지하철·버스 디지털 네트워크 우선 입찰권.",
      summaryEn: "Preferred bid access for subway and bus digital networks.",
    },
  ],
  media: [
    {
      id: "M-B-101",
      nameKo: "서면역 대합실 LED 월",
      nameEn: "Seomyeon concourse LED wall",
      typeKo: "역사 디지털",
      typeEn: "Station hall digital",
      locationKo: "부산 부산진구 서면역",
      locationEn: "Seomyeon Station, Busanjin-gu",
      status: "live",
      lastUpdated: "2026-03-25",
      panelCount: 4,
    },
  ],
  settlements: [
    {
      id: "STL-B-2026-02",
      periodLabelKo: "2026년 2월",
      periodLabelEn: "February 2026",
      amountMan: 2_100,
      status: "processing",
      noteKo: "광역시 단가 조정 검토 중",
      noteEn: "Metro pricing adjustment under review.",
    },
  ],
  sharedCampaigns: [
    {
      id: "SH-B-10",
      titleKo: "지역 프랜차이즈 F&B 캠페인",
      titleEn: "Regional F&B franchise flight",
      brandKo: "○○치킨",
      brandEn: "○○ Chicken",
      progressPercent: 55,
      statusKo: "집행 중",
      statusEn: "In flight",
      startDate: "2026-02-10",
      endDate: "2026-04-30",
    },
  ],
  notices: partnerA.notices,
};

export const mockPartners: PartnerAccount[] = [partnerA, partnerB];

export function findPartnerByEmail(email: string): PartnerAccount | undefined {
  const e = email.trim().toLowerCase();
  return mockPartners.find((p) => p.email.toLowerCase() === e);
}

export function getDefaultDemoPartner(): PartnerAccount {
  return mockPartners[0];
}

/** 데모용 고정 2FA 코드 (실서비스에서는 TOTP 검증) */
export const DEMO_PARTNER_OTP = "123456";
