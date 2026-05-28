"use client";

import { SubTabs } from "@/components/layout/sub-tabs";
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

interface SubTabsBarProps {
  group: SubPageTabGroup;
  currentPath?: string;
}

export function SubTabsBar({ group, currentPath }: SubTabsBarProps) {
  return <SubTabs tabs={TABS_BY_GROUP[group]} currentPath={currentPath} />;
}
