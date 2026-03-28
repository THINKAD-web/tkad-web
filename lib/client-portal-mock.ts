export type ProjectStatus = "received" | "reviewing" | "in_progress" | "completed";

export type CampaignMetrics = {
  /** 누적 노출 (실시간 시뮬레이션용 기준값) */
  impressions: number;
  /** 일간 증가분 (참고) */
  impressionsPerDay: number;
  /** CTR % */
  ctrPercent: number;
  ctrTrendKo: string;
  ctrTrendEn: string;
};

export type BudgetInfo = {
  totalMan: number;
  spentMan: number;
};

export type ScheduleAlert = {
  id: string;
  date: string;
  titleKo: string;
  titleEn: string;
  type: "kickoff" | "mid" | "creative" | "report" | "end";
};

export type Project = {
  id: string;
  title: string;
  summary: string;
  status: ProjectStatus;
  createdAt: string;
  updatedAt: string;
  /** 집행 종료 예정일 (일정 알림용) */
  endDate?: string;
  manager: {
    name: string;
    role: string;
    phone: string;
    email: string;
  };
  metrics?: CampaignMetrics;
  budget?: BudgetInfo;
  alerts?: ScheduleAlert[];
  /** 완료 캠페인 요약 지표 */
  historyMetrics?: {
    impressions: number;
    ctrPercent: number;
    budgetMan: number;
  };
};

export type Client = {
  id: string;
  company: string;
  contactName: string;
  email: string;
  phone: string;
  projects: Project[];
};

export const CLIENT_SESSION_EMAIL_KEY = "tkad-client-email";

export const mockClients: Client[] = [
  {
    id: "C-001",
    company: "삼성전자",
    contactName: "김영수",
    email: "client1@example.com",
    phone: "010-1234-5678",
    projects: [
      {
        id: "P-2026-001",
        title: "갤럭시 S 시리즈 런칭 OOH 캠페인",
        summary: "강남/코엑스 중심 디지털 사이니지 및 대형 빌보드 집행",
        status: "in_progress",
        createdAt: "2026-03-10",
        updatedAt: "2026-03-27",
        endDate: "2026-05-31",
        metrics: {
          impressions: 12_840_000,
          impressionsPerDay: 420_000,
          ctrPercent: 0.38,
          ctrTrendKo: "전주 대비 +0.06%p",
          ctrTrendEn: "+0.06%p vs last week",
        },
        budget: { totalMan: 48_000, spentMan: 27_200 },
        alerts: [
          {
            id: "a1",
            date: "2026-03-30",
            titleKo: "중간 성과 리포트 자동 발송",
            titleEn: "Mid-campaign performance report",
            type: "mid",
          },
          {
            id: "a2",
            date: "2026-04-05",
            titleKo: "크리에이티브 B안 교체 예정",
            titleEn: "Creative B variant swap scheduled",
            type: "creative",
          },
          {
            id: "a3",
            date: "2026-05-31",
            titleKo: "캠페인 종료 · 최종 리포트",
            titleEn: "Campaign end & final report",
            type: "end",
          },
        ],
        manager: {
          name: "이정민",
          role: "캠페인 디렉터",
          phone: "010-5555-1111",
          email: "jm.lee@sinkerd.com",
        },
      },
      {
        id: "P-2025-112",
        title: "연말 브랜드 인지도 캠페인",
        summary: "전국 주요 거점 옥외 매체 브랜딩 집행",
        status: "completed",
        createdAt: "2025-10-01",
        updatedAt: "2026-01-15",
        historyMetrics: {
          impressions: 89_200_000,
          ctrPercent: 0.42,
          budgetMan: 62_000,
        },
        manager: {
          name: "이정민",
          role: "캠페인 디렉터",
          phone: "010-5555-1111",
          email: "jm.lee@sinkerd.com",
        },
      },
    ],
  },
  {
    id: "C-002",
    company: "쿠팡",
    contactName: "서민지",
    email: "client2@example.com",
    phone: "010-9999-2222",
    projects: [
      {
        id: "P-2026-014",
        title: "로켓배송 인지도 강화 캠페인",
        summary: "전국 고속도로 및 물류센터 인근 빌보드 집행",
        status: "reviewing",
        createdAt: "2026-03-18",
        updatedAt: "2026-03-25",
        endDate: "2026-06-20",
        budget: { totalMan: 32_000, spentMan: 4_800 },
        alerts: [
          {
            id: "b1",
            date: "2026-04-01",
            titleKo: "미디어 플랜 확정 미팅",
            titleEn: "Media plan confirmation call",
            type: "kickoff",
          },
          {
            id: "b2",
            date: "2026-04-10",
            titleKo: "예상 집행 시작일",
            titleEn: "Tentative flight start",
            type: "kickoff",
          },
        ],
        manager: {
          name: "박성우",
          role: "미디어 플래너",
          phone: "010-7777-3333",
          email: "sw.park@sinkerd.com",
        },
      },
    ],
  },
];

export const statusMap: Record<
  ProjectStatus,
  { labelKo: string; labelEn: string; descriptionKo: string; descriptionEn: string; className: string }
> = {
  received: {
    labelKo: "접수",
    labelEn: "Received",
    descriptionKo: "문의가 정상적으로 접수되었습니다.",
    descriptionEn: "Your inquiry has been received.",
    className: "bg-slate-100 text-slate-700",
  },
  reviewing: {
    labelKo: "검토중",
    labelEn: "Reviewing",
    descriptionKo: "전략/미디어 플래너가 캠페인을 검토 중입니다.",
    descriptionEn: "Our planners are reviewing your campaign.",
    className: "bg-amber-100 text-amber-700",
  },
  in_progress: {
    labelKo: "진행중",
    labelEn: "Live",
    descriptionKo: "매체 집행 및 운영이 진행 중입니다.",
    descriptionEn: "Media is live and being optimized.",
    className: "bg-blue-100 text-blue-700",
  },
  completed: {
    labelKo: "완료",
    labelEn: "Completed",
    descriptionKo: "캠페인이 정상적으로 종료되었습니다.",
    descriptionEn: "Campaign has ended successfully.",
    className: "bg-emerald-100 text-emerald-700",
  },
};

export function findClientByEmail(email: string): Client | undefined {
  const e = email.trim().toLowerCase();
  return mockClients.find((c) => c.email.toLowerCase() === e);
}

export function getDefaultDemoClient(): Client {
  return mockClients[0];
}
