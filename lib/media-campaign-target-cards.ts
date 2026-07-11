import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Globe2,
  GraduationCap,
  Landmark,
  MapPin,
  Mic2,
  ShoppingBag,
} from "lucide-react";

export type CampaignTargetCard = {
  slug: string;
  title: string;
  description: string;
  recommendation: string;
  icon: LucideIcon;
  cardClass: string;
  iconWrapClass: string;
  accentTextClass: string;
  specialHref?: string;
};

export const MEDIA_CAMPAIGN_TARGET_CARDS: CampaignTargetCard[] = [
  {
    slug: "brand",
    title: "기업 브랜드",
    description: "인지도·신제품 론칭",
    recommendation: "강남 DOOH · 도심 빌보드",
    icon: Building2,
    cardClass: "bg-violet-500/10 border-violet-500/20",
    iconWrapClass: "bg-violet-500/15 text-violet-600 dark:text-violet-300",
    accentTextClass: "text-violet-600 dark:text-violet-400",
  },
  {
    slug: "fandom",
    title: "팬덤/엔터",
    description: "아이돌 생일·팬클럽 응원",
    recommendation: "강남역·홍대·코엑스 핫스팟",
    icon: Mic2,
    cardClass: "bg-pink-500/10 border-pink-500/20",
    iconWrapClass: "bg-pink-500/15 text-pink-600 dark:text-pink-300",
    accentTextClass: "text-pink-600 dark:text-pink-400",
    specialHref: "/special/fandom",
  },
  {
    slug: "event",
    title: "팝업·이벤트",
    description: "팝업 스토어·한정 캠페인",
    recommendation: "성수·홍대 DOOH",
    icon: ShoppingBag,
    cardClass: "bg-cyan-500/10 border-cyan-500/20",
    iconWrapClass: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-300",
    accentTextClass: "text-cyan-600 dark:text-cyan-400",
    specialHref: "/special/popup",
  },
  {
    slug: "public",
    title: "지자체/공공",
    description: "정부 캠페인·정책 홍보",
    recommendation: "버스쉘터·지하철",
    icon: Landmark,
    cardClass: "bg-blue-500/10 border-blue-500/20",
    iconWrapClass: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
    accentTextClass: "text-blue-600 dark:text-blue-400",
  },
  {
    slug: "small_business",
    title: "동네/소상공인",
    description: "동네 매장·오픈 행사",
    recommendation: "로컬 빌보드·쉘터",
    icon: MapPin,
    cardClass: "bg-emerald-500/10 border-emerald-500/20",
    iconWrapClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
    accentTextClass: "text-emerald-600 dark:text-emerald-400",
    specialHref: "/special/local",
  },
  {
    slug: "university",
    title: "대학 캠퍼스",
    description: "대학생 타겟·신학기",
    recommendation: "대학가 매체",
    icon: GraduationCap,
    cardClass: "bg-amber-500/10 border-amber-500/20",
    iconWrapClass: "bg-amber-500/15 text-amber-600 dark:text-amber-300",
    accentTextClass: "text-amber-600 dark:text-amber-400",
    specialHref: "/special/campus",
  },
  {
    slug: "regional",
    title: "지역 프로모션",
    description: "지역 축제·문화행사",
    recommendation: "지역 빌보드·쉘터",
    icon: Globe2,
    cardClass: "bg-rose-500/10 border-rose-500/20",
    iconWrapClass: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
    accentTextClass: "text-rose-600 dark:text-rose-400",
  },
];
