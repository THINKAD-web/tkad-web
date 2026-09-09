import type { ReactNode } from "react";
import { SubTabsBar } from "@/components/layout/sub-tabs-bar";

/** AI 플래너 · 상세 플래너 — 컨텐츠 폭·여백·탭 위치 SSOT */
export function PlanningPageShell({
  currentPath,
  header,
  children,
}: {
  currentPath: "/recommend" | "/planner";
  header?: ReactNode;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto w-full min-w-0 max-w-5xl overflow-x-clip px-4 py-10">
      {header}
      <div className="-mx-4 mb-8 sm:-mx-0">
        <SubTabsBar group="planning" currentPath={currentPath} />
      </div>
      {children}
    </main>
  );
}
