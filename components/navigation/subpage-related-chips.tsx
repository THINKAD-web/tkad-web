"use client";

import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { useLocale } from "next-intl";
import { cn } from "@/lib/utils";
import {
  resolveSubpageChips,
  type SubpageChipDef,
} from "@/lib/navigation/subpage-chips-config";

function isHiddenPath(pathname: string | null): boolean {
  if (!pathname) return true;
  return (
    pathname.includes("/admin") ||
    pathname.includes("/login") ||
    pathname.includes("/register") ||
    pathname.includes("/signup") ||
    pathname.includes("/reset-password") ||
    pathname.includes("/forgot-password")
  );
}

function chipActive(
  chip: SubpageChipDef,
  pathname: string,
  search: URLSearchParams,
): boolean {
  if (chip.match) return chip.match(pathname, search);
  return pathname === chip.href || pathname.startsWith(`${chip.href}/`);
}

export function SubpageRelatedChips() {
  const pathname = usePathname() ?? "/";
  const searchParams = useSearchParams();
  const locale = useLocale();
  const isKo = locale === "ko";

  const group = useMemo(() => resolveSubpageChips(pathname), [pathname]);
  const search = useMemo(
    () => new URLSearchParams(searchParams.toString()),
    [searchParams],
  );

  if (isHiddenPath(pathname) || !group) return null;

  return (
    <div
      className="sticky top-14 z-20 border-b border-gray-100 bg-white/95 px-4 py-2 backdrop-blur-md dark:border-white/10 dark:bg-gray-950/95 md:top-0"
      data-screenshot="subpage-chips"
    >
      <div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {group.chips.map((chip) => {
          const active = chipActive(chip, pathname, search);
          const label = isKo ? chip.labelKo : chip.labelEn;
          return (
            <Link
              key={chip.id}
              href={chip.href}
              scroll={chip.href.includes("#") ? false : undefined}
              className={cn(
                "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300"
                  : "bg-gray-100 text-gray-700 dark:bg-white/10 dark:text-white/70",
              )}
              aria-current={active ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
