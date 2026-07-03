import type { PublicNavItemId } from "@/lib/navigation/public-nav-data";

function pathOnly(pathname: string): string {
  return pathname.split("?")[0] ?? pathname;
}

function featureSet(searchParams?: Pick<URLSearchParams, "get"> | null): Set<string> {
  const raw = searchParams?.get("features") ?? "";
  return new Set(
    raw
      .split(/[,，]/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

function isMapBrowsePath(path: string): boolean {
  return path === "/media/map" || path.startsWith("/media/map/");
}

function isCampaignTargetsPath(path: string): boolean {
  return path === "/media/targets" || path.startsWith("/media/targets/");
}

function isNetworkBrowsePath(path: string, features: Set<string>): boolean {
  if (path === "/media" && features.has("network")) return true;
  if (path === "/media/network") return true;
  if (path.startsWith("/media/network/")) return true;
  return false;
}

function isMediaSearchBrowsePath(path: string, features: Set<string>): boolean {
  if (!path.startsWith("/media")) return false;
  if (isMapBrowsePath(path)) return false;
  if (isCampaignTargetsPath(path)) return false;
  if (isNetworkBrowsePath(path, features)) return false;
  if (path.startsWith("/media/packages")) return false;
  if (path === "/media") return !features.has("network");
  return path.startsWith("/media/");
}

function isIntegratedPlannerPath(path: string): boolean {
  return path === "/planner/integrated" || path.startsWith("/planner/integrated/");
}

function isMediaPlannerPath(path: string): boolean {
  if (!path.startsWith("/planner")) return false;
  return !isIntegratedPlannerPath(path);
}

/** 발견하기·기획하기 등 공개 네비 항목 — pathname + query 기준 단일 활성 */
export function isPublicNavItemActive(
  pathname: string,
  itemId: PublicNavItemId,
  searchParams?: Pick<URLSearchParams, "get"> | null,
): boolean {
  const path = pathOnly(pathname);
  const features = featureSet(searchParams);

  switch (itemId) {
    case "media-search":
      return isMediaSearchBrowsePath(path, features);
    case "map-search":
      return isMapBrowsePath(path);
    case "media-network":
      return isNetworkBrowsePath(path, features);
    case "campaign-targets":
      return isCampaignTargetsPath(path);
    case "media-planner":
      return isMediaPlannerPath(path);
    case "integrated-planner":
      return isIntegratedPlannerPath(path);
    case "package-proposal":
      return path === "/media/packages" || path.startsWith("/media/packages/");
    case "ai-recommend":
      return path === "/recommend" || path.startsWith("/recommend/");
    case "trend-report":
      return path === "/report" || path.startsWith("/report/");
    case "success-cases":
      return path === "/cases" || path.startsWith("/cases/");
    case "academy-content":
      return path === "/academy" || path.startsWith("/academy/");
    case "advertiser-guide":
      return path === "/guides" || path.startsWith("/guides/");
    case "creative-library":
      return path === "/creatives" || path.startsWith("/creatives/");
    case "creative-studio":
      return path === "/creatives/upload" || path.startsWith("/creatives/upload/");
    case "dooh-playlists":
      return path === "/creatives/playlists" || path.startsWith("/creatives/playlists/");
    default:
      return false;
  }
}
