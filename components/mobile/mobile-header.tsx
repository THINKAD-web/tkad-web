"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import {
  ArrowLeft,
  Bell,
  Filter,
  MoreVertical,
  Search,
  Share2,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hapticLight } from "@/lib/haptic";
import { useMobileSessionPoints } from "@/hooks/use-mobile-session-points";
import { useMobileSearch } from "@/components/mobile/mobile-search-context";
import { ActionSheet, type ActionSheetItem } from "@/components/mobile/action-sheet";

export type MobileHeaderPattern = "home" | "general" | "detail";

export type MobileHeaderProps = {
  pattern: MobileHeaderPattern;
  title?: string;
  backHref?: string;
  onBack?: () => void;
  /** general pattern right action */
  rightAction?: "search" | "filter" | "share" | "none";
  onRightAction?: () => void;
  /** detail pattern — action sheet items from page context */
  sheetItems?: ActionSheetItem[];
  sheetTitle?: string;
  className?: string;
};

export function MobileHeader({
  pattern,
  title,
  backHref,
  onBack,
  rightAction = "none",
  onRightAction,
  sheetItems = [],
  sheetTitle,
  className,
}: MobileHeaderProps) {
  const router = useRouter();
  const locale = useLocale();
  const isKo = locale === "ko";
  const { openSearch } = useMobileSearch();
  const { pointBalance } = useMobileSessionPoints();
  const [sheetOpen, setSheetOpen] = useState(false);

  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    if (backHref) {
      router.push(backHref);
      return;
    }
    router.back();
  };

  const handleRight = () => {
    if (onRightAction) {
      onRightAction();
      return;
    }
    if (rightAction === "search") {
      openSearch();
    }
  };

  const iconBtn =
    "inline-flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-150 active:scale-95 dark:text-white text-gray-900 dark:active:bg-white/10 active:bg-gray-100";

  if (pattern === "home") {
    return (
      <header
        className={cn(
          "sticky top-0 z-30 flex h-14 items-center justify-between border-b border-gray-200 bg-white/95 px-4 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/95 md:hidden",
          className,
        )}
      >
        <Link href="/" className="inline-flex items-baseline whitespace-nowrap">
          <span className="text-lg font-black tracking-tight text-gray-900 dark:text-white">
            THINK
          </span>
          <span className="tkad-home-accent-text text-lg font-black">AD</span>
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/my/notifications"
            className={iconBtn}
            aria-label="알림"
          >
            <Bell className="h-5 w-5" />
          </Link>
          <Link
            href="/points"
            className="inline-flex h-9 items-center gap-1 rounded-full bg-violet-500/10 px-2.5 text-xs font-bold text-violet-600 transition-transform duration-150 active:scale-95 dark:text-violet-300"
            aria-label="포인트"
          >
            <Sparkles className="h-3.5 w-3.5 shrink-0" />
            <span className="tabular-nums">
              {pointBalance.toLocaleString(isKo ? "ko-KR" : "en-US")}P
            </span>
          </Link>
        </div>
      </header>
    );
  }

  if (pattern === "detail") {
    return (
      <>
        <header
          className={cn(
            "sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-gray-200 bg-white/95 px-3 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md dark:border-white/10 dark:bg-gray-950/95 md:hidden",
            className,
          )}
        >
          <button type="button" onClick={handleBack} className={iconBtn} aria-label="뒤로">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 dark:text-white">
            {title}
          </h1>
          {sheetItems.length > 0 ? (
            <button
              type="button"
              className={cn(iconBtn, "w-auto gap-0.5 px-2 text-xs font-semibold")}
              aria-label={isKo ? "더보기" : "More"}
              aria-haspopup="menu"
              aria-expanded={sheetOpen}
              onClick={() => {
                hapticLight();
                setSheetOpen(true);
              }}
            >
              <span>{isKo ? "더보기" : "More"}</span>
              <MoreVertical className="h-5 w-5" aria-hidden />
            </button>
          ) : (
            <span className="w-9 shrink-0" aria-hidden />
          )}
        </header>
        <ActionSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          items={sheetItems}
          cancelLabel={isKo ? "취소" : "Cancel"}
          title={sheetTitle ?? title}
        />
      </>
    );
  }

  const RightIcon =
    rightAction === "search"
      ? Search
      : rightAction === "filter"
        ? Filter
        : rightAction === "share"
          ? Share2
          : null;

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-gray-200 bg-white/95 px-3 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/95 md:hidden",
        className,
      )}
    >
      <button type="button" onClick={handleBack} className={iconBtn} aria-label="뒤로">
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-gray-900 dark:text-white">
        {title}
      </h1>
      {RightIcon ? (
        <button type="button" onClick={handleRight} className={iconBtn} aria-label={rightAction}>
          <RightIcon className="h-5 w-5" />
        </button>
      ) : (
        <span className="w-9 shrink-0" aria-hidden />
      )}
    </header>
  );
}
