"use client";

import { usePathname } from "next/navigation";
import { SubTabs } from "@/components/layout/sub-tabs";
import { routing } from "@/i18n/routing";
import {
  CONTENT_TABS,
  DISCOVERY_TABS,
  PLANNING_TABS,
  POLICY_TABS,
  STUDIO_TABS,
} from "@/lib/navigation/sub-page-tabs";

export type SubPageTabGroup =
  | "discovery"
  | "planning"
  | "content"
  | "studio"
  | "policy";

const TABS_BY_GROUP = {
  discovery: DISCOVERY_TABS,
  planning: PLANNING_TABS,
  content: CONTENT_TABS,
  studio: STUDIO_TABS,
  policy: POLICY_TABS,
} as const;

function stripLocalePrefix(pathname: string): string {
  for (const locale of routing.locales) {
    if (pathname === `/${locale}`) return "/";
    if (pathname.startsWith(`/${locale}/`)) {
      return pathname.slice(locale.length + 1) || "/";
    }
  }
  return pathname;
}

interface SubTabsBarProps {
  group: SubPageTabGroup;
  currentPath?: string;
}

export function SubTabsBar({ group, currentPath }: SubTabsBarProps) {
  const pathname = usePathname() ?? "";
  const resolvedPath = currentPath ?? stripLocalePrefix(pathname);

  return <SubTabs tabs={TABS_BY_GROUP[group]} currentPath={resolvedPath} />;
}
