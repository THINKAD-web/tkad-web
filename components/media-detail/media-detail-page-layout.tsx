import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { MediaDetailTabs } from "@/components/media-detail/media-detail-tabs";

export type MediaDetailTabId =
  | "location"
  | "traffic"
  | "calendar"
  | "execution";

type TabDef = {
  id: MediaDetailTabId;
  label: string;
};

type Props = {
  tabs: TabDef[];
  panels: Record<MediaDetailTabId, ReactNode>;
  sidebar?: ReactNode;
  /** 모바일에서 탭 위에 표시 (사이드바 대체) */
  mobileProposal?: ReactNode;
  /** 탭 바로 위, 히어로 직후 above-the-fold 영역 (예: 쉬운 말 요약) */
  aboveTabs?: ReactNode;
  similarSection?: ReactNode;
  belowFold?: ReactNode;
  className?: string;
};

export function MediaDetailPageLayout({
  tabs,
  panels,
  sidebar,
  mobileProposal,
  aboveTabs,
  similarSection,
  belowFold,
  className,
}: Props) {
  return (
    <div className={cn("pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-16", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {mobileProposal ? (
              <div className="mb-[length:var(--qp-space-section)]">{mobileProposal}</div>
            ) : null}

            {aboveTabs ? (
              <div className="mb-[length:var(--qp-space-section)]">{aboveTabs}</div>
            ) : null}

            <MediaDetailTabs tabs={tabs} panels={panels} />

            {similarSection ? (
              <div className="mt-[length:var(--qp-space-section)] border-t border-gray-200 pt-[length:var(--qp-space-section)] dark:border-white/10">
                {similarSection}
              </div>
            ) : null}

            {belowFold ? (
              <div className="mt-[length:var(--qp-space-section)] space-y-[length:var(--qp-space-section)] border-t border-gray-200 pt-[length:var(--qp-space-section)] dark:border-white/10">
                {belowFold}
              </div>
            ) : null}
          </div>

          {sidebar ? (
            <div className="hidden lg:block">
              <div className="sticky top-[72px] z-10">{sidebar}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
