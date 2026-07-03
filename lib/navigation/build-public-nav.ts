import type { BrutalNavEntry, BrutalNavGroup, BrutalNavLeaf } from "@/components/brutalist";
import {
  PUBLIC_NAV_GROUPS,
  type PublicNavGroupDef,
  type PublicNavGroupId,
  type PublicNavItemDef,
  type PublicNavItemId,
} from "@/lib/navigation/public-nav-data";
import { isPublicNavItemActive } from "@/lib/navigation/public-nav-active";

export type ResolvedPublicNavItem = {
  id: string;
  href: string;
  label: string;
  desc?: string;
  badge?: string;
  icon: PublicNavItemDef["icon"];
  navKey: string;
};

export type ResolvedPublicNavGroup = {
  id: PublicNavGroupId;
  label: string;
  labelEn: string;
  icon: PublicNavGroupDef["icon"];
  items: ResolvedPublicNavItem[];
};

type NavTranslator = (key: string) => string;

function resolveItem(item: PublicNavItemDef, t: NavTranslator): ResolvedPublicNavItem {
  const base = `nav.items.${item.id}`;
  return {
    id: item.id,
    href: item.href,
    label: t(`${base}.label`),
    desc: t(`${base}.desc`),
    badge: item.beta ? t("nav.beta") : undefined,
    icon: item.icon,
    navKey: item.id,
  };
}

function resolveGroup(group: PublicNavGroupDef, t: NavTranslator): ResolvedPublicNavGroup {
  const base = `nav.groups.${group.id}`;
  return {
    id: group.id,
    label: t(`${base}.label`),
    labelEn: t(`${base}.labelEn`),
    icon: group.icon,
    items: group.items.map((item) => resolveItem(item, t)),
  };
}

/** i18n이 적용된 4개 메인 카테고리 트리 */
export function buildPublicNavGroups(t: NavTranslator): ResolvedPublicNavGroup[] {
  return PUBLIC_NAV_GROUPS.map((g) => resolveGroup(g, t));
}

/** 기존 BrutalNav 드롭다운·호환용 */
export function buildBrutalNavEntries(t: NavTranslator): BrutalNavEntry[] {
  return buildPublicNavGroups(t).map(
    (g): BrutalNavGroup => ({
      id: g.id,
      label: g.label,
      labelEn: g.labelEn,
      icon: g.icon,
      items: g.items.map(
        (item): BrutalNavLeaf => ({
          href: item.href,
          label: item.label,
          desc: item.desc,
          badge: item.badge,
          navKey: item.navKey,
          icon: item.icon,
        }),
      ),
    }),
  );
}

/** pathname이 속한 그룹 id (모바일 아코디언 초기 펼침) */
export function findActiveNavGroupId(
  pathname: string,
  groups: ResolvedPublicNavGroup[],
  searchParams?: Pick<URLSearchParams, "get"> | null,
): PublicNavGroupId | null {
  for (const group of groups) {
    for (const item of group.items) {
      if (isPublicNavItemActive(pathname, item.id as PublicNavItemId, searchParams)) {
        return group.id;
      }
    }
  }
  return null;
}
