import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  CreditCard,
  FileText,
  LayoutDashboard,
  LayoutList,
  LineChart,
  Package,
  Plus,
  Scale,
  Search,
  Sparkles,
} from "lucide-react";
import { PLAN_NAV_LABELS } from "@/lib/navigation/logged-in-nav-labels";

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

const planWorkItems: ContextSidebarItem[] = [
  {
    id: "plan-cart",
    labelKo: PLAN_NAV_LABELS.cart.ko,
    labelEn: PLAN_NAV_LABELS.cart.en,
    href: "/my/plan",
    icon: LayoutList,
    activeMatch: (p) => p === "/my/plan" || p.startsWith("/my/plan/report"),
  },
  {
    id: "plan-saved",
    labelKo: PLAN_NAV_LABELS.saved.ko,
    labelEn: PLAN_NAV_LABELS.saved.en,
    href: "/my/plan/saved",
    icon: FileText,
    activeMatch: exactOrPrefix("/my/plan/saved"),
  },
  {
    id: "planner-results",
    labelKo: PLAN_NAV_LABELS.plannerResults.ko,
    labelEn: PLAN_NAV_LABELS.plannerResults.en,
    href: "/my?tab=planner",
    icon: Sparkles,
    activeMatch: () => false,
  },
  {
    id: "new-plan",
    labelKo: PLAN_NAV_LABELS.newPlan.ko,
    labelEn: PLAN_NAV_LABELS.newPlan.en,
    href: "/planner",
    icon: Plus,
    activeMatch: exactOrPrefix("/planner"),
  },
];

export function resolveContextSidebar(pathname: string): ContextSidebarConfig {
  const path = pathname.replace(/^\/(ko|en)/, "") || "/";

  if (path.startsWith("/planner") || path.startsWith("/my/plan")) {
    return {
      contextId: "planner",
      titleKo: "플랜 작업",
      titleEn: "Plan workspace",
      sections: [{ id: "main", items: planWorkItems }],
    };
  }

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
            labelKo: PLAN_NAV_LABELS.newPlan.ko,
            labelEn: PLAN_NAV_LABELS.newPlan.en,
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
