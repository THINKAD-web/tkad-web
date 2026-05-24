import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  BookMarked,
  BookOpen,
  ClipboardList,
  Compass,
  FileText,
  GraduationCap,
  Heart,
  HelpCircle,
  Images,
  LayoutGrid,
  Lightbulb,
  LineChart,
  ListVideo,
  MapPin,
  Megaphone,
  MessageCircle,
  Package,
  Palette,
  Search,
  Sparkles,
  Trophy,
  Users,
  Wand2,
  Zap,
  Scale,
  Building2,
  Newspaper,
  Globe,
} from "lucide-react";

export type HomeHubButton = {
  id: string;
  href: string;
  labelKo: string;
  labelEn: string;
  descKo?: string;
  descEn?: string;
  icon: LucideIcon;
};

export type HomeHubSection = {
  id: string;
  titleKo: string;
  titleEn: string;
  columns: 2 | 3;
  items: HomeHubButton[];
};

/** Primary 5 sections — curated marketplace hub */
export const HOME_HUB_SECTIONS: HomeHubSection[] = [
  {
    id: "discovery",
    titleKo: "매체 탐색",
    titleEn: "Discover media",
    columns: 2,
    items: [
      {
        id: "media-search",
        href: "/media",
        labelKo: "매체 검색",
        labelEn: "Media search",
        icon: Search,
      },
      {
        id: "map-search",
        href: "/media/map",
        labelKo: "지도 탐색",
        labelEn: "Map browse",
        icon: MapPin,
      },
      {
        id: "ai-recommend",
        href: "/recommend",
        labelKo: "AI 매체추천",
        labelEn: "AI recommend",
        icon: Sparkles,
      },
      {
        id: "packages",
        href: "/media/packages",
        labelKo: "패키지",
        labelEn: "Packages",
        icon: Package,
      },
    ],
  },
  {
    id: "planning",
    titleKo: "캠페인 기획",
    titleEn: "Campaign planning",
    columns: 2,
    items: [
      {
        id: "planner",
        href: "/planner",
        labelKo: "미디어플래너",
        labelEn: "Media planner",
        icon: LayoutGrid,
      },
      {
        id: "quote",
        href: "/quote",
        labelKo: "견적 문의",
        labelEn: "Get a quote",
        icon: MessageCircle,
      },
      {
        id: "instant",
        href: "/media?instant=1",
        labelKo: "즉시예약",
        labelEn: "Instant book",
        icon: Zap,
      },
      {
        id: "compare",
        href: "/compare",
        labelKo: "비교하기",
        labelEn: "Compare",
        icon: Scale,
      },
    ],
  },
  {
    id: "studio",
    titleKo: "스튜디오",
    titleEn: "Studio",
    columns: 3,
    items: [
      {
        id: "creative-library",
        href: "/creatives",
        labelKo: "소재라이브러리",
        labelEn: "Creative library",
        icon: Images,
      },
      {
        id: "dooh-playlists",
        href: "/creatives/playlists",
        labelKo: "DOOH 플레이리스트",
        labelEn: "DOOH playlists",
        icon: ListVideo,
      },
      {
        id: "creative-studio",
        href: "/creatives/upload",
        labelKo: "크리에이티브 스튜디오",
        labelEn: "Creative studio",
        icon: Wand2,
      },
    ],
  },
  {
    id: "insights",
    titleKo: "인사이트·콘텐츠",
    titleEn: "Insights & content",
    columns: 2,
    items: [
      {
        id: "trend-report",
        href: "/report",
        labelKo: "트렌드리포트",
        labelEn: "Trend reports",
        icon: LineChart,
      },
      {
        id: "success-cases",
        href: "/cases",
        labelKo: "성공 사례",
        labelEn: "Case studies",
        icon: Trophy,
      },
      {
        id: "academy",
        href: "/academy",
        labelKo: "교육 콘텐츠",
        labelEn: "Academy",
        icon: GraduationCap,
      },
      {
        id: "advertiser-guide",
        href: "/guides",
        labelKo: "광고주가이드",
        labelEn: "Advertiser guide",
        icon: BookMarked,
      },
    ],
  },
  {
    id: "special",
    titleKo: "특별 매체",
    titleEn: "Special media",
    columns: 2,
    items: [
      {
        id: "fandom",
        href: "/special/fandom",
        labelKo: "팬덤 광고",
        labelEn: "Fandom ads",
        icon: Heart,
      },
      {
        id: "popup",
        href: "/target/event",
        labelKo: "팝업스토어",
        labelEn: "Pop-up store",
        icon: Sparkles,
      },
      {
        id: "campus",
        href: "/media/category/campus",
        labelKo: "대학가",
        labelEn: "Campus",
        icon: GraduationCap,
      },
      {
        id: "local",
        href: "/target/small_business",
        labelKo: "동네 광고",
        labelEn: "Local ads",
        icon: MapPin,
      },
    ],
  },
];

/** Additional public pages — complete nav map (no admin/auth) */
export const HOME_HUB_EXTRA_SECTION: HomeHubSection = {
  id: "more",
  titleKo: "더 많은 서비스",
  titleEn: "More services",
  columns: 2,
  items: [
    { id: "search", href: "/search", labelKo: "통합 검색", labelEn: "Search", icon: Search },
    { id: "integrated-planner", href: "/planner/integrated", labelKo: "통합 플래너", labelEn: "Integrated planner", icon: Lightbulb },
    { id: "insights-hub", href: "/insights", labelKo: "인사이트 허브", labelEn: "Insights hub", icon: BarChart3 },
    { id: "market-insights", href: "/insights/market", labelKo: "시장 분석", labelEn: "Market insights", icon: LineChart },
    { id: "competitive", href: "/insights/competitive", labelKo: "경쟁 분석", labelEn: "Competitive intel", icon: Compass },
    { id: "blog", href: "/blog", labelKo: "블로그", labelEn: "Blog", icon: Newspaper },
    { id: "community", href: "/community", labelKo: "커뮤니티", labelEn: "Community", icon: Users },
    { id: "portfolio", href: "/portfolio", labelKo: "포트폴리오", labelEn: "Portfolio", icon: Palette },
    { id: "services", href: "/services", labelKo: "서비스 소개", labelEn: "Services", icon: Megaphone },
    { id: "pricing", href: "/pricing", labelKo: "요금 안내", labelEn: "Pricing", icon: FileText },
    { id: "about", href: "/about", labelKo: "회사 소개", labelEn: "About", icon: Building2 },
    { id: "contact", href: "/contact", labelKo: "문의하기", labelEn: "Contact", icon: MessageCircle },
    { id: "faq", href: "/faq", labelKo: "FAQ", labelEn: "FAQ", icon: HelpCircle },
    { id: "guide-how", href: "/guide/how-to-use", labelKo: "이용 가이드", labelEn: "How to use", icon: BookOpen },
    { id: "glossary", href: "/glossary", labelKo: "용어집", labelEn: "Glossary", icon: BookMarked },
    { id: "developers", href: "/developers", labelKo: "개발자 API", labelEn: "Developers", icon: Globe },
    { id: "media-favorites", href: "/media/favorites", labelKo: "찜한 매체", labelEn: "Saved media", icon: Heart },
    { id: "media-register", href: "/register/media", labelKo: "매체 등록", labelEn: "List your media", icon: ClipboardList },
    { id: "my", href: "/my", labelKo: "마이페이지", labelEn: "My page", icon: Users },
    { id: "points", href: "/points", labelKo: "포인트", labelEn: "Points", icon: Sparkles },
  ],
};
