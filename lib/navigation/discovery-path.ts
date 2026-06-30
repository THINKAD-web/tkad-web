import { PUBLIC_NAV_GROUPS } from "@/lib/navigation/public-nav-data";

/** Strip optional `/ko` | `/en` locale prefix from pathname. */
export function stripLocalePath(pathname: string): string {
  return pathname.replace(/^\/(ko|en)(?=\/|$)/, "") || "/";
}

/** 발견하기 네비 그룹 경로 — `/media`, `/media/map`, `/media/targets` 등 */
export function isDiscoveryNavPath(pathname: string): boolean {
  const path = stripLocalePath(pathname.split("?")[0] ?? pathname);
  for (const group of PUBLIC_NAV_GROUPS) {
    if (group.id !== "discovery") continue;
    for (const item of group.items) {
      const base = item.href.split("?")[0]?.split("#")[0] ?? item.href;
      if (path === base || (base !== "/" && path.startsWith(`${base}/`))) {
        return true;
      }
    }
  }
  return false;
}

/** `/media`·`/media/map` — 담은 매체 하단 팝업 숨김 대상 */
export function isMediaBrowsePath(pathname: string): boolean {
  const path = stripLocalePath(pathname.split("?")[0] ?? pathname);
  return path === "/media" || path.startsWith("/media/map");
}
