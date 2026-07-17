import {
  CampaignStatus,
  MediaApplicationStatus,
  MediaReviewStatus,
  OoHQuoteStatus,
} from "@prisma/client";
import {
  parseInquiryAdminStatusCode,
  parseInquiryTypeCode,
  parseStoredContactInquiryMessage,
  type InquiryAdminStatusCode,
} from "@/lib/contact-inquiry-labels";
import { getPrisma, isDatabaseConfigured } from "@/lib/prisma";

export type DashboardKpi = {
  label: string;
  value: string;
  delta?: string;
  deltaUp?: boolean;
  href: string;
  alert?: boolean;
};

export type DashboardFeedItem = {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  href: string;
  badge?: string;
};

export type DashboardAlert = {
  id: string;
  label: string;
  count: number;
  href: string;
};

export type WeeklyInquiryPoint = {
  key: string;
  label: string;
  count: number;
};

export type InquiryTypeSlice = {
  type: string;
  label: string;
  count: number;
};

export type AdminOpsQueue = {
  unreadInquiries: number;
  bookingAwaitingConfirm: number;
};

export type AdminDashboardData = {
  configured: boolean;
  kpis: DashboardKpi[];
  alerts: DashboardAlert[];
  opsQueue: AdminOpsQueue;
  recentInquiries: DashboardFeedItem[];
  recentSignups: DashboardFeedItem[];
  recentApplications: DashboardFeedItem[];
  weeklyInquiries: WeeklyInquiryPoint[];
  inquiriesByType: InquiryTypeSlice[];
};

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0);
}

function monthDeltaPct(current: number, previous: number): { text: string; up: boolean } {
  if (previous === 0) {
    return current > 0 ? { text: "신규", up: true } : { text: "—", up: true };
  }
  const pct = Math.round(((current - previous) / previous) * 1000) / 10;
  return {
    text: `${pct >= 0 ? "+" : ""}${pct}%`,
    up: pct >= 0,
  };
}

function formatFeedTime(d: Date): string {
  return d.toLocaleString("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Seoul",
  });
}

function inquiryStatusFromRow(message: string): InquiryAdminStatusCode {
  const parsed = parseStoredContactInquiryMessage(message);
  return parseInquiryAdminStatusCode(parsed.adminStatusLabel) ?? "new";
}

function isInquiryTrashed(message: string): boolean {
  return parseStoredContactInquiryMessage(message).adminTrashed;
}

const TYPE_LABELS: Record<string, string> = {
  media: "매체 문의",
  campaign: "캠페인 상담",
  quote: "견적 요청",
  other: "기타",
  unknown: "미분류",
};

export async function loadAdminDashboardData(
  locale: string,
): Promise<AdminDashboardData> {
  const prefix = `/${locale}`;

  if (!isDatabaseConfigured()) {
    return {
      configured: false,
      kpis: [],
      alerts: [],
      opsQueue: { unreadInquiries: 0, bookingAwaitingConfirm: 0 },
      recentInquiries: [],
      recentSignups: [],
      recentApplications: [],
      weeklyInquiries: [],
      inquiriesByType: [],
    };
  }

  const db = getPrisma();
  const now = new Date();
  const thisMonthStart = startOfMonth(now);
  const lastMonthStart = startOfMonth(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );
  const lastMonthEnd = new Date(thisMonthStart.getTime() - 1);
  const staleCutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);

  const fourWeeksAgo = new Date(now.getTime() - 28 * 86400000);

  const weekBoundaries = [0, 1, 2, 3].map((weeksAgo) => ({
    gte: new Date(now.getTime() - (weeksAgo + 1) * 7 * 86400000),
    lt: new Date(now.getTime() - weeksAgo * 7 * 86400000),
  }));

  const [
    inquiriesThisMonth,
    inquiriesLastMonth,
    signupsThisMonth,
    signupsLastMonth,
    activeCampaigns,
    pendingApplications,
    pendingReviews,
    totalMedia,
    recentInquiryRows,
    recentUsers,
    recentApps,
    inquiries60d,
    week0Count,
    week1Count,
    week2Count,
    week3Count,
    bookingAwaitingConfirm,
  ] = await Promise.all([
    db.contactInquiry.count({
      where: { createdAt: { gte: thisMonthStart } },
    }),
    db.contactInquiry.count({
      where: {
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
      },
    }),
    db.user.count({
      where: { createdAt: { gte: thisMonthStart }, deletedAt: null },
    }),
    db.user.count({
      where: {
        createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        deletedAt: null,
      },
    }),
    db.campaign.count({
      where: {
        status: {
          in: [
            CampaignStatus.contract,
            CampaignStatus.production,
            CampaignStatus.airing,
          ],
        },
      },
    }),
    db.mediaApplication.count({
      where: {
        status: { in: [MediaApplicationStatus.PENDING, MediaApplicationStatus.REVIEWING] },
      },
    }),
    db.mediaReview.count({
      where: { status: MediaReviewStatus.PENDING },
    }),
    db.media.count({ where: { isActive: true } }),
    db.contactInquiry.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        company: true,
        name: true,
        inquiryType: true,
        message: true,
        createdAt: true,
      },
    }),
    db.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: { id: true, name: true, email: true, company: true, createdAt: true },
    }),
    db.mediaApplication.findMany({
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        companyName: true,
        mediaName: true,
        mediaType: true,
        status: true,
        createdAt: true,
      },
    }),
    db.contactInquiry.findMany({
      where: { createdAt: { gte: fourWeeksAgo } },
      select: { message: true, createdAt: true, inquiryType: true },
      take: 3000,
    }),
    db.contactInquiry.count({
      where: { createdAt: { gte: weekBoundaries[3]!.gte, lt: weekBoundaries[3]!.lt } },
    }),
    db.contactInquiry.count({
      where: { createdAt: { gte: weekBoundaries[2]!.gte, lt: weekBoundaries[2]!.lt } },
    }),
    db.contactInquiry.count({
      where: { createdAt: { gte: weekBoundaries[1]!.gte, lt: weekBoundaries[1]!.lt } },
    }),
    db.contactInquiry.count({
      where: { createdAt: { gte: weekBoundaries[0]!.gte, lt: weekBoundaries[0]!.lt } },
    }),
    db.ooHQuote.count({
      where: {
        status: {
          in: [OoHQuoteStatus.booking_requested, OoHQuoteStatus.booking_pending],
        },
      },
    }),
  ]);

  let unreadInquiries = 0;
  let staleInquiries48h = 0;
  const typeCounts = new Map<string, number>();

  for (const row of inquiries60d) {
    if (isInquiryTrashed(row.message)) continue;
    const status = inquiryStatusFromRow(row.message);
    if (status === "new") unreadInquiries += 1;
    if (
      status !== "done" &&
      row.createdAt.getTime() < staleCutoff.getTime()
    ) {
      staleInquiries48h += 1;
    }
    const typeKey =
      parseInquiryTypeCode(row.inquiryType ?? undefined) ?? "unknown";
    typeCounts.set(typeKey, (typeCounts.get(typeKey) ?? 0) + 1);
  }

  const inquiryDelta = monthDeltaPct(inquiriesThisMonth, inquiriesLastMonth);
  const signupDelta = monthDeltaPct(signupsThisMonth, signupsLastMonth);

  const kpis: DashboardKpi[] = [
    {
      label: "이번 달 신규 문의",
      value: `${inquiriesThisMonth.toLocaleString("ko-KR")}건`,
      delta: `vs 지난달 ${inquiryDelta.text}`,
      deltaUp: inquiryDelta.up,
      href: `${prefix}/admin/inquiries`,
    },
    {
      label: "이번 달 신규 가입",
      value: `${signupsThisMonth.toLocaleString("ko-KR")}명`,
      delta: `vs 지난달 ${signupDelta.text}`,
      deltaUp: signupDelta.up,
      href: `${prefix}/admin/users`,
    },
    {
      label: "진행 중 캠페인",
      value: `${activeCampaigns.toLocaleString("ko-KR")}건`,
      href: `${prefix}/admin/campaigns`,
    },
    {
      label: "매체 등록 신청 대기",
      value: `${pendingApplications.toLocaleString("ko-KR")}건`,
      href: `${prefix}/admin/applications`,
      alert: pendingApplications > 0,
    },
    {
      label: "미처리 문의",
      value: `${unreadInquiries.toLocaleString("ko-KR")}건`,
      href: `${prefix}/admin/inquiries?status=new`,
      alert: unreadInquiries > 0,
    },
    {
      label: "총 등록 매체",
      value: `${totalMedia.toLocaleString("ko-KR")}개`,
      href: `${prefix}/admin/medias`,
    },
  ];

  const alerts: DashboardAlert[] = [
    ...(staleInquiries48h > 0
      ? [
          {
            id: "stale-inquiries",
            label: "48시간 초과 미답변 문의",
            count: staleInquiries48h,
            href: `${prefix}/admin/inquiries?status=new`,
          },
        ]
      : []),
    ...(pendingApplications > 0
      ? [
          {
            id: "pending-apps",
            label: "심사 대기 매체 신청",
            count: pendingApplications,
            href: `${prefix}/admin/applications`,
          },
        ]
      : []),
    ...(pendingReviews > 0
      ? [
          {
            id: "pending-reviews",
            label: "승인 대기 리뷰",
            count: pendingReviews,
            href: `${prefix}/admin/reviews`,
          },
        ]
      : []),
  ];

  const recentInquiries: DashboardFeedItem[] = recentInquiryRows.map((i) => {
    const typeKey = parseInquiryTypeCode(i.inquiryType ?? undefined) ?? "unknown";
    return {
      id: i.id,
      title: i.company || i.name,
      subtitle: `${TYPE_LABELS[typeKey] ?? "문의"} · ${i.name}`,
      time: formatFeedTime(i.createdAt),
      href: `${prefix}/admin/inquiries?open=${encodeURIComponent(i.id)}`,
      badge: TYPE_LABELS[typeKey],
    };
  });

  const recentSignups: DashboardFeedItem[] = recentUsers.map((u) => ({
    id: u.id,
    title: u.name,
    subtitle: u.company ? `${u.company} · ${u.email}` : u.email,
    time: formatFeedTime(u.createdAt),
    href: `${prefix}/admin/users`,
  }));

  const recentApplications: DashboardFeedItem[] = recentApps.map((a) => ({
    id: a.id,
    title: a.mediaName,
    subtitle: `${a.companyName} · ${a.mediaType}`,
    time: formatFeedTime(a.createdAt),
    href: `${prefix}/admin/applications`,
    badge: a.status,
  }));

  const weekCounts = [week3Count, week2Count, week1Count, week0Count];
  const weekLabels = ["3주 전", "2주 전", "1주 전", "이번 주"];
  const weeklyInquiries: WeeklyInquiryPoint[] = weekCounts.map((count, i) => ({
    key: `w${i}`,
    label: weekLabels[i] ?? `W${i}`,
    count,
  }));

  const inquiriesByType: InquiryTypeSlice[] = [...typeCounts.entries()]
    .map(([type, count]) => ({
      type,
      label: TYPE_LABELS[type] ?? type,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    configured: true,
    kpis,
    alerts,
    opsQueue: {
      unreadInquiries,
      bookingAwaitingConfirm,
    },
    recentInquiries,
    recentSignups,
    recentApplications,
    weeklyInquiries,
    inquiriesByType,
  };
}
