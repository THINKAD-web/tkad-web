import type { LucideIcon } from "lucide-react";
import { Plus } from "lucide-react";

/** 어드민 사이드바 priority — my-hub-nav-config 패턴과 동일 */
export type AdminNavPriority = 1 | 2 | 3;

export type AdminNavKey =
  | "dashboard"
  | "monitoring"
  | "launchMonitor"
  | "linkHealth"
  | "operatorManual"
  | "inquiries"
  | "inquiryAutoProposal"
  | "biddings"
  | "chatMonitor"
  | "chatbotLogs"
  | "pipeline"
  | "crmRecords"
  | "forecast"
  | "emailTemplates"
  | "crm"
  | "quotesList"
  | "contractsDashboard"
  | "contractsNew"
  | "quotesBooking"
  | "quotesNew"
  | "quoteTemplates"
  | "campaigns"
  | "campaignCalendar"
  | "community"
  | "mediaApplications"
  | "mediaLeads"
  | "mediaOwnerOps"
  | "mediaReviews"
  | "medias"
  | "verification"
  | "networks"
  | "mediaHub"
  | "users"
  | "points"
  | "analytics"
  | "funnel"
  | "searchStats"
  | "recommendations"
  | "apiUsage"
  | "aiUsage"
  | "trustMetrics"
  | "abTest"
  | "trendReports"
  | "academyNew"
  | "content"
  | "contentSeed"
  | "aiContent"
  | "planSnapshots"
  | "memberEntitlements";

export type AdminNavExtraKey = "mediasQuickAdd";

export type AdminNavGroupId =
  | "dashboard"
  | "media"
  | "quotes"
  | "customers"
  | "content"
  | "marketing"
  | "settings";

/** Top3 — 사이드바 상단 큰 버튼 */
export const ADMIN_NAV_PRIORITY_1: AdminNavKey[] = [
  "medias",
  "quotesList",
  "contractsDashboard",
];

/** 자주 쓰는 보조 — Top3 아래 컴팩트 링크 */
export const ADMIN_NAV_PRIORITY_2: AdminNavKey[] = [
  "quotesBooking",
  "quotesNew",
  "contractsNew",
];

export type AdminNavExtraDef = {
  key: AdminNavExtraKey;
  href: string;
  icon: LucideIcon;
};

export const ADMIN_NAV_PRIORITY_2_EXTRAS: AdminNavExtraDef[] = [
  { key: "mediasQuickAdd", href: "/admin/medias/quick-add", icon: Plus },
];

export function adminNavPriority(key: AdminNavKey): AdminNavPriority {
  if (ADMIN_NAV_PRIORITY_1.includes(key)) return 1;
  if (ADMIN_NAV_PRIORITY_2.includes(key)) return 2;
  return 3;
}

export const adminNavGroupDefs: {
  id: AdminNavGroupId;
  labelKey:
    | "groupDashboard"
    | "groupMedia"
    | "groupQuotes"
    | "groupCustomers"
    | "groupContent"
    | "groupMarketing"
    | "groupSettings";
  itemKeys: AdminNavKey[];
}[] = [
  {
    id: "dashboard",
    labelKey: "groupDashboard",
    itemKeys: [
      "dashboard",
      "monitoring",
      "launchMonitor",
      "linkHealth",
      "analytics",
      "funnel",
    ],
  },
  {
    id: "media",
    labelKey: "groupMedia",
    itemKeys: [
      "medias",
      "mediaApplications",
      "mediaLeads",
      "mediaOwnerOps",
      "mediaReviews",
      "verification",
      "networks",
      "mediaHub",
      "campaignCalendar",
    ],
  },
  {
    id: "quotes",
    labelKey: "groupQuotes",
    itemKeys: [
      "quotesList",
      "contractsDashboard",
      "contractsNew",
      "quotesBooking",
      "quotesNew",
      "quoteTemplates",
      "biddings",
      "campaigns",
      "forecast",
    ],
  },
  {
    id: "customers",
    labelKey: "groupCustomers",
    itemKeys: [
      "inquiries",
      "inquiryAutoProposal",
      "chatMonitor",
      "chatbotLogs",
      "users",
      "pipeline",
      "crmRecords",
      "planSnapshots",
    ],
  },
  {
    id: "content",
    labelKey: "groupContent",
    itemKeys: [
      "trendReports",
      "academyNew",
      "content",
      "contentSeed",
      "aiContent",
      "community",
    ],
  },
  {
    id: "marketing",
    labelKey: "groupMarketing",
    itemKeys: [
      "points",
      "emailTemplates",
      "recommendations",
      "abTest",
      "searchStats",
    ],
  },
  {
    id: "settings",
    labelKey: "groupSettings",
    itemKeys: [
      "operatorManual",
      "memberEntitlements",
      "apiUsage",
      "aiUsage",
      "trustMetrics",
    ],
  },
];

/** priority 3 그룹 — Top3·P2 항목 제외 */
export function filterAdminNavGroupItems(keys: AdminNavKey[]): AdminNavKey[] {
  return keys.filter((key) => adminNavPriority(key) === 3);
}
