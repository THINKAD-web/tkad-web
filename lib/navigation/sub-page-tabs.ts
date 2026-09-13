import {
  BarChart3,
  BookOpen,
  FileText,
  GraduationCap,
  Map,
  MonitorSmartphone,
  Network,
  Palette,
  RefreshCw,
  Search,
  Shield,
  Target,
  Sparkles,
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
        !p.startsWith("/media/online") &&
        !p.startsWith("/media/map") &&
        !p.startsWith("/media/packages") &&
        !p.startsWith("/media/network") &&
        !p.startsWith("/media/targets")),
  },
  {
    label: "온라인 광고",
    href: "/media/online",
    icon: MonitorSmartphone,
    match: (p) => p === "/media/online" || p.startsWith("/media/online/"),
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

/**
 * "패키지"(→ /media/packages)는 여기(기획하기 탭 그룹)에 없다 — 의도적.
 * 매체 패키지 상품 목록은 플랜을 만드는 도구가 아니라 발견하기(브라우징) 계열
 * 기능이라 이 그룹 개념과 안 맞고, 실기기에서 이 탭 바로 아래에 배치된 탭이
 * sticky 헤더에 가려 클릭이 안 되는 회귀도 있었다. `/media/packages`는 메인
 * nav·홈 사이드바·Cmd+K 퀵링크 등 다른 경로로 이미 노출되고 있어 여기서
 * 빼도 도달 불가능해지지 않는다.
 */
export const PLANNING_TABS: SubTab[] = [
  {
    label: "AI 플래너",
    href: "/recommend",
    icon: Sparkles,
    match: (p) => p === "/recommend" || p.startsWith("/recommend/"),
  },
  {
    label: "상세 플래너",
    href: "/planner",
    icon: BarChart3,
    match: (p) => p === "/planner" || p.startsWith("/planner/"),
  },
];

export const CONTENT_TABS: SubTab[] = [
  { label: "트렌드 리포트", href: "/report", icon: FileText },
  { label: "성공 사례", href: "/cases", icon: Trophy },
  { label: "광고주 가이드", href: "/guides", icon: BookOpen },
  {
    label: "교육 콘텐츠",
    href: "/academy",
    icon: GraduationCap,
    match: (p) => p === "/academy" || p.startsWith("/academy/learn"),
  },
];

export const POLICY_TABS: SubTab[] = [
  { label: "이용약관", href: "/terms", icon: FileText },
  { label: "개인정보처리방침", href: "/privacy", icon: Shield },
  { label: "환불 정책", href: "/refund", icon: RefreshCw },
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
