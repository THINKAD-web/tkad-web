import {
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  Link2,
  Map,
  Package,
  Palette,
  Search,
  Sparkles,
  Trophy,
  Tv2,
  Wand2,
} from "lucide-react";
import type { SubTab } from "@/components/layout/sub-tabs";

export const DISCOVERY_TABS: SubTab[] = [
  {
    label: "매체검색",
    href: "/media",
    icon: Search,
    match: (p) =>
      p === "/media" ||
      (p.startsWith("/media") &&
        !p.startsWith("/media/map") &&
        !p.startsWith("/media/packages")),
  },
  { label: "지도탐색", href: "/media/map", icon: Map },
  { label: "AI추천", href: "/recommend", icon: Sparkles },
];

export const PLANNING_TABS: SubTab[] = [
  {
    label: "미디어플래너",
    href: "/planner",
    icon: BarChart3,
    match: (p) =>
      p === "/planner" ||
      (p.startsWith("/planner") && !p.startsWith("/planner/integrated")),
  },
  { label: "통합플래너", href: "/planner/integrated", icon: Link2 },
  { label: "패키지", href: "/media/packages", icon: Package },
];

export const CONTENT_TABS: SubTab[] = [
  { label: "트렌드 리포트", href: "/report", icon: FileText },
  { label: "성공 사례", href: "/cases", icon: Trophy },
  { label: "교육 콘텐츠", href: "/academy", icon: GraduationCap },
  { label: "광고주 가이드", href: "/guides", icon: BookOpen },
];

export const STUDIO_TABS: SubTab[] = [
  {
    label: "소재 라이브러리",
    href: "/creatives",
    icon: Palette,
    match: (p) => p === "/creatives",
  },
  { label: "DOOH 플레이리스트", href: "/creatives/playlists", icon: Tv2 },
  { label: "크리에이티브 스튜디오", href: "/creatives/upload", icon: Wand2 },
];
