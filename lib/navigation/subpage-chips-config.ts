export type SubpageChipDef = {
  id: string;
  labelKo: string;
  labelEn: string;
  href: string;
  /** Match active state — pathname prefix or exact */
  match?: (pathname: string, search: URLSearchParams) => boolean;
};

export type SubpageChipGroup = {
  id: string;
  /** First path segment(s) to match, e.g. `/media` */
  matchPath: (pathname: string) => boolean;
  chips: SubpageChipDef[];
};

function mediaChip(
  id: string,
  labelKo: string,
  labelEn: string,
  href: string,
  chip?: string,
): SubpageChipDef {
  return {
    id,
    labelKo,
    labelEn,
    href,
    match: chip
      ? (_, sp) => sp.get("chip") === chip
      : (_, sp) => !sp.get("chip") && !sp.get("cat") && !sp.get("instant"),
  };
}

export const SUBPAGE_CHIP_GROUPS: SubpageChipGroup[] = [
  {
    id: "media",
    matchPath: (p) => {
      if (p.startsWith("/media-owner")) return false;
      if (p === "/media") return true;
      if (
        p.startsWith("/media/category") ||
        p.startsWith("/media/type") ||
        p.startsWith("/media/region") ||
        p.startsWith("/media/area")
      ) {
        return true;
      }
      return false;
    },
    chips: [
      mediaChip("all", "전체", "All", "/media"),
      mediaChip("subway", "지하철", "Subway", "/media?chip=subway", "subway"),
      mediaChip("bus", "버스", "Bus", "/media?chip=bus", "bus"),
      mediaChip("billboard", "전광판", "Billboard", "/media?chip=billboard", "billboard"),
      mediaChip("dooh", "DOOH", "DOOH", "/media?chip=dooh", "dooh"),
      mediaChip("campus", "대학가", "Campus", "/media?chip=campus", "campus"),
      mediaChip("retail", "쇼핑몰", "Mall", "/media?chip=retail", "retail"),
      {
        id: "shelter",
        labelKo: "쉘터",
        labelEn: "Shelter",
        href: "/media/category/bus_shelter",
        match: (p) => p.includes("/media/category/bus_shelter"),
      },
      mediaChip("local", "로컬", "Local", "/media?chip=local", "local"),
    ],
  },
  {
    id: "planner",
    matchPath: (p) => p.startsWith("/planner"),
    chips: [
      { id: "media", labelKo: "매체 검색", labelEn: "Media search", href: "/media" },
      { id: "ai", labelKo: "AI추천", labelEn: "AI pick", href: "/recommend" },
      { id: "pkg", labelKo: "패키지", labelEn: "Packages", href: "/media/packages" },
      { id: "compare", labelKo: "비교하기", labelEn: "Compare", href: "/compare" },
    ],
  },
  {
    id: "cases",
    matchPath: (p) => p === "/cases" || p.startsWith("/cases/"),
    chips: [
      {
        id: "all",
        labelKo: "전체",
        labelEn: "All",
        href: "/cases",
        match: (_, sp) => !sp.get("industry") && !sp.get("q"),
      },
      {
        id: "beauty",
        labelKo: "뷰티",
        labelEn: "Beauty",
        href: "/cases?industry=beauty",
        match: (_, sp) => sp.get("industry") === "beauty",
      },
      {
        id: "fashion",
        labelKo: "패션",
        labelEn: "Fashion",
        href: "/cases?industry=fashion",
        match: (_, sp) => sp.get("industry") === "fashion",
      },
      {
        id: "fnb",
        labelKo: "F&B",
        labelEn: "F&B",
        href: "/cases?industry=fnb",
        match: (_, sp) => sp.get("industry") === "fnb",
      },
      {
        id: "tech",
        labelKo: "IT",
        labelEn: "IT",
        href: "/cases?industry=tech",
        match: (_, sp) => sp.get("industry") === "tech",
      },
      {
        id: "fandom",
        labelKo: "팬덤",
        labelEn: "Fandom",
        href: "/cases?industry=entertainment",
        match: (_, sp) => sp.get("industry") === "entertainment",
      },
      {
        id: "public",
        labelKo: "지자체",
        labelEn: "Public",
        href: "/cases?q=지자체",
        match: (_, sp) => sp.get("q") === "지자체",
      },
    ],
  },
  {
    id: "report",
    matchPath: (p) => p === "/report" || p.startsWith("/report/"),
    chips: [
      {
        id: "all",
        labelKo: "전체",
        labelEn: "All",
        href: "/report",
        match: (_, sp) => !sp.get("category"),
      },
      {
        id: "trend",
        labelKo: "OOH트렌드",
        labelEn: "OOH trends",
        href: "/report?category=TREND",
        match: (_, sp) => sp.get("category") === "TREND",
      },
      {
        id: "campaign",
        labelKo: "업종분석",
        labelEn: "Industry",
        href: "/report?category=CAMPAIGN",
        match: (_, sp) => sp.get("category") === "CAMPAIGN",
      },
      {
        id: "region",
        labelKo: "지역분석",
        labelEn: "Regional",
        href: "/report?category=REGION",
        match: (_, sp) => sp.get("category") === "REGION",
      },
    ],
  },
  {
    id: "academy",
    matchPath: (p) => p === "/academy" || p.startsWith("/academy/"),
    chips: [
      {
        id: "all",
        labelKo: "전체",
        labelEn: "All",
        href: "/academy",
        match: (_, sp) => !sp.get("cat"),
      },
      {
        id: "ooh-basics",
        labelKo: "OOH기초",
        labelEn: "OOH basics",
        href: "/academy?cat=ooh-basics",
        match: (_, sp) => sp.get("cat") === "ooh-basics",
      },
      {
        id: "measurement",
        labelKo: "CPM·데이터",
        labelEn: "CPM & data",
        href: "/academy?cat=measurement",
        match: (_, sp) => sp.get("cat") === "measurement",
      },
      {
        id: "creative",
        labelKo: "소재제작",
        labelEn: "Creative",
        href: "/academy?cat=creative",
        match: (_, sp) => sp.get("cat") === "creative",
      },
      {
        id: "planning",
        labelKo: "캠페인전략",
        labelEn: "Strategy",
        href: "/academy?cat=planning",
        match: (_, sp) => sp.get("cat") === "planning",
      },
      {
        id: "fandom",
        labelKo: "팬덤광고",
        labelEn: "Fandom ads",
        href: "/academy?cat=programmatic",
        match: (_, sp) => sp.get("cat") === "programmatic",
      },
    ],
  },
  {
    id: "creatives",
    matchPath: (p) => p.startsWith("/creatives"),
    chips: [
      {
        id: "library",
        labelKo: "소재 라이브러리",
        labelEn: "Library",
        href: "/creatives",
        match: (p) => p === "/creatives" || p === "/creatives/",
      },
      {
        id: "playlists",
        labelKo: "플레이리스트",
        labelEn: "Playlists",
        href: "/creatives/playlists",
        match: (p) => p.startsWith("/creatives/playlists"),
      },
      {
        id: "studio",
        labelKo: "크리에이티브 스튜디오",
        labelEn: "Studio",
        href: "/creatives/upload",
        match: (p) => p.startsWith("/creatives/upload"),
      },
    ],
  },
  {
    id: "my",
    matchPath: (p) => p.startsWith("/my"),
    chips: [
      {
        id: "quotes",
        labelKo: "견적내역",
        labelEn: "Quotes",
        href: "/my/booking-requests",
        match: (p) => p.startsWith("/my/booking-requests"),
      },
      {
        id: "plan-cart",
        labelKo: "내 플랜",
        labelEn: "My plan",
        href: "/my/plan",
        match: (p) =>
          p === "/my/plan" ||
          p.startsWith("/my/plan/report"),
      },
      {
        id: "plan-saved",
        labelKo: "저장된 플랜",
        labelEn: "Saved plans",
        href: "/my/plan/saved",
        match: (p) => p.startsWith("/my/plan/saved"),
      },
      {
        id: "planner",
        labelKo: "저장 플래너",
        labelEn: "Planner saves",
        href: "/my?tab=planner",
        match: (_, sp) => sp.get("tab") === "planner",
      },
      {
        id: "points",
        labelKo: "포인트",
        labelEn: "Points",
        href: "/my?tab=points",
        match: (_, sp) => sp.get("tab") === "points",
      },
    ],
  },
];

export function resolveSubpageChips(
  pathname: string,
): SubpageChipGroup | null {
  const normalized = pathname.replace(/\/$/, "") || "/";
  for (const group of SUBPAGE_CHIP_GROUPS) {
    if (group.matchPath(normalized)) return group;
  }
  return null;
}
