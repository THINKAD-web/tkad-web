import type { LucideIcon } from "lucide-react";
import {
  Bell,
  Clock,
  FileText,
  Heart,
  KeyRound,
  LayoutList,
  Megaphone,
  Plus,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";

/** `/my?tab=` 인라인 패널 — 외부 라우트와 구분 */
export type MyHubPanelTab = "campaigns" | "favorites" | "planner" | "recent";

export type MyHubNavItem = {
  id: string;
  labelKo: string;
  labelEn: string;
  descriptionKo?: string;
  descriptionEn?: string;
  href: string;
  icon: LucideIcon;
  /** 1=자주, 2=보통, 3=가끔(시각적 축소) */
  priority: 1 | 2 | 3;
  panelTab?: MyHubPanelTab;
};

export type MyHubNavGroup = {
  id: string;
  titleKo: string;
  titleEn: string;
  items: MyHubNavItem[];
};

function stripLocale(path: string): string {
  return path.replace(/^\/(ko|en)/, "") || "/";
}

export function isMyHubPath(pathname: string): boolean {
  const p = stripLocale(pathname);
  return p === "/my" || p.startsWith("/my/");
}

export function matchMyHubNavItem(
  item: MyHubNavItem,
  pathname: string,
  tab: string | null,
): boolean {
  const p = stripLocale(pathname);

  if (item.panelTab) {
    if (p !== "/my") return false;
    const effective = tab ?? "campaigns";
    return effective === item.panelTab;
  }

  const hrefPath = item.href.split("?")[0] ?? item.href;
  if (hrefPath === "/my") {
    return p === "/my" && (tab === null || tab === "campaigns");
  }
  return p === hrefPath || p.startsWith(`${hrefPath}/`);
}

export const MY_HUB_NAV_GROUPS: MyHubNavGroup[] = [
  {
    id: "activity",
    titleKo: "내 활동",
    titleEn: "Your activity",
    items: [
      {
        id: "plan-cart",
        labelKo: "담은 매체",
        labelEn: "Selected media",
        descriptionKo: "지금 담은 매체·수량·견적",
        descriptionEn: "Current cart, quantities & quote",
        href: "/my/plan",
        icon: LayoutList,
        priority: 1,
      },
      {
        id: "quotes",
        labelKo: "견적·문의 내역",
        labelEn: "Quotes & inquiries",
        descriptionKo: "신청·진행 상태 확인",
        descriptionEn: "Track requests & status",
        href: "/my/booking-requests",
        icon: FileText,
        priority: 1,
      },
      {
        id: "campaigns",
        labelKo: "내 캠페인",
        labelEn: "My campaigns",
        descriptionKo: "집행 중·완료 캠페인",
        descriptionEn: "Active & completed campaigns",
        href: "/my",
        icon: Megaphone,
        priority: 1,
        panelTab: "campaigns",
      },
    ],
  },
  {
    id: "plan-design",
    titleKo: "플랜·설계",
    titleEn: "Plan & design",
    items: [
      {
        id: "planner-results",
        labelKo: "플래너·제안서",
        labelEn: "Planner & proposals",
        descriptionKo: "위저드 저장·AI 제안서",
        descriptionEn: "Wizard saves & AI proposals",
        href: "/my?tab=planner",
        icon: Sparkles,
        priority: 1,
        panelTab: "planner",
      },
      {
        id: "plan-snapshots",
        labelKo: "저장 스냅샷",
        labelEn: "Plan snapshots",
        descriptionKo: "담은 매체 목록 백업",
        descriptionEn: "Backed-up cart snapshots",
        href: "/my/plan/saved",
        icon: FileText,
        priority: 2,
      },
      {
        id: "new-plan",
        labelKo: "새 플랜 만들기",
        labelEn: "New plan",
        href: "/planner",
        icon: Plus,
        priority: 2,
      },
    ],
  },
  {
    id: "save-explore",
    titleKo: "저장·탐색",
    titleEn: "Saved & browse",
    items: [
      {
        id: "favorites",
        labelKo: "관심매체",
        labelEn: "Favorite media",
        href: "/my?tab=favorites",
        icon: Heart,
        priority: 2,
        panelTab: "favorites",
      },
      {
        id: "recent",
        labelKo: "최근 본 매체",
        labelEn: "Recently viewed",
        href: "/my?tab=recent",
        icon: Clock,
        priority: 3,
        panelTab: "recent",
      },
    ],
  },
  {
    id: "account",
    titleKo: "계정",
    titleEn: "Account",
    items: [
      {
        id: "points",
        labelKo: "포인트",
        labelEn: "Points",
        href: "/points",
        icon: Sparkles,
        priority: 2,
      },
      {
        id: "settings",
        labelKo: "설정·결제",
        labelEn: "Settings & billing",
        href: "/my/settings",
        icon: Settings,
        priority: 2,
      },
      {
        id: "notifications",
        labelKo: "알림",
        labelEn: "Notifications",
        href: "/my/notifications",
        icon: Bell,
        priority: 3,
      },
      {
        id: "team",
        labelKo: "팀 관리",
        labelEn: "Team",
        href: "/my/team",
        icon: Users,
        priority: 3,
      },
      {
        id: "api-keys",
        labelKo: "API 키",
        labelEn: "API keys",
        href: "/my/api-keys",
        icon: KeyRound,
        priority: 3,
      },
    ],
  },
];

export function parseMyHubPanelTab(
  value: string | null,
): MyHubPanelTab | null {
  if (
    value === "campaigns" ||
    value === "favorites" ||
    value === "planner" ||
    value === "recent"
  ) {
    return value;
  }
  return null;
}

/** 레거시 ?tab= 리다이렉트 대상 */
export function legacyMyHubTabRedirect(
  tab: string | null,
): string | null {
  if (tab === "points") return "/points";
  if (tab === "team") return "/my/team";
  return null;
}
