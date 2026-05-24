"use client";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import type { HomeHubSection } from "@/lib/navigation/home-hub-grid-config";

type Props = {
  section: HomeHubSection;
  locale: string;
  className?: string;
};

export function HomeHubGridSection({ section, locale, className }: Props) {
  const isKo = locale.startsWith("ko");

  return (
    <section className={cn("space-y-3", className)}>
      <h2 className="text-base font-bold text-gray-900 dark:text-white">
        {isKo ? section.titleKo : section.titleEn}
      </h2>
      <div
        className={cn(
          "grid gap-3",
          section.columns === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
        {section.items.map((item) => {
          const Icon = item.icon;
          const label = isKo ? item.labelKo : item.labelEn;
          const desc = isKo ? item.descKo : item.descEn;

          return (
            <Link
              key={item.id}
              href={item.href}
              className={cn(
                "group flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-center transition-all active:scale-[0.98]",
                "border-gray-100 bg-white text-gray-900 shadow-sm hover:border-violet-200 hover:shadow-md",
                "dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10",
              )}
            >
              <Icon
                className="h-6 w-6 text-violet-600 dark:text-violet-400"
                strokeWidth={1.75}
                aria-hidden
              />
              <span className="text-sm font-medium leading-tight">{label}</span>
              {desc ? (
                <span className="text-xs text-gray-400 dark:text-white/45">
                  {desc}
                </span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
