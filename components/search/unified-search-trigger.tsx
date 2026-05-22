"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { UnifiedSearchModal } from "@/components/search/unified-search-modal";

type Props = {
  className?: string;
  compact?: boolean;
};

export function UnifiedSearchTrigger({ className, compact }: Props) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);

  const onKey = useCallback((e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <>
      <button
        type="button"
        data-tour="search"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full min-w-0 items-stretch overflow-hidden rounded-xl border-2 border-border/40 bg-card/80 text-left shadow-sm backdrop-blur-sm transition-colors hover:border-accent/40 dark:border-white/12 border-gray-200 dark:bg-white/6 bg-gray-50 dark:hover:dark:border-white/20 border-gray-300",
          compact ? "h-9" : "h-10",
          className,
        )}
        aria-label={t("searchAriaUnified")}
      >
        <span className="flex min-w-0 flex-1 items-center gap-2 px-3">
          <Search
            className={cn(
              "shrink-0 text-muted-foreground dark:text-white text-gray-400",
              compact ? "h-3.5 w-3.5" : "h-4 w-4",
            )}
            aria-hidden
          />
          <span
            className={cn(
              "truncate font-mono text-[13px] text-muted-foreground dark:text-white",
            )}
          >
            {t("searchPlaceholderUnified")}
          </span>
        </span>
        <kbd className="hidden shrink-0 items-center gap-0.5 self-center border-l border-border/40 px-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-muted-foreground dark:border-white/12 border-gray-200 dark:text-white text-gray-400 sm:inline-flex">
          <span>⌘</span>
          <span>K</span>
        </kbd>
      </button>

      <UnifiedSearchModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
