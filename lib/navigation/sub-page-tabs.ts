import {
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  Link2,
  Map,
  Network,
  Package,
  Palette,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Target,
  Trophy,
  Tv2,
  Wand2,
} from "lucide-react";
import type { SubTab } from "@/components/layout/sub-tabs";

export const DISCOVERY_TABS: SubTab[] = [
  {
    label: "매체 검색",
    href: "/media",
    icon: Search,
    match: (p) =>
      p === "/media" ||
      (p.startsWith("/media") &&
        !p.startsWith("/media/map") &&
        !p.startsWith("/media/packages") &&
        !p.startsWith("/media/network") &&
        !p.startsWith("/media/targets")),
  },
  { label: "지도에서 찾기", href: "/media/map", icon: Map },
  { label: "네트워크 매체", href: "/media?features=network", icon: Network,
    match: (p) =>
      p === "/media/network" || p.startsWith("/media/network/"),
  },
  {
    label: "캠페인 목적",
    href: "/media/targets",
    icon: Target,
    match: (p) =>
      p === "/media/targets" || p.startsWith("/media/targets/"),
  },
];

export const PLANNING_TABS: SubTab[] = [
  {
    label: "단계별 플래너",
    href: "/planner",
    icon: BarChart3,
    match: (p) =>
      p === "/planner" ||
      (p.startsWith("/planner") && !p.startsWith("/planner/integrated")),
  },
  { label: "통합 미디어 플래너", href: "/planner/integrated", icon: Link2 },
  { label: "패키지 제안", href: "/media/packages", icon: Package },
  { label: "빠른 AI 추천", href: "/recommend", icon: Sparkles },
];

export const CONTENT_TABS: SubTab[] = [
  { label: "트렌드 리포트", href: "/report", icon: FileText },
  { label: "성공 사례", href: "/cases", icon: Trophy },
  {
    label: "교육 콘텐츠",
    href: "/academy",
    icon: GraduationCap,
    match: (p) => p === "/academy" || p.startsWith("/academy/learn"),
  },
  { label: "광고주 가이드", href: "/guides", icon: BookOpen },
];

export const POLICY_TABS: SubTab[] = [
  { label: "이용약관", href: "/terms", icon: FileText },
  { label: "개인정보처리방침", href: "/privacy", icon: Shield },
  { label: "환불 정책", href: "/refund", icon: RefreshCw },
  {
    label: "성과 보증",
    href: "/guarantee",
    icon: BarChart3,
    match: (p) => p === "/guarantee" || p.startsWith("/guarantee/"),
  },
];

export const STUDIO_TABS: SubTab[] = [
  {
    label: "소재 라이브러리",
    href: "/creatives",
    icon: Palette,
    match: (p) => p === "/creatives",
  },
  { label: "크리에이티브 스튜디오", href: "/creatives/upload", icon: Wand2 },
  { label: "DOOH 플레이리스트", href: "/creatives/playlists", icon: Tv2 },
];
