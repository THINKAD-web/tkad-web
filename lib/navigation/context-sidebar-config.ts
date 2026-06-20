import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  CreditCard,
  Eye,
  FileText,
  LayoutDashboard,
  LineChart,
  Package,
  Scale,
  Search,
  Sparkles,
} from "lucide-react";

export type ContextSidebarItem = {
  id: string;
  labelKo: string;
  labelEn: string;
  href: string;
  icon?: LucideIcon;
  badge?: number | string;
  activeMatch?: (path: string) => boolean;
};

export type ContextSidebarSection = {
  id: string;
  titleKo?: string;
  titleEn?: string;
  items: ContextSidebarItem[];
};

export type ContextSidebarConfig = {
  contextId: string;
  titleKo: string;
  titleEn: string;
  sections: ContextSidebarSection[];
};

function exactOrPrefix(href: string) {
  return (path: string) => path === href || path.startsWith(`${href}/`);
}

export function resolveContextSidebar(pathname: string): ContextSidebarConfig {
  const path = pathname.replace(/^\/(ko|en)/, "") || "/";

  if (path.startsWith("/media") || path.startsWith("/recommend") || path.startsWith("/compare")) {
    return {
      contextId: "media",
      titleKo: "매체 도구",
      titleEn: "Media tools",
      sections: [
        {
          id: "main",
          items: [
            {
              id: "compare",
              labelKo: "비교함",
              labelEn: "Compare",
              href: "/compare",
              icon: Scale,
              activeMatch: exactOrPrefix("/compare"),
            },
            {
              id: "recent",
              labelKo: "최근 본 매체",
              labelEn: "Recently viewed",
              href: "/media",
              icon: Eye,
              activeMatch: () => false,
            },
          ],
        },
      ],
    };
  }

  if (path.startsWith("/planner")) {
    return {
      contextId: "planner",
      titleKo: "플래너",
      titleEn: "Planner",
      sections: [
        {
          id: "main",
          items: [
            {
              id: "saved",
              labelKo: "저장한 플랜",
              labelEn: "Saved plans",
              href: "/my",
              icon: FileText,
              activeMatch: () => false,
            },
          ],
        },
      ],
    };
  }

  if (
    path.startsWith("/my") ||
    path.startsWith("/dashboard") ||
    path.startsWith("/points")
  ) {
    return {
      contextId: "my",
      titleKo: "마이페이지",
      titleEn: "My page",
      sections: [
        {
          id: "main",
          items: [
            {
              id: "dashboard",
              labelKo: "대시보드",
              labelEn: "Dashboard",
              href: "/my",
              icon: LayoutDashboard,
              activeMatch: (p) => p === "/my",
            },
            {
              id: "quotes",
              labelKo: "견적 내역",
              labelEn: "Quotes",
              href: "/my/booking-requests",
              icon: FileText,
              activeMatch: exactOrPrefix("/my/booking-requests"),
            },
            {
              id: "points",
              labelKo: "포인트",
              labelEn: "Points",
              href: "/points",
              icon: Sparkles,
              activeMatch: exactOrPrefix("/points"),
            },
            {
              id: "billing",
              labelKo: "결제 정보",
              labelEn: "Billing",
              href: "/my/settings",
              icon: CreditCard,
              activeMatch: (p) => p.startsWith("/my/settings"),
            },
            {
              id: "notifications",
              labelKo: "알림 설정",
              labelEn: "Notifications",
              href: "/my/notifications",
              icon: Bell,
              activeMatch: exactOrPrefix("/my/notifications"),
            },
          ],
        },
      ],
    };
  }

  if (
    path.startsWith("/report") ||
    path.startsWith("/cases") ||
    path.startsWith("/academy") ||
    path.startsWith("/guides") ||
    path.startsWith("/insights")
  ) {
    return {
      contextId: "content",
      titleKo: "콘텐츠",
      titleEn: "Content",
      sections: [
        {
          id: "main",
          items: [
            {
              id: "competitive",
              labelKo: "매체 분석",
              labelEn: "Competitive intel",
              href: "/insights/competitive",
              icon: LineChart,
              activeMatch: exactOrPrefix("/insights"),
            },
          ],
        },
      ],
    };
  }

  return {
    contextId: "home",
    titleKo: "시작하기",
    titleEn: "Get started",
    sections: [
      {
        id: "quick",
        items: [
          {
            id: "media",
            labelKo: "매체 탐색",
            labelEn: "Explore media",
            href: "/media",
            icon: Search,
          },
          {
            id: "planner",
            labelKo: "플래너 시작",
            labelEn: "Start planner",
            href: "/planner",
            icon: BarChart3,
          },
          {
            id: "packages",
            labelKo: "패키지",
            labelEn: "Packages",
            href: "/media/packages",
            icon: Package,
          },
          {
            id: "contact",
            labelKo: "문의하기",
            labelEn: "Contact us",
            href: "/contact",
            icon: FileText,
          },
        ],
      },
    ],
  };
}
