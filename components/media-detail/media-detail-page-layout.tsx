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
  similarSection?: ReactNode;
  belowFold?: ReactNode;
  className?: string;
};

export function MediaDetailPageLayout({
  tabs,
  panels,
  sidebar,
  mobileProposal,
  similarSection,
  belowFold,
  className,
}: Props) {
  return (
    <div className={cn("pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-16", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0">
            {mobileProposal ? (
              <div className="mb-6">{mobileProposal}</div>
            ) : null}

            <MediaDetailTabs tabs={tabs} panels={panels} />

            {similarSection ? (
              <div className="mt-10 border-t dark:border-white/10 border-gray-200 pt-10">
                {similarSection}
              </div>
            ) : null}

            {belowFold ? (
              <div className="mt-10 space-y-10 border-t dark:border-white/10 border-gray-200 pt-10">
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
