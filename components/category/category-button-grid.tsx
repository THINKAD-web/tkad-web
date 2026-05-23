"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { CategoryGridItem } from "@/lib/category-grid-config";

type Props = {
  items: CategoryGridItem[];
  locale: string;
  activeSlug?: string | null;
  title?: string;
  /** mobile 4-col grid; desktop 8-col row */
  layout?: "grid" | "row";
  className?: string;
};

export function CategoryButtonGrid({
  items,
  locale,
  activeSlug,
  title,
  layout = "grid",
  className,
}: Props) {
  const isKo = locale.startsWith("ko");

  return (
    <div className={className}>
      {title ? (
        <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-white/80">
          {title}
        </h3>
      ) : null}
      <div
        className={cn(
          layout === "row"
            ? "grid grid-cols-4 gap-2 sm:grid-cols-8 sm:gap-3"
            : "grid grid-cols-4 gap-2 sm:gap-3",
        )}
      >
        {items.map((item) => {
          const label = isKo ? item.labelKo : item.labelEn;
          const matchKey = item.matchSlug ?? item.slug;
          const active = activeSlug != null && activeSlug === matchKey;

          return (
            <Link
              key={item.slug}
              href={item.href}
              className={cn(
                "group flex aspect-square flex-col items-center justify-center gap-1 rounded-2xl border bg-white p-2 text-center transition-all",
                "hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]",
                "dark:bg-white/5",
                active
                  ? "border-transparent bg-gradient-to-br from-violet-500/10 to-cyan-400/10 ring-2 ring-violet-500/60"
                  : "border-gray-200 dark:border-white/12",
                layout === "row" && "sm:aspect-auto sm:min-h-[5.5rem] sm:py-4",
              )}
            >
              <span
                className={cn(
                  "leading-none",
                  layout === "row" ? "text-3xl sm:text-4xl" : "text-2xl sm:text-3xl",
                )}
                aria-hidden
              >
                {item.icon}
              </span>
              <span className="text-[10px] font-bold leading-tight text-gray-900 dark:text-white sm:text-xs">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
