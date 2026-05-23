import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  BookOpen,
  Images,
  Lightbulb,
  LineChart,
  ListVideo,
  MapPin,
  Package,
  Search,
  Sparkles,
  Trophy,
  Wand2,
} from "lucide-react";

export type TopNavLink = {
  id: string;
  labelKo: string;
  labelEn: string;
  href: string;
  descKo?: string;
  descEn?: string;
  icon?: LucideIcon;
};

export type TopNavItemDef = {
  id: "media" | "planner" | "packages" | "more";
  labelKo: string;
  labelEn: string;
  href?: string;
  /** Hover mega menu (매체) */
  megaMenu?: TopNavLink[];
};

export const TOP_NAV_ITEMS: TopNavItemDef[] = [
  {
    id: "media",
    labelKo: "매체",
    labelEn: "Media",
    megaMenu: [
      {
        id: "media-search",
        labelKo: "매체 검색",
        labelEn: "Browse media",
        href: "/media",
        descKo: "전국 500+ 검증 매체",
        descEn: "500+ verified media",
        icon: Search,
      },
      {
        id: "map-search",
        labelKo: "지도에서 찾기",
        labelEn: "Map view",
        href: "/media/map",
        descKo: "위치 기반 탐색",
        descEn: "Location-based search",
        icon: MapPin,
      },
      {
        id: "ai-recommend",
        labelKo: "AI 매체 추천",
        labelEn: "AI recommend",
        href: "/recommend",
        descKo: "조건 자동 매칭",
        descEn: "Auto-match by goals",
        icon: Sparkles,
      },
    ],
  },
  {
    id: "planner",
    labelKo: "플래너",
    labelEn: "Planner",
    href: "/planner",
  },
  {
    id: "packages",
    labelKo: "패키지",
    labelEn: "Packages",
    href: "/packages",
  },
  {
    id: "more",
    labelKo: "더보기",
    labelEn: "More",
  },
];

export type MoreNavSection = {
  id: string;
  titleKo: string;
  titleEn: string;
  items: TopNavLink[];
};

export const MORE_NAV_SECTIONS: MoreNavSection[] = [
  {
    id: "content",
    titleKo: "콘텐츠",
    titleEn: "Content",
    items: [
      {
        id: "trend-report",
        labelKo: "트렌드 리포트",
        labelEn: "Trend reports",
        href: "/report",
        icon: LineChart,
      },
      {
        id: "success-cases",
        labelKo: "성공 사례",
        labelEn: "Success cases",
        href: "/cases",
        icon: Trophy,
      },
      {
        id: "academy",
        labelKo: "아카데미",
        labelEn: "Academy",
        href: "/academy",
        icon: BookOpen,
      },
      {
        id: "advertiser-guide",
        labelKo: "광고주 가이드",
        labelEn: "Advertiser guide",
        href: "/guides",
        icon: BookMarked,
      },
    ],
  },
  {
    id: "studio",
    titleKo: "스튜디오",
    titleEn: "Studio",
    items: [
      {
        id: "creative-library",
        labelKo: "소재 라이브러리",
        labelEn: "Creative library",
        href: "/creatives",
        icon: Images,
      },
      {
        id: "creative-studio",
        labelKo: "크리에이티브 스튜디오",
        labelEn: "Creative studio",
        href: "/creatives/upload",
        icon: Wand2,
      },
      {
        id: "dooh-playlists",
        labelKo: "DOOH 플레이리스트",
        labelEn: "DOOH playlists",
        href: "/creatives/playlists",
        icon: ListVideo,
      },
    ],
  },
];

export const COMMAND_QUICK_LINKS: TopNavLink[] = [
  {
    id: "cmd-media",
    labelKo: "매체 검색",
    labelEn: "Browse media",
    href: "/media",
    icon: Search,
  },
  {
    id: "cmd-planner",
    labelKo: "내 플래너",
    labelEn: "My planner",
    href: "/planner",
    icon: Lightbulb,
  },
  {
    id: "cmd-points",
    labelKo: "포인트 샵",
    labelEn: "Points shop",
    href: "/points",
    icon: Sparkles,
  },
  {
    id: "cmd-packages",
    labelKo: "패키지",
    labelEn: "Packages",
    href: "/packages",
    icon: Package,
  },
  {
    id: "cmd-contact",
    labelKo: "견적 요청",
    labelEn: "Request quote",
    href: "/contact",
    icon: Trophy,
  },
  {
    id: "cmd-new-plan",
    labelKo: "새 플랜 만들기",
    labelEn: "New planner plan",
    href: "/planner",
    icon: Lightbulb,
  },
];
