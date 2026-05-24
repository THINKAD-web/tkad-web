"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { CategoryGridItem } from "@/lib/category-grid-config";
import { getCategoryIcon } from "@/lib/category-icons";

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
            ? "grid grid-cols-4 gap-3 sm:grid-cols-8 sm:gap-4"
            : "grid grid-cols-4 gap-3 sm:gap-4",
        )}
      >
        {items.map((item) => {
          const label = isKo ? item.labelKo : item.labelEn;
          const matchKey = item.matchSlug ?? item.slug;
          const active = activeSlug != null && activeSlug === matchKey;
          const Icon = getCategoryIcon(item.iconName);

          return (
            <Link
              key={item.slug}
              href={item.href}
              className="group flex flex-col items-center gap-1 transition-transform duration-150 active:scale-95"
            >
              <div
                className={cn(
                  "flex h-16 w-16 items-center justify-center rounded-full transition-colors",
                  active
                    ? "bg-violet-100 text-violet-600 dark:bg-violet-500/20 dark:text-violet-300"
                    : "bg-gray-100 text-gray-700 group-hover:bg-gray-200 dark:bg-white/10 dark:text-white/80 dark:group-hover:bg-white/15",
                )}
              >
                <Icon className="h-7 w-7" strokeWidth={1.75} aria-hidden />
              </div>
              <span
                className={cn(
                  "max-w-[4.5rem] text-center text-xs leading-tight",
                  active
                    ? "font-semibold text-violet-600 dark:text-violet-300"
                    : "text-gray-600 dark:text-white/60",
                )}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
