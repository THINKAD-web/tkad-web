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

/** 아이콘 래퍼 — 회색조 표면 + qp 액센트 아이콘 (원색 무지개 제거, 톤 단차로 구분) */
const ICON_WRAP = {
  a: "bg-[color:var(--qp-accent-soft)] text-[color:var(--qp-accent)]",
  b: "bg-muted text-[color:var(--qp-accent)]",
  c: "bg-gray-100 text-[color:var(--qp-accent)] dark:bg-white/8",
  d: "bg-gray-50 text-[color:var(--qp-accent)] dark:bg-white/5",
  e: "border border-gray-200 bg-white text-[color:var(--qp-accent)] dark:border-white/12 dark:bg-white/6",
  f: "bg-gray-200/70 text-[color:var(--qp-accent)] dark:bg-white/10",
  g: "border border-[color:var(--qp-accent)]/25 bg-[color:var(--qp-accent-soft)] text-[color:var(--qp-accent)]",
} as const;

const ACCENT_TEXT = "text-[color:var(--qp-accent)]";
const CARD_NEUTRAL = "bg-muted/40 border-border";

export const MEDIA_CAMPAIGN_TARGET_CARDS: CampaignTargetCard[] = [
  {
    slug: "brand",
    title: "기업 브랜드",
    description: "인지도·신제품 론칭",
    recommendation: "강남 DOOH · 도심 빌보드",
    icon: Building2,
    cardClass: CARD_NEUTRAL,
    iconWrapClass: ICON_WRAP.a,
    accentTextClass: ACCENT_TEXT,
  },
  {
    slug: "fandom",
    title: "팬덤/엔터",
    description: "아이돌 생일·팬클럽 응원",
    recommendation: "강남역·홍대·코엑스 핫스팟",
    icon: Mic2,
    cardClass: CARD_NEUTRAL,
    iconWrapClass: ICON_WRAP.b,
    accentTextClass: ACCENT_TEXT,
    specialHref: "/special/fandom",
  },
  {
    slug: "event",
    title: "팝업·이벤트",
    description: "팝업 스토어·한정 캠페인",
    recommendation: "성수·홍대 DOOH",
    icon: ShoppingBag,
    cardClass: CARD_NEUTRAL,
    iconWrapClass: ICON_WRAP.c,
    accentTextClass: ACCENT_TEXT,
    specialHref: "/special/popup",
  },
  {
    slug: "public",
    title: "지자체/공공",
    description: "정부 캠페인·정책 홍보",
    recommendation: "버스쉘터·지하철",
    icon: Landmark,
    cardClass: CARD_NEUTRAL,
    iconWrapClass: ICON_WRAP.d,
    accentTextClass: ACCENT_TEXT,
  },
  {
    slug: "small_business",
    title: "동네/소상공인",
    description: "동네 매장·오픈 행사",
    recommendation: "로컬 빌보드·쉘터",
    icon: MapPin,
    cardClass: CARD_NEUTRAL,
    iconWrapClass: ICON_WRAP.e,
    accentTextClass: ACCENT_TEXT,
    specialHref: "/special/local",
  },
  {
    slug: "university",
    title: "대학 캠퍼스",
    description: "대학생 타겟·신학기",
    recommendation: "대학가 매체",
    icon: GraduationCap,
    cardClass: CARD_NEUTRAL,
    iconWrapClass: ICON_WRAP.f,
    accentTextClass: ACCENT_TEXT,
    specialHref: "/special/campus",
  },
  {
    slug: "regional",
    title: "지역 프로모션",
    description: "지역 축제·문화행사",
    recommendation: "지역 빌보드·쉘터",
    icon: Globe2,
    cardClass: CARD_NEUTRAL,
    iconWrapClass: ICON_WRAP.g,
    accentTextClass: ACCENT_TEXT,
  },
];
