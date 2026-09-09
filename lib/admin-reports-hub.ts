/**
 * Admin 보고서 허브 — 3트랙 진입 + Digital 리포트 빌더 외부 링크.
 * 실제 PDF/발송/트렌드 생성은 기존 API를 호출한다 (병렬 구현 금지).
 * Digital 빌더는 dmpilot 복제가 아니라 운영 URL로만 연결한다.
 */

export const ADMIN_REPORTS_HUB_PATH = "/admin/reports";
export const ADMIN_TREND_REPORT_PATH = "/admin/reports/new";
export const ADMIN_CAMPAIGNS_PATH = "/admin/campaigns";

/** dmpilot 운영 리포트 빌더 — 허브 4번째 카드 (복제 금지, 새 탭). */
export const DIGITAL_CAMPAIGN_REPORT_BUILDER_URL =
  "https://digital.tkad.co.kr/admin/campaign-report";

export const DIGITAL_CAMPAIGN_REPORT_BUILDER_COPY = {
  ko: "캠페인 리포트 빌더 (Digital)",
  en: "Campaign report builder (Digital)",
  descKo: "날짜·매체 자유 선택, PDF/PPTX, A/B 비교",
  descEn: "Pick dates and media freely — PDF, PPTX, and A/B compare.",
  badgeKo: "Digital 어드민에서 열림",
  badgeEn: "Opens in Digital admin",
} as const;

export const ADMIN_REPORT_HUB_TYPES = [
  "proposal",
  "campaign",
  "trend",
] as const;

export type AdminReportHubType = (typeof ADMIN_REPORT_HUB_TYPES)[number];

export type AdminReportHubStep = 1 | 2 | 3;

const TYPE_SET = new Set<string>(ADMIN_REPORT_HUB_TYPES);

export function parseAdminReportHubType(
  raw: string | null | undefined,
): AdminReportHubType | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase();
  if (v === "performance") return "campaign";
  return TYPE_SET.has(v) ? (v as AdminReportHubType) : null;
}

export function parseAdminReportHubStep(
  raw: string | null | undefined,
): AdminReportHubStep {
  const n = Number(raw);
  if (n === 2 || n === 3) return n;
  return 1;
}

export function buildAdminReportsHubPath(opts?: {
  type?: AdminReportHubType | null;
  step?: AdminReportHubStep;
  campaignId?: string | null;
}): string {
  const q = new URLSearchParams();
  if (opts?.type) q.set("type", opts.type);
  if (opts?.step && opts.step !== 1) q.set("step", String(opts.step));
  if (opts?.campaignId) q.set("campaignId", opts.campaignId);
  const qs = q.toString();
  return qs ? `${ADMIN_REPORTS_HUB_PATH}?${qs}` : ADMIN_REPORTS_HUB_PATH;
}

/** Dashboard / sidebar deep-links — type 있으면 Step 2로 바로 착지 */
export function buildAdminReportsHubLandingPath(
  type: AdminReportHubType,
  campaignId?: string | null,
): string {
  return buildAdminReportsHubPath({
    type,
    step: 2,
    campaignId: campaignId ?? null,
  });
}

export function buildAdminCampaignsReportPath(campaignId: string): string {
  const q = new URLSearchParams({ selected: campaignId, report: "1" });
  return `${ADMIN_CAMPAIGNS_PATH}?${q.toString()}`;
}

export function parseAdminCampaignsReportQuery(search: {
  get(name: string): string | null;
}): { selectedId: string | null; openPreview: boolean } {
  const selectedId = search.get("selected")?.trim() || null;
  const report = search.get("report")?.trim();
  return {
    selectedId,
    openPreview: report === "1" || report === "preview",
  };
}

/** 대시보드 → 액션 패널까지 클릭 수 (허브 도입 전/후) */
export const ADMIN_REPORT_CLICK_PATHS = {
  before: {
    campaignFromDashboard: 4,
    trendFromDashboard: 1,
    proposalFromDashboard: 5,
  },
  after: {
    campaignFromDashboard: 1,
    trendFromDashboard: 1,
    proposalFromDashboard: 1,
    hubFromSidebar: 1,
  },
} as const;

export const ADMIN_REPORT_HUB_TYPE_COPY: Record<
  AdminReportHubType,
  { ko: string; en: string; descKo: string; descEn: string }
> = {
  proposal: {
    ko: "매체 제안서",
    en: "Media proposal",
    descKo: "문의 붙여넣기 또는 캠페인 메모로 믹스를 맞춥니다.",
    descEn: "Paste an inquiry or use campaign notes to match a mix.",
  },
  campaign: {
    ko: "캠페인 성과 보고서",
    en: "Campaign performance",
    descKo: "CRM 캠페인을 고르고 기존 미리보기·PDF·발송을 그대로 씁니다.",
    descEn: "Pick a CRM campaign and reuse preview / PDF / send.",
  },
  trend: {
    ko: "시장 트렌드",
    en: "Market trend",
    descKo: "기존 트렌드 리포트 작성(Tavily)과 같은 화면입니다.",
    descEn: "Same Tavily trend wizard as /admin/reports/new.",
  },
};
