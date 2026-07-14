import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  ClipboardList,
  Compass,
  GraduationCap,
  Images,
  Lightbulb,
  LineChart,
  ListVideo,
  MapPin,
  Network,
  Package,
  Palette,
  Search,
  Sparkles,
  Target,
  Trophy,
  Wand2,
} from "lucide-react";

/** 메인 카테고리 ID — 4개 고정 */
export type PublicNavGroupId =
  | "discovery"
  | "planning"
  | "insights"
  | "studio";

export type PublicNavItemId =
  | "media-search"
  | "map-search"
  | "media-network"
  | "campaign-targets"
  | "media-planner"
  | "integrated-planner"
  | "package-proposal"
  | "ai-recommend"
  | "creative-library"
  | "dooh-playlists"
  | "creative-studio"
  | "trend-report"
  | "success-cases"
  | "academy-content"
  | "advertiser-guide";

export type PublicNavItemDef = {
  id: PublicNavItemId;
  href: string;
  icon: LucideIcon;
  /** BETA는 세부 메뉴에만 */
  beta?: boolean;
  /** 기획하기 등 — 대표 진입점 아래 보조 링크 */
  secondary?: boolean;
};

export type PublicNavGroupDef = {
  id: PublicNavGroupId;
  icon: LucideIcon;
  items: PublicNavItemDef[];
};

/**
 * OOH 플랫폼 공개 네비게이션 — 라벨은 i18n(`nav.groups.*`, `nav.items.*`).
 * href·계층·BETA 위치의 단일 소스.
 */
export const PUBLIC_NAV_GROUPS: PublicNavGroupDef[] = [
  {
    id: "discovery",
    icon: Compass,
    items: [
      { id: "media-search", href: "/media", icon: Search },
      { id: "map-search", href: "/media/map", icon: MapPin },
      { id: "media-network", href: "/media?features=network", icon: Network },
      { id: "campaign-targets", href: "/media/targets", icon: Target },
    ],
  },
  {
    id: "planning",
    icon: ClipboardList,
    items: [
      { id: "media-planner", href: "/planner", icon: Lightbulb },
      {
        id: "integrated-planner",
        href: "/planner/integrated",
        icon: Sparkles,
        secondary: true,
      },
      {
        id: "package-proposal",
        href: "/media/packages",
        icon: Package,
        secondary: true,
      },
      {
        id: "ai-recommend",
        href: "/recommend",
        icon: Wand2,
        secondary: true,
      },
    ],
  },
  {
    id: "insights",
    icon: LineChart,
    items: [
      { id: "trend-report", href: "/report", icon: LineChart, beta: true },
      { id: "success-cases", href: "/cases", icon: Trophy, beta: true },
      { id: "academy-content", href: "/academy", icon: GraduationCap, beta: true },
      { id: "advertiser-guide", href: "/guides", icon: BookMarked },
    ],
  },
  {
    id: "studio",
    icon: Palette,
    items: [
      { id: "creative-library", href: "/creatives", icon: Images, beta: true },
      { id: "creative-studio", href: "/creatives/upload", icon: Wand2, beta: true },
      { id: "dooh-playlists", href: "/creatives/playlists", icon: ListVideo, beta: true },
    ],
  },
];
