import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Bell,
  BookOpen,
  CreditCard,
  FileText,
  Heart,
  History,
  LayoutDashboard,
  Lightbulb,
  LineChart,
  Megaphone,
  Plus,
  Scale,
  Search,
  Sparkles,
  Trophy,
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
      titleKo: "매체",
      titleEn: "Media",
      sections: [
        {
          id: "main",
          items: [
            {
              id: "all",
              labelKo: "전체 매체",
              labelEn: "All media",
              href: "/media",
              icon: Search,
              activeMatch: (p) => p === "/media" || (p.startsWith("/media") && !p.startsWith("/media/map") && !p.startsWith("/media/favorites") && !p.startsWith("/media/packages")),
            },
            {
              id: "favorites",
              labelKo: "즐겨찾기",
              labelEn: "Favorites",
              href: "/media/favorites",
              icon: Heart,
              activeMatch: exactOrPrefix("/media/favorites"),
            },
            {
              id: "compare",
              labelKo: "비교",
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
              icon: History,
              activeMatch: () => false,
            },
          ],
        },
        {
          id: "filters",
          titleKo: "필터",
          titleEn: "Filters",
          items: [
            {
              id: "filter-region",
              labelKo: "지역 · 강남",
              labelEn: "Region · Gangnam",
              href: "/media?region=강남",
              icon: Search,
            },
            {
              id: "filter-map",
              labelKo: "지도 보기",
              labelEn: "Map view",
              href: "/media/map",
              icon: Search,
              activeMatch: exactOrPrefix("/media/map"),
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
              id: "new",
              labelKo: "새 플랜",
              labelEn: "New plan",
              href: "/planner",
              icon: Plus,
              activeMatch: (p) => p === "/planner" || p.startsWith("/planner?"),
            },
            {
              id: "saved",
              labelKo: "저장한 플랜",
              labelEn: "Saved plans",
              href: "/my",
              icon: FileText,
              activeMatch: () => false,
            },
            {
              id: "integrated",
              labelKo: "통합 플래너",
              labelEn: "Integrated planner",
              href: "/planner/integrated",
              icon: Sparkles,
              activeMatch: exactOrPrefix("/planner/integrated"),
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
              id: "campaigns",
              labelKo: "내 캠페인",
              labelEn: "My campaigns",
              href: "/dashboard",
              icon: Megaphone,
              activeMatch: exactOrPrefix("/dashboard"),
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
              id: "all-content",
              labelKo: "전체 보기",
              labelEn: "All content",
              href: "/report",
              icon: BookOpen,
              activeMatch: () => false,
            },
          ],
        },
        {
          id: "categories",
          titleKo: "카테고리",
          titleEn: "Categories",
          items: [
            {
              id: "trends",
              labelKo: "OOH 트렌드",
              labelEn: "OOH trends",
              href: "/report",
              icon: LineChart,
              activeMatch: exactOrPrefix("/report"),
            },
            {
              id: "guides",
              labelKo: "업종별 가이드",
              labelEn: "Industry guides",
              href: "/guides",
              icon: BookOpen,
              activeMatch: exactOrPrefix("/guides"),
            },
            {
              id: "cases",
              labelKo: "성공 사례",
              labelEn: "Success cases",
              href: "/cases",
              icon: Trophy,
              activeMatch: exactOrPrefix("/cases"),
            },
            {
              id: "competitive",
              labelKo: "매체 분석",
              labelEn: "Competitive intel",
              href: "/insights/competitive",
              icon: BarChart3,
              activeMatch: exactOrPrefix("/insights"),
            },
            {
              id: "academy",
              labelKo: "아카데미",
              labelEn: "Academy",
              href: "/academy",
              icon: Lightbulb,
              activeMatch: exactOrPrefix("/academy"),
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
            icon: Lightbulb,
          },
          {
            id: "packages",
            labelKo: "패키지",
            labelEn: "Packages",
            href: "/packages",
            icon: Sparkles,
          },
          {
            id: "contact",
            labelKo: "무료 견적",
            labelEn: "Free quote",
            href: "/contact",
            icon: FileText,
          },
        ],
      },
    ],
  };
}
