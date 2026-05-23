"use client";

import type { ReactNode } from "react";
import PullToRefresh from "react-simple-pull-to-refresh";
import { Loader2 } from "lucide-react";
import { useLocale } from "next-intl";

type Props = {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  className?: string;
};

export function MobilePullToRefresh({ onRefresh, children, className }: Props) {
  const locale = useLocale();
  const isKo = locale === "ko";

  return (
    <div className={className}>
      <PullToRefresh
        onRefresh={onRefresh}
        pullingContent={
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-gray-500 dark:text-white/50 md:hidden">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isKo ? "당겨서 새로고침" : "Pull to refresh"}
          </div>
        }
        refreshingContent={
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-violet-500 md:hidden">
            <Loader2 className="h-4 w-4 animate-spin" />
            {isKo ? "새로고침 중..." : "Refreshing..."}
          </div>
        }
        className="md:[&_.ptr__children]:!transform-none md:[&_.ptr__pull-down]:!hidden"
      >
        {children}
      </PullToRefresh>
    </div>
  );
}
