import type { LucideIcon } from "lucide-react";
import {
  BookMarked,
  BookOpen,
  ClipboardList,
  Compass,
  GraduationCap,
  Images,
  Lightbulb,
  LineChart,
  ListVideo,
  MapPin,
  Package,
  Palette,
  Search,
  Sparkles,
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
  | "ai-recommend"
  | "media-planner"
  | "integrated-planner"
  | "package-proposal"
  | "creative-library"
  | "dooh-playlists"
  | "creative-studio"
  | "trend-report"
  | "success-cases"
  | "academy-content"
  | "academy-home"
  | "advertiser-guide";

export type PublicNavItemDef = {
  id: PublicNavItemId;
  href: string;
  icon: LucideIcon;
  /** BETA는 세부 메뉴에만 */
  beta?: boolean;
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
      { id: "ai-recommend", href: "/recommend", icon: Sparkles, beta: true },
    ],
  },
  {
    id: "planning",
    icon: ClipboardList,
    items: [
      { id: "media-planner", href: "/planner", icon: Lightbulb, beta: true },
      {
        id: "integrated-planner",
        href: "/planner/integrated",
        icon: Sparkles,
        beta: true,
      },
      { id: "package-proposal", href: "/media/packages", icon: Package },
    ],
  },
  {
    id: "insights",
    icon: LineChart,
    items: [
      { id: "trend-report", href: "/report", icon: LineChart },
      { id: "success-cases", href: "/cases", icon: Trophy },
      { id: "academy-content", href: "/academy", icon: GraduationCap },
      { id: "academy-home", href: "/academy#academy-basics", icon: BookOpen },
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
